/*
 * ShapeCraft push server (Cloudflare Worker)
 * ------------------------------------------------------------------
 * - POST /subscribe    { subscription, time:"HH:MM", tzOffset, lang }  -> store in KV
 * - POST /unsubscribe  { endpoint }                                     -> delete
 * - GET  /health                                                        -> "ok"
 * - cron (every 5 min)  -> push to anyone whose local reminder time just
 *                          passed and who hasn't been notified yet today.
 *
 * Payload-less Web Push (only a VAPID-signed POST to the endpoint). The
 * service worker builds the localized notification text from IndexedDB and
 * suppresses it if today's daily challenge is already done — so we never need
 * to encrypt a payload here, and the server stays stateless about game text.
 */

// ── base64url helpers ──────────────────────────────────────────────
function b64urlToU8(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const raw = atob(s + pad);
  const a = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
  return a;
}
function u8ToB64url(u8) {
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const strToB64url = (str) => u8ToB64url(new TextEncoder().encode(str));

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── VAPID (ES256 JWT) ──────────────────────────────────────────────
async function importVapidKey(pubB64, privB64) {
  const pub = b64urlToU8(pubB64); // 65 bytes: 0x04 | x(32) | y(32)
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    x: u8ToB64url(pub.slice(1, 33)),
    y: u8ToB64url(pub.slice(33, 65)),
    d: u8ToB64url(b64urlToU8(privB64)),
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}
async function vapidHeaders(endpoint, pubB64, key, subject) {
  const aud = new URL(endpoint).origin;
  const header = strToB64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = strToB64url(JSON.stringify({ aud, exp, sub: subject }));
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(data));
  const jwt = `${data}.${u8ToB64url(new Uint8Array(sig))}`;
  return { Authorization: `vapid t=${jwt}, k=${pubB64}` };
}
async function sendPush(subscription, env, key) {
  const headers = await vapidHeaders(subscription.endpoint, env.VAPID_PUBLIC, key, env.VAPID_SUBJECT || 'mailto:admin@example.com');
  headers['TTL'] = '86400';
  headers['Urgency'] = 'normal';
  headers['Content-Length'] = '0';
  return fetch(subscription.endpoint, { method: 'POST', headers });
}

// ── HTTP helpers ───────────────────────────────────────────────────
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
}
function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', ...corsHeaders(env) },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env) });

    if (url.pathname === '/health') return new Response('ok', { headers: corsHeaders(env) });

    if (url.pathname === '/subscribe' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, env); }
      const sub = body && body.subscription;
      if (!sub || !sub.endpoint) return json({ error: 'no subscription' }, 400, env);
      const id = 'sub:' + (await sha256hex(sub.endpoint));
      const rec = {
        subscription: sub,
        time: typeof body.time === 'string' ? body.time : '18:00',
        tzOffset: Number.isFinite(body.tzOffset) ? body.tzOffset : 0,
        lang: body.lang === 'en' ? 'en' : 'ko',
        lastSent: '',
      };
      await env.SUBS.put(id, JSON.stringify(rec));
      return json({ ok: true }, 200, env);
    }

    if (url.pathname === '/unsubscribe' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, env); }
      if (!body || !body.endpoint) return json({ error: 'no endpoint' }, 400, env);
      await env.SUBS.delete('sub:' + (await sha256hex(body.endpoint)));
      return json({ ok: true }, 200, env);
    }

    return new Response('ShapeCraft push server', { headers: corsHeaders(env) });
  },

  async scheduled(event, env) {
    if (!env.VAPID_PRIVATE) return; // secret not set yet
    const key = await importVapidKey(env.VAPID_PUBLIC, env.VAPID_PRIVATE);
    const now = Date.now();
    let cursor;
    do {
      const page = await env.SUBS.list({ cursor });
      cursor = page.list_complete ? null : page.cursor;
      for (const k of page.keys) {
        const rec = await env.SUBS.get(k.name, { type: 'json' });
        if (!rec || !rec.subscription) continue;
        // user's local wall-clock = UTC minus getTimezoneOffset() minutes
        const local = new Date(now - (rec.tzOffset || 0) * 60000);
        const cur = local.getUTCHours() * 60 + local.getUTCMinutes();
        const [th, tm] = String(rec.time || '18:00').split(':').map(Number);
        const target = (th || 0) * 60 + (tm || 0);
        const localDate = `${local.getUTCFullYear()}-${local.getUTCMonth() + 1}-${local.getUTCDate()}`;
        // fire once when the cron tick lands in the 10-min window after the target
        if (cur >= target && cur < target + 10 && rec.lastSent !== localDate) {
          try {
            const res = await sendPush(rec.subscription, env, key);
            if (res.status === 404 || res.status === 410) {
              await env.SUBS.delete(k.name); // subscription expired
            } else {
              rec.lastSent = localDate;
              await env.SUBS.put(k.name, JSON.stringify(rec));
            }
          } catch (_) { /* transient — retry next tick */ }
        }
      }
    } while (cursor);
  },
};
