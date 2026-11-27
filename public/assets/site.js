// Hamburger menu (phones): toggle on tap; close on Escape, on a tap outside, on choosing a link, and when
// the window is widened again. Re-bound after every Astro navigation, because the nav is a new element then.
(function () {
  function bind() {
    var nav = document.querySelector('nav'), btn = nav && nav.querySelector('.menu-toggle');
    if (!nav || !btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    function set(open) { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); }
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    nav._close = function () { set(false); };
  }
  if (!window.__siteJsBound) {
    window.__siteJsBound = true;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var n = document.querySelector('nav'); if (n && n._close) n._close(); } });
    document.addEventListener('click', function (e) { var n = document.querySelector('nav'); if (n && n._close && !n.contains(e.target)) n._close(); });
    window.addEventListener('resize', function () { var n = document.querySelector('nav'); if (window.innerWidth > 560 && n && n._close) n._close(); });
    document.addEventListener('astro:page-load', bind);
  }
  bind();
})();


// ---- Sliding menu pills. One filled pill marks the current page and one soft pill follows the pointer / keyboard focus; both
// slide and resize from item to item. Across page changes the current pill starts where it was on the previous page
// (remembered in sessionStorage) and glides to the new item. Without JS the links keep their own highlight.
(function () {
  if (window.__navPillBound) return;
  window.__navPillBound = true;
  var STORE = 'nav-pill';
  function layout() { return window.innerWidth >= 1000 ? 'side' : window.innerWidth > 560 ? 'row' : 'sheet'; }
  function box(a) { return { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight }; }
  function put(el, r) { el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; el.style.transform = 'translate(' + r.x + 'px,' + r.y + 'px)'; }
  function same(a, b) { return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }
  function save(r) { try { sessionStorage.setItem(STORE, JSON.stringify({ k: layout(), r: r })); } catch (e) {} }
  function whenReady(fn) {              // plain pages fade in on load: start the glide once they are visible
    var root = document.documentElement;
    if (root.classList.contains('avatar-ready')) return fn();
    var mo = new MutationObserver(function () { if (root.classList.contains('avatar-ready')) { mo.disconnect(); setTimeout(fn, 250); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  function parts() {
    var nav = document.querySelector('nav[aria-label="Main"]'), wrap = nav && nav.querySelector('.menu-wrap');
    var cur = wrap && wrap.querySelector('a[aria-current="page"]');
    return cur ? { nav: nav, wrap: wrap, cur: cur, pill: wrap.querySelector('.nav-pill'), hov: wrap.querySelector('.nav-hover') } : null;
  }
  function make(wrap, cls) {
    var s = wrap.querySelector('.' + cls);
    if (!s) { s = document.createElement('span'); s.className = cls; s.setAttribute('aria-hidden', 'true'); wrap.insertBefore(s, wrap.firstChild); }
    return s;
  }
  function teardown(p) {               // phones: the menu is a dropdown sheet, no sliding pills there
    [].forEach.call(p.wrap.querySelectorAll('.nav-pill, .nav-hover'), function (e) { e.remove(); });
    p.nav.classList.remove('has-pill', 'gliding');
  }
  function setup() {
    var p = parts(); if (!p) return;
    if (layout() === 'sheet') { teardown(p); return; }
    var pill = make(p.wrap, 'nav-pill'), hov = make(p.wrap, 'nav-hover');   // hover pill ends up first, i.e. underneath
    p.nav.classList.add('has-pill');
    var to = box(p.cur), from = null;
    try { var s = JSON.parse(sessionStorage.getItem(STORE) || 'null'); if (s && s.k === layout()) from = s.r; } catch (e) {}
    pill.style.transition = 'none'; put(pill, from || to); void pill.offsetWidth;
    if (from && !same(from, to)) {
      p.nav.classList.add('gliding');                       // the new label keeps its normal colour until the pill is nearly there
      whenReady(function () { pill.style.transition = ''; put(pill, to); setTimeout(function () { p.nav.classList.remove('gliding'); put(pill, box(p.cur)); }, 170); });
    } else pill.style.transition = '';
    save(to);
    function show(a) {
      var r = box(a);
      if (!hov.classList.contains('on')) { hov.style.transition = 'none'; put(hov, r); void hov.offsetWidth; hov.style.transition = ''; }
      else put(hov, r);
      hov.classList.add('on');
    }
    function hide() { hov.classList.remove('on'); }
    [].forEach.call(p.wrap.querySelectorAll('a'), function (a) {
      a.addEventListener('mouseenter', function () { show(a); });
      a.addEventListener('focus', function () { show(a); });
    });
    p.wrap.addEventListener('mouseleave', hide);
    p.wrap.addEventListener('focusout', function (e) { if (!p.wrap.contains(e.relatedTarget)) hide(); });
  }
  function reposition() {               // after a resize or once the web font has changed the item sizes: snap, no glide
    var p = parts(); if (!p) return;
    if (layout() === 'sheet') { teardown(p); return; }
    if (!p.pill) { setup(); return; }                                       // widened from phone size: bring the pills back
    if (p.nav.classList.contains('gliding')) return;                        // a glide is pending: leave it alone
    var r = box(p.cur);
    p.pill.style.transition = 'none'; put(p.pill, r); void p.pill.offsetWidth; p.pill.style.transition = '';
    p.hov.classList.remove('on'); save(r);
  }
  window.addEventListener('resize', reposition);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposition);
  document.addEventListener('astro:after-swap', setup);   // Astro: the nav is a new element after every page change
  setup();
})();


// ---- Konami code: ↑ ↑ ↓ ↓ ← → ← → B A  =  "unlimited coffee". The avatar's coffee break takes over and speeds up for a while (see
// the cheat() method in avatar-live.js). On a keyboard: the arrow keys, then B and A. On a phone: swipe up, up, down, down, left,
// right, left, right, then tap, tap (on empty space). Each step has to follow the last within 5 s. Ignored while typing in a field.
// Bound once; works after Astro page changes too.
(function () {
  if (window.__konamiBound) return;
  window.__konamiBound = true;
  var CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0, lastAt = 0;
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('show'); }); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  }
  // The peak: a bright flash grows from the avatar's corner and the whole page drops to nothing, then fades back in slowly
  // (the scene has been reset underneath, so it comes back as it was). See .boom in site.css. Not with reduced motion.
  function explode() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var root = document.documentElement, flash = document.createElement('div');
    flash.className = 'boom-flash';
    root.appendChild(flash); root.classList.add('boom');
    setTimeout(function () { root.classList.remove('boom'); flash.remove(); }, 5400);
  }
  var busyUntil = 0;
  function fire() {
    if (Date.now() < busyUntil) return;
    if (window.live && window.live.cheat && window.live.cheat('coffee',
      explode,                                                              // the peak
      function () { toast('Caffeine level: critical.'); }                   // shortly before it
    )) {
      busyUntil = Date.now() + 13000;
      toast('Cheat activated: unlimited coffee');
    }
  }
  function feed(k) {
    var now = Date.now();
    if (now - lastAt > 5000) pos = 0;
    lastAt = now;
    if (k === CODE[pos]) { if (++pos === CODE.length) { pos = 0; fire(); } }
    else pos = (k === CODE[0]) ? 1 : 0;
  }
  document.addEventListener('keydown', function (e) {
    var el = e.target, tag = (el && el.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (el && el.isContentEditable)) return;
    feed(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  // touch: a swipe is a move of 40 px or more (the dominant axis gives the direction); a tap is a short touch that barely moves.
  var sx = 0, sy = 0, st = 0, one = false;
  document.addEventListener('touchstart', function (e) {
    one = e.touches.length === 1;
    if (one) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!one || !e.changedTouches.length) return;
    one = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) >= 40) feed(ax > ay ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
    else if (Math.max(ax, ay) < 12 && Date.now() - st < 350) feed(pos === 8 ? 'b' : 'a');   // two taps: B, then A
  }, { passive: true });
})();


// ---- A page that fits in the window must not scroll: html.fits = the content fits AND nothing in it touches the avatar's box, so the CSS
// drops the space reserved under the content (that reserve only keeps the last lines clear of the avatar and the bottom fade when you scroll).
// Under 1000 px the copyright sits at the bottom-left, so 2rem stay. Re-checked on load, resize, font load, after Astro page changes and
// every 1.5 s (the avatar's scene, and so its box, changes during the day).
(function () {
  if (window.__fitBound) return;
  window.__fitBound = true;
  // The avatar's real box: the bounding box of the non-transparent pixels of its canvas (the canvas itself has empty margins).
  function spriteBox(cv) {
    var r = cv.getBoundingClientRect();
    try {
      var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) return { left: 0, right: 0, top: 0, bottom: 0 };
      var sx = r.width / cv.width, sy = r.height / cv.height;
      return { left: r.left + x0 * sx, right: r.left + (x1 + 1) * sx, top: r.top + y0 * sy, bottom: r.top + (y1 + 1) * sy };
    } catch (e) { return r; }
  }
  function fit() {
    var root = document.documentElement, m = document.querySelector('main'), ok = false;
    if (m) {
      var extra = window.innerWidth < 1000 ? 32 : 0;
      var roams = root.dataset.avatarRoams === '1';
      // a walker / cyclist crosses the whole width along the bottom: the page fits if the content ends above his lane (the scene's height + a gap)
      var lane = 0;
      if (roams) {                                          // his real height (the non-transparent pixels), from the floor up, plus a gap
        var wc = document.querySelector('[data-avatar-scene] > canvas') || document.querySelector('canvas[data-avatar-scene]');   // the walker wraps its canvas in the marked element
        var sb = wc ? spriteBox(wc) : null;
        if (sb && sb.bottom > sb.top) fit.lane = window.innerHeight - sb.top + 16;      // remembered while he is out of sight (an empty canvas)
        lane = fit.lane || (parseFloat(getComputedStyle(root).getPropertyValue('--avatar-scene-h')) || 0) + 24;
      }
      ok = m.offsetHeight + extra + lane <= window.innerHeight;
      var cv = ok && !roams && [].filter.call(document.querySelectorAll('#avatar-layer canvas, body > canvas'), function (c) { return c.style.zIndex === '200'; })[0];
      if (cv) {
        var a = spriteBox(cv), pad = 8, els = m.querySelectorAll('p, h1, h2, h3, li, a, img, small');
        for (var i = 0; i < els.length && ok; i++) {
          var r = els[i].getBoundingClientRect();
          if (r.width && r.height && r.right > a.left - pad && r.left < a.right + pad && r.bottom > a.top - pad && r.top < a.bottom + pad) ok = false;
        }
      }
    }
    root.classList.toggle('fits', ok);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  document.addEventListener('astro:after-swap', fit);
  document.addEventListener('astro:page-load', fit);
  setInterval(fit, 1500);
  fit();
})();
