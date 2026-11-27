/*
 * avatar-outvenue.js — a pixel-art scene: he is out somewhere in the city, having fun, and you never see him. His bike is chained to a lamp
 * post outside a bar. By night the neon sign flickers, the window pulses with coloured light to the music, the door is ajar with warm light and music
 * notes spilling out; by day the sign is unlit, the window reflects the sky and a chalkboard stands by the door. "The bike is here, so he is inside."
 *
 * Usage:   <script src="assets/avatar-outvenue.js"></script>   <script>AvatarOutVenue.start();</script>
 * Options: container, scale (5), edge (24), position ('right' | 'left'), floor (true | 'external'), floorRows (4), zIndex (50), dark.
 * Returns { root, setDark, stop }.
 */
(function (global) {
  'use strict';

  var W = 46, H = 34;
  var BEAT = 0.508;                                   // about 118 beats a minute: the music
  var NEON = ['#FF3C9B', '#3CD7FF', '#FFD23C'];
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // a music note drifting up and fading; (x0,y0) -> (x1,y1) over `life` seconds
  function note(ctx, t, i, x0, y0, x1, y1, life, col) {
    var a = ((t + i * life / 3) % life) / life;
    var x = Math.round(x0 + (x1 - x0) * a + Math.sin(a * 9 + i) * 1.4), y = Math.round(y0 + (y1 - y0) * a);
    ctx.globalAlpha = a < 0.15 ? a / 0.15 : (1 - a) / 0.85;
    ctx.fillStyle = col;
    ctx.fillRect(x, y + 3, 2, 2); ctx.fillRect(x + 1, y, 1, 4); ctx.fillRect(x + 2, y, 1, 2);
    ctx.globalAlpha = 1;
  }

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    function line(x0, y0, x1, y1, col) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col);
    }
    var t = st.t, beat = Math.floor(t / BEAT), ph = (t % BEAT) / BEAT, pulse = Math.max(0, 1 - ph * 2.2), neon = NEON[beat % 3];
    var night = st.dark;                                                      // night: neon, lamp, bulbs; day: all of that is off
    var signOn = night && hash(Math.floor(t * 2)) < 0.93;                     // the sign flickers off now and then

    // ---- the lamp post's light, under the bike (at night) ----
    ctx.fillStyle = '#FFE9A6';
    for (var ly = night ? 11 : 32; ly <= 31; ly++) { var half = 1 + Math.floor((ly - 10) * 0.5); ctx.globalAlpha = 0.07 * (1 - (ly - 11) / 26); ctx.fillRect(17 - half, ly, half * 2 + 1, 1); }
    ctx.globalAlpha = 1;

    // ---- the bar's front ----
    box(21, 5, 25, 27, '#4A3535');
    for (var by = 8; by < 32; by += 3) {                                      // bricks
      box(21, by, 25, 1, '#3A2A2A');
      for (var bx = 21 + ((by / 3) % 2) * 3; bx < 46; bx += 6) box(bx, by + 1, 1, 2, '#3A2A2A');
    }
    box(21, 5, 25, 3, '#2E2222');                                             // parapet
    // neon sign
    ctx.globalAlpha = signOn ? 0.14 + 0.1 * pulse : 0; ctx.fillStyle = '#FF4FA3'; ctx.fillRect(27, 7, 18, 10); ctx.globalAlpha = 1;
    box(29, 9, 14, 7, '#201018');
    var pink = signOn ? '#FF4FA3' : (night ? '#4A2A3A' : '#B86A92'), cyan = signOn ? '#3CD7FF' : (night ? '#2A4A55' : '#5E93AA');
    box(29, 9, 14, 1, pink); box(29, 15, 14, 1, pink); box(29, 9, 1, 7, pink); box(42, 9, 1, 7, pink);
    box(33, 11, 6, 1, cyan); box(34, 12, 4, 1, cyan); box(35, 13, 2, 1, cyan); px(35, 14, cyan); px(36, 14, cyan);   // a cocktail glass
    px(31, 11, pink); px(30, 12, pink); px(31, 12, pink); px(32, 12, pink); px(31, 13, pink);                       // a star
    px(40, 11, pink); px(39, 12, pink); px(40, 12, pink); px(41, 12, pink); px(40, 13, pink);
    // awning and the bulbs along its edge
    for (var ax = 29; ax < 44; ax++) { box(ax, 17, 1, 2, ((ax - 29) >> 1) % 2 ? '#F2E6D0' : '#C93A3A'); }
    for (var bi = 0; bi < 8; bi++) px(29 + bi * 2, 19, night ? NEON[(bi + beat) % 3] : '#8A8A92');
    // the window: coloured light, a glint of disco ball
    box(22, 21, 8, 8, '#1E1A1A');
    if (night) {
      box(23, 22, 6, 6, neon);
      for (var g = 0; g < 3; g++) px(23 + Math.floor((t * 4 + g * 2) % 6), 22 + Math.floor((t * 3 + g * 3) % 6), '#FFFFFF');
    } else {                                                                // by day the glass just reflects the sky
      box(23, 22, 6, 4, '#A9CCEA'); box(23, 26, 6, 2, '#7FAAD0'); px(24, 23, '#FFFFFF'); px(25, 24, '#FFFFFF'); px(27, 22, '#FFFFFF'); px(28, 23, '#FFFFFF');
    }
    // the door, ajar, warm light inside
    box(33, 20, 9, 12, '#1E1A1A'); box(34, 21, 7, 11, night ? '#FFC66B' : '#C9955A'); box(34, 21, 7, 3, night ? '#E9A24A' : '#8E6B43'); box(39, 21, 2, 11, '#2A2222');
    if (night) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#FFC66B'; ctx.fillRect(27, 30, 7, 2); ctx.globalAlpha = 1; }   // light on the ground
    // a chalkboard sign by the door
    box(30, 26, 3, 6, '#2B2F33'); box(30, 26, 3, 1, '#5A4A32'); px(31, 28, '#E8E6DA'); px(30, 29, '#E8E6DA'); px(32, 29, '#E8E6DA'); px(31, 30, '#E8E6DA'); px(30, 32, '#5A4A32'); px(32, 32, '#5A4A32');

    // ---- the lamp post ----
    box(17, 10, 1, 22, '#3C4048'); box(15, 9, 5, 1, '#3C4048'); box(14, 8, 7, 2, '#3C4048'); box(15, 10, 5, 1, night ? '#FFE9A6' : '#8A8F99');

    // ---- his bike, chained to the post ----
    var frame = night ? '#E04F4F' : '#D64545', tire = night ? '#8A9099' : '#272828', dk = night ? '#B9BEC6' : '#3A3A40';   // light tyres at night, dark by day, so the bike always shows
    function wheel(cx, cy) {
      for (var a = 0; a < 6.28; a += 0.3) px(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, tire);
      var hub = night ? '#C9CED6' : '#B9BEC6', sp = night ? '#5A5F68' : '#9AA0A8'; px(cx, cy, hub); px(cx - 2, cy, sp); px(cx + 2, cy, sp); px(cx, cy - 2, sp); px(cx, cy + 2, sp);
    }
    wheel(4, 27); wheel(13, 27);
    line(13, 27, 9, 27, frame); line(9, 27, 11, 20, frame); line(11, 20, 5, 20, frame); line(9, 27, 5, 21, frame); line(5, 20, 4, 27, frame);
    box(10, 19, 4, 1, dk); px(11, 20, dk);                                   // saddle
    box(3, 19, 3, 1, dk); px(3, 20, dk);                        // handlebar
    px(9, 25, '#B9BEC6'); px(9, 29, '#B9BEC6');                               // pedals
    box(15, 24, 3, 4, '#E8C547'); ctx.clearRect(16, 25, 1, 2);                // the lock round the wheel and the post

    // ---- music spilling out of the door ----
    for (var i = 0; i < (night ? 3 : 2); i++) note(ctx, t, i, 36, 15, 44, 1, 3.6, night ? NEON[(i + beat) % 3] : '#5A4A8A');   // by day: fewer, calmer notes
  }

  function start(opts) {
    opts = opts || {};
    var scale = opts.scale || 5;
    var edge = opts.edge == null ? 24 : opts.edge;
    var left = opts.position === 'left';
    var floorOn = opts.floor !== false;
    var floorRows = opts.floorRows || 4;
    var floorH = floorOn ? floorRows * scale : 0;
    var host = opts.container || document.body;
    var fixed = host === document.body || host === document.documentElement;
    var z = opts.zIndex || 50;
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pos = fixed ? 'fixed' : 'absolute';
    if (!fixed && getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.setAttribute('aria-hidden', 'true');
    cv.dataset.avatarScene = '1';
    cv.style.cssText = 'position:' + pos + ';bottom:' + (floorH - 4 * scale) + 'px;' +
      (left ? 'left:' : 'right:') + edge + 'px;width:' + W * scale + 'px;height:' + H * scale + 'px;' +
      'image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;user-select:none;z-index:' + z +
      (left ? ';transform:scaleX(-1)' : '');
    (opts.mount || host).appendChild(cv);
    var ctx = cv.getContext('2d');

    var floorEl = null;
    if (floorOn && opts.floor !== 'external') {
      var TW = 16, t = document.createElement('canvas');
      t.width = TW; t.height = floorRows;
      var tc = t.getContext('2d');
      for (var r = 0; r < floorRows; r++) {
        tc.fillStyle = r === 0 ? '#B79F7E' : (r % 2 ? '#D8C7A8' : '#CDBB9A');
        tc.fillRect(0, r, TW, 1);
        if (r > 0) { tc.fillStyle = '#B79F7E'; tc.fillRect((r * 7) % TW, r, 1, 1); }
      }
      floorEl = document.createElement('div');
      floorEl.setAttribute('aria-hidden', 'true');
      floorEl.style.cssText = 'position:' + pos + ';left:0;right:0;bottom:0;pointer-events:none;' +
        'image-rendering:pixelated;z-index:' + (z - 1) + ';height:' + floorH + 'px;background:url(' +
        t.toDataURL() + ') 0 0/' + TW * scale + 'px ' + floorRows * scale + 'px repeat-x';
      (opts.mount || host).appendChild(floorEl);
    }

    var st = { dark: !!opts.dark, t: 0 };
    var raf, t0 = performance.now();
    function tick(now) {
      st.t = (now - t0) / 1000;
      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { st.t = 2.4; draw(ctx, st); }          // a single still frame
    else raf = requestAnimationFrame(tick);

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarOutVenue = { start: start, _draw: draw, _size: [W, H] };
})(window);
