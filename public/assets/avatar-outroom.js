/*
 * avatar-outroom.js — a pixel-art scene: he is not home. It is the gaming scene with nobody in it: the same TV on its low cabinet and the same
 * sofa, but the TV is off (a faint reflection on the dark screen, a red standby light) and the sofa is empty, with a controller left on the
 * cushion. The window is the page's own, like in every indoor scene. He is never shown: only what he left behind.
 *
 * Usage:   <script src="assets/avatar-outroom.js"></script>   <script>AvatarOutRoom.start();</script>
 * Options: container, scale (5), edge (24), position ('right' | 'left'), floor (true | 'external'), floorRows (4), zIndex (50), dark.
 * Returns { root, setDark, stop }.
 */
(function (global) {
  'use strict';

  var W = 40, H = 34;                                  // the same size as the gaming scene
  var C = {                                            // the same palette as the gaming scene
    wood: '#8E6B43', woodTop: '#A47C52', woodDark: '#6E5233', bezel: '#2B2B30',
    sofa: '#4F7F8C', sofaDark: '#3E6773', sofaLight: '#6597A5', sofaLeg: '#2B2F36', pad: '#2B2B30'
  };

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }

    // ---- TV on a low cabinet (as in the gaming scene), switched off ----
    box(1, 25, 20, 7, C.wood); box(1, 25, 20, 1, C.woodTop);
    box(2, 27, 8, 4, C.woodDark); box(12, 27, 8, 4, C.woodDark);
    px(9, 29, C.woodTop); px(12, 29, C.woodTop);
    box(1, 9, 20, 14, C.bezel);                              // big TV
    box(10, 23, 2, 2, C.bezel);
    box(2, 10, 18, 11, '#0E1119');                           // the dark screen
    for (var i = 0; i < 6; i++) { px(4 + i, 11 + i, '#1A2030'); px(5 + i, 11 + i, '#151B28'); }   // a faint reflection across the glass
    for (var j = 0; j < 4; j++) px(12 + j, 11 + j, '#151B28');
    px(18, 22, Math.floor(st.t / 1.5) % 2 ? '#D64545' : '#5A2323');                               // standby light

    // ---- the sofa (as in the gaming scene), empty ----
    box(35, 12, 4, 16, C.sofaDark);                 // back
    box(35, 12, 1, 16, C.sofa);
    box(24, 27, 15, 2, C.sofa);                     // seat cushion
    box(24, 27, 15, 1, C.sofaLight);
    box(24, 29, 15, 2, C.sofaDark);                 // base
    box(25, 31, 2, 1, C.sofaLeg); box(37, 31, 2, 1, C.sofaLeg);

    // ---- a controller left on the cushion ----
    box(27, 25, 6, 2, C.pad); px(28, 25, '#E23B3B'); px(29, 26, '#5BE37D'); px(31, 25, '#6B7280');
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

  global.AvatarOutRoom = { start: start, _draw: draw, _size: [W, H] };
})(window);
