# ShapeCraft Push Server (Cloudflare Worker)

Sends the **daily-reminder web push** even when the game/PWA is fully closed —
the part a static GitHub Pages site can't do on its own.

```
client (game)  ──/subscribe──▶  Worker ──stores──▶  KV
                                  │
                cron every 5 min ─┘  → for each device whose local reminder
                                       time just passed (and not yet today),
                                       send a VAPID-signed Web Push
                                  │
device push service ◀─────────────┘  → SW `push` event → showNotification
```

The push carries **no payload**; the service worker builds the localized text
from IndexedDB and skips it if today's daily challenge is already done.

## Deploy

Requires a (free) Cloudflare account + [`wrangler`](https://developers.cloudflare.com/workers/wrangler/).

```bash
cd push-server
npm install

# 1) Create the KV namespace and paste the printed id into wrangler.toml
wrangler kv namespace create SUBS

# 2) Set the private VAPID key as a secret (NOT committed).
#    Paste the private key when prompted — it is delivered to you out-of-band
#    (in chat), never stored in this repo.
wrangler secret put VAPID_PRIVATE

# 3) Deploy
wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g. `https://shapecraft-push.<you>.workers.dev`.

## Connect the game

In `../index.html` set `PUSH_CONFIG.serverUrl` to that URL:

```js
const PUSH_CONFIG = {
  serverUrl: 'https://shapecraft-push.<you>.workers.dev',
  vapidPublic: 'BNyGs4ya7DHTO6xZtWA7P-UY9U58F2Wn30oYkxV8EZC-bLHzGA3TMxsrW-8rPEZZbs3DyXGAQ47xiev07bUEIhc',
};
```

Leave `serverUrl` empty to disable server push entirely — the in-page local
reminder (fires while the app is open / on reopen) keeps working as a fallback.

## Keys

- **Public** key is committed (in `wrangler.toml` and the game client) — that's fine.
- **Private** key is a secret. Never commit it. Rotate by generating a new pair
  (`npx web-push generate-vapid-keys`) and updating both the secret and the
  public key in the client + `wrangler.toml`.

## Endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/subscribe` | `{subscription, time:"HH:MM", tzOffset, lang}` | upsert a device |
| POST | `/unsubscribe` | `{endpoint}` | remove a device |
| GET | `/health` | — | liveness check |

`tzOffset` is the browser's `new Date().getTimezoneOffset()` (minutes), so the
Worker can compute each user's local time without storing a timezone name.

## Notes

- Cron runs every 5 min; each device is pushed at most once per local day
  (`lastSent` guard). Expired subscriptions (HTTP 404/410) are auto-deleted.
- KV `list()` is fine for modest user counts. For large scale, shard by
  reminder-time bucket or move to Durable Objects / D1.
