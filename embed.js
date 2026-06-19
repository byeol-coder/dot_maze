/* ============================================================
   ShapeCraft by Dot — TW(Tactile World) / Dot Games 임베드 통합 레이어
   - URL 파라미터: ?embed ?preview ?controls=compact ?theme ?lang ?autostart
   - html 클래스 토글(CSS가 표시/레이아웃 처리): is-embed / no-preview / controls-compact / data-theme
   - postMessage 브리지: 신규 SHAPECRAFT_* + 레거시 shapecraft:*(부모 호환) 동시 발신, 오리진 검증('*' 미사용)
   - window.ShapeCraftEmbed 공개 API (init guard + destroy)
   게임 로직(index.html 인라인 스크립트)은 건드리지 않고 window.app 훅만 사용.
   인라인 게임 스크립트보다 "먼저" 로드(권장: <head>).
   ============================================================ */
(function () {
  if (window.ShapeCraftEmbed && window.ShapeCraftEmbed.__ready) return; // 중복 초기화 방지

  var Q = new URLSearchParams(location.search);
  var inIframe = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  var embed   = Q.get('embed') === '1' || (inIframe && Q.get('embed') !== '0'); // iframe이면 자동 임베드
  var preview = Q.get('preview') !== '0';
  var compact = Q.get('controls') === 'compact';
  var autostart = Q.get('autostart') === '1';
  var theme   = (Q.get('theme') === 'dark' || Q.get('theme') === 'light') ? Q.get('theme') : null;
  var lang    = Q.get('lang') || null;

  window.TW = { embed: embed, preview: preview, compact: compact, autostart: autostart, theme: theme, lang: lang };

  /* ---- 오리진 정책 ----
     운영 시 ALLOWED_ORIGINS에 TW 오리진을 고정. 비어 있으면 개발용 개방(DEV_OPEN).
     나를 임베드한 부모(referrer)의 오리진은 항상 신뢰 → GitHub Pages·TW·로컬 하니스 모두 동작. */
  var ALLOWED_ORIGINS = ['https://tib-preview.vercel.app']; // ← 운영 TW 오리진으로 갱신
  var DEV_OPEN = ALLOWED_ORIGINS.length === 0;
  var PARENT_ORIGIN = (function () { try { return document.referrer ? new URL(document.referrer).origin : ''; } catch (e) { return ''; } })();
  var OUT_TARGET = PARENT_ORIGIN || '*';
  function originTrusted(o) { return DEV_OPEN || o === PARENT_ORIGIN || ALLOWED_ORIGINS.indexOf(o) !== -1; }

  var de = document.documentElement;
  de.classList.toggle('is-embed', embed);
  de.classList.toggle('no-preview', !preview);
  de.classList.toggle('controls-compact', compact);
  if (theme) de.setAttribute('data-theme', theme);
  if (lang) { try { de.lang = lang; } catch (e) {} }

  /* ---- postMessage 발신: 신규 SHAPECRAFT_* + 레거시 shapecraft:* ---- */
  function emit(type, payload) {
    if (window.parent === window) return; // 단독 실행이면 발신 안 함
    try { window.parent.postMessage(Object.assign({ type: type }, payload || {}), OUT_TARGET); } catch (e) {}
    var legacy = { SHAPECRAFT_READY: 'shapecraft:ready', SHAPECRAFT_EXIT: 'shapecraft:exit',
                   SHAPECRAFT_COMPLETE: 'shapecraft:complete' }[type];
    if (legacy) { try { window.parent.postMessage({ source: 'shapecraft', type: legacy, payload: payload || {} }, OUT_TARGET); } catch (e) {} }
  }
  // 부모/게임에서 참조할 브리지
  window.ShapeCraftBridge = {
    post:  function (t, p) { emit(t, p); },
    ready: function () { emit('SHAPECRAFT_READY', { game: 'shapecraft', version: '1.0.0' }); },
    resize:function (w, h) { emit('SHAPECRAFT_RESIZE', { width: w, height: h }); },
    exit:  function (reason) { emit('SHAPECRAFT_EXIT', { reason: reason || 'user' }); },
  };

  /* ---- 헬퍼: 게임(window.app) 안전 접근 ---- */
  function app() { return window.app || null; }
  function hubVisible() { var h = document.getElementById('hub'); return h && !h.classList.contains('hidden'); }
  function starsNow() { var el = document.getElementById('stat-stars'); var n = el ? parseInt(el.textContent, 10) : NaN; return isNaN(n) ? null : n; }
  function applyLang(target) {
    var lc = document.getElementById('lang-code'); var btn = document.getElementById('btn-lang');
    if (!lc || !btn) return;
    var cur = (lc.textContent || '').trim().toLowerCase() === 'en' ? 'en' : 'ko';
    if (cur !== target) btn.click();
  }

  /* ---- 부모 → 자식 수신 ---- */
  function onMessage(e) {
    if (!originTrusted(e.origin)) return;
    var d = e.data || {}; var t = d.type;
    if (t === 'SHAPECRAFT_START')   API.start();
    else if (t === 'SHAPECRAFT_PAUSE')  API.pause();
    else if (t === 'SHAPECRAFT_RESUME') API.resume();
    else if (t === 'SHAPECRAFT_FOCUS')  API.focus();
    else if (t === 'SHAPECRAFT_SET_PREVIEW') API.setPreviewVisible(d.visible !== false);
    else if (t === 'SHAPECRAFT_SET_COMPACT') API.setCompactMode(!!d.enabled);
    else if (t === 'SHAPECRAFT_MUTE')   API.setMuted(!!d.muted);
    else if (t === 'SHAPECRAFT_SET_LANG' && d.lang) applyLang(d.lang);
    // 레거시 tw:* 호환
    else if (d.source === 'tw') {
      if (d.type === 'tw:pause') API.pause();
      else if (d.type === 'tw:resume') API.resume();
      else if ((d.type === 'tw:setLang' || d.type === 'lang') && d.lang) applyLang(d.lang);
    }
  }

  /* ---- 공개 API ---- */
  var started = false;
  var API = {
    __ready: true,
    isEmbed: embed,
    start: function () {
      var b = document.getElementById('btn-start');
      if (hubVisible() && b) b.click(); else this.focus();
      if (!started) { started = true; emit('SHAPECRAFT_STARTED', {}); }
    },
    pause:  function () { var a = app(); if (a && a.input) a.input.setActive(false); emit('SHAPECRAFT_PAUSED', {}); },
    resume: function () { var a = app(); if (a && a.input) a.input.setActive(true); this.focus(); emit('SHAPECRAFT_RESUMED', {}); },
    focus:  function () {
      var el = document.getElementById('canvas-wrap');
      if (!el || el.offsetParent === null) el = document.getElementById('btn-start') || document.getElementById('hub');
      if (el) { try { el.setAttribute('tabindex', el.getAttribute('tabindex') || '-1'); el.focus({ preventScroll: true }); } catch (e) {} }
    },
    setMuted: function (m) { var a = app(); if (!a || !a.audio) return;
      if (m) { try { a.audio.setVolume(0); } catch (e) {} }
      else { try { a._applySettings(); } catch (e) {} }
      window.TW.muted = !!m;
    },
    setPreviewVisible: function (v) { window.TW.preview = !!v; de.classList.toggle('no-preview', !v); window.dispatchEvent(new Event('resize')); },
    setCompactMode: function (en) { window.TW.compact = !!en; de.classList.toggle('controls-compact', !!en); window.dispatchEvent(new Event('resize')); },
    getState: function () {
      var a = app();
      return { isEmbed: embed, preview: window.TW.preview, compact: window.TW.compact, theme: theme,
        lang: (de.lang || (document.getElementById('lang-code') ? document.getElementById('lang-code').textContent.toLowerCase() : 'ko')),
        screen: hubVisible() ? 'hub' : 'game',
        stars: starsNow() };
    },
    destroy: function () {
      try { window.removeEventListener('message', onMessage); } catch (e) {}
      try { window.removeEventListener('resize', onResize); } catch (e) {}
      try { if (ro) ro.disconnect(); } catch (e) {}
      try { if (pollId) clearInterval(pollId); } catch (e) {}
      this.__ready = false;
    },
  };
  window.ShapeCraftEmbed = API;

  /* ---- 리사이즈 → 게임 renderer.fit() 재사용(게임은 window 'resize'를 구독) + 부모 통지 ---- */
  var rt;
  function onResize() { clearTimeout(rt); rt = setTimeout(function () { window.ShapeCraftBridge.resize(window.innerWidth, window.innerHeight); }, 150); }

  /* ---- 텔레메트리: 진행도/완료 (변화 시에만) ---- */
  var ro = null, pollId = null, lastKey = '';
  function tick() {
    var a = app(); if (!a) return;
    var stars = starsNow() || 0;
    var score = (a.engine && typeof a.engine.score === 'number') ? a.engine.score : 0;
    var screen = hubVisible() ? 'hub' : 'game';
    var key = screen + ':' + stars + ':' + score;
    if (key === lastKey) return;
    lastKey = key;
    emit('SHAPECRAFT_PROGRESS', { screen: screen, stars: stars, score: score });
  }

  function wrapComplete() {
    var a = app(); if (!a || a.__embedWrapped || typeof a._afterComplete !== 'function') return;
    a.__embedWrapped = true;
    var orig = a._afterComplete.bind(a);
    a._afterComplete = function (info) {
      var r = orig(info);
      try {
        emit('SHAPECRAFT_COMPLETE', {
          world: info && info.world ? ((info.world.title && (info.world.title.en || info.world.title.ko)) || '') : '',
          endless: !!(info && info.endless), depth: info && info.depth || null,
          stars: starsNow(),
        });
      } catch (e) {}
      return r;
    };
  }

  function onReady() {
    try {
      emit('SHAPECRAFT_LOADED', {});
      window.addEventListener('message', onMessage);
      window.addEventListener('resize', onResize);

      var stage = document.getElementById('canvas-wrap') || document.getElementById('hub');
      if (stage && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(function () { window.dispatchEvent(new Event('resize')); });
        ro.observe(stage);
      }

      // window.app 준비되면 READY + 훅 연결, 이후 저속 폴링으로 진행도 발신
      var wait = setInterval(function () {
        if (app()) {
          clearInterval(wait);
          wrapComplete();
          if (lang) applyLang(lang);
          if (autostart) setTimeout(function () { API.start(); }, 80);
          emit('SHAPECRAFT_READY', { game: 'shapecraft', version: '1.0.0' });
          pollId = setInterval(tick, 600);
        }
      }, 100);
    } catch (err) {
      emit('SHAPECRAFT_ERROR', { message: String(err && err.message || err), code: 'INIT' });
    }
  }
  window.addEventListener('error', function (e) { emit('SHAPECRAFT_ERROR', { message: String(e.message || 'error'), code: 'RUNTIME' }); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
