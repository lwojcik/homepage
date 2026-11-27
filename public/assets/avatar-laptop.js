/*
 * avatar-laptop.js — a pixel-art scene: the avatar on the sofa after work, a
 * laptop on his lap, a mug and a plate of cookies on the coffee table.
 * Relaxed, not work: he browses, types a little, laughs at something, and the
 * screen light changes colour as the content changes.
 *
 *   - Short bursts of typing, then idle scrolling and long pauses.
 *   - Every so often he laughs at what he is watching.
 *   - Steam rises from the mug.
 *
 * Usage:
 *   <script src="assets/avatar-laptop.js"></script>
 *   <script>AvatarLaptop.start();</script>
 *
 * Options (all optional):
 *   container  element to sit in (default: the viewport, fixed position)
 *   position   'right' (default) or 'left'; 'left' mirrors the scene
 *   edge       gap to the side of the window in px (default 24)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   floor      draw the plank floor (default true); 'external' = the page
 *              draws it, only the geometry is used
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 */
(function (global) {
  'use strict';

  var W = 40, H = 34;
  var C = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', e: '#839392',
    p: '#E88989', k: '#000000', r: '#272828', g: '#636363', b: '#2F9FFF',
    wood: '#8E6B43', woodTop: '#A47C52',
    sofa: '#4F7F8C', sofaDark: '#3E6773', sofaLight: '#6597A5', sofaLeg: '#2B2F36',
    lidBack: '#7C828C', lidEdge: '#5E636C', deck: '#8C929B', deckDark: '#666B74', keyLight: '#B9BEC6',
    mug: '#E0674F', mugRim: '#B84A35', plate: '#9FC5E8', cookie: '#B5793E'
  };
  var HEAD = [
    '...ahahah....',
    '..hahhahhah..',
    '.hahhhahahah.',
    '.asssssshhhha',
    'hsssssssshah.',
    'asesssseshhh.',
    'asssdsssshhh.',
    '.ppsssspphss.',
    '..sddddsshds.',
    '...ssssss....',
    '....sssdd....',
    '.....sdd.....'
  ];
  var HEAD_X = 26, HEAD_Y = 3;
  var SHOULDER = { x: 33, y: 16 };
  // Screen light: changes with what he is looking at.
  var GLOWS = [[120, 180, 255], [200, 150, 255], [150, 230, 170], [255, 245, 220], [255, 170, 150]];

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    function thick(x0, y0, x1, y1, col) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i <= n; i++) box(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 2, 2, col);
    }
    var glow = GLOWS[st.glowIdx % GLOWS.length];
    var rgba = function (a) { return 'rgba(' + glow[0] + ',' + glow[1] + ',' + glow[2] + ',' + a.toFixed(3) + ')'; };

    // ---- coffee table with a mug and cookies ----
    box(2, 27, 17, 2, C.wood); box(2, 27, 17, 1, C.woodTop);
    box(4, 29, 2, 3, C.wood); box(15, 29, 2, 3, C.wood);
    box(5, 23, 4, 4, C.mug); box(5, 23, 4, 1, C.mugRim); px(9, 24, C.mug); px(9, 25, C.mug);   // mug
    box(11, 26, 5, 1, C.plate);                                                             // plate
    px(12, 25, C.cookie); px(13, 25, C.cookie); px(14, 25, C.cookie); px(13, 24, C.cookie);
    ctx.fillStyle = st.dark ? 'rgba(225,230,240,0.6)' : 'rgba(110,110,120,0.55)';             // steam
    for (var i = 0; i < 2; i++) {
      var ph = (st.t * 1.1 + i * 0.5) % 1;
      ctx.fillRect(5 + i * 2 + (Math.floor(st.t * 1.1 + i * 0.5) % 2), Math.round(22 - ph * 5), 1, 1);
    }

    // ---- sofa ----
    box(35, 12, 4, 16, C.sofaDark); box(35, 12, 1, 16, C.sofa);
    box(24, 27, 15, 2, C.sofa); box(24, 27, 15, 1, C.sofaLight);
    box(24, 29, 15, 2, C.sofaDark);
    box(25, 31, 2, 1, C.sofaLeg); box(37, 31, 2, 1, C.sofaLeg);

    // ---- avatar ----
    // thigh with softened ends: no hard corner at the knee or the butt
    box(27, 23, 9, 1, C.r); box(26, 24, 10, 2, C.r); box(26, 26, 9, 1, C.r);
    box(26, 27, 3, 4, C.r);                                   // shin
    box(25, 30, 4, 1, C.r); box(24, 31, 5, 1, C.r); px(24, 31, C.g);   // shoe with a rounded toe
    box(30, 15, 5, 1, C.k); box(30, 16, 6, 7, C.k);           // torso (back of the shoulder rounded)
    box(30, 16, 2, 7, C.b); px(31, 15, C.b);
    var laugh = st.laugh ? (Math.floor(st.t / 0.13) % 2) : 0;
    var hdy = 1 + (st.laugh ? laugh - 1 : 0);                 // head bent to the screen; bobs when laughing
    HEAD.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === '.') continue;
        px(HEAD_X + i, HEAD_Y + j + hdy, (st.blink && ch === 'e') ? C.s : C[ch]);
      }
    });
    ctx.fillStyle = rgba(0.10 + 0.04 * Math.sin(st.t * 6) + (st.laugh ? 0.06 : 0));   // screen light on his face
    HEAD.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) if (row[i] !== '.') ctx.fillRect(HEAD_X + i, HEAD_Y + j + hdy, 1, 1);
    });

    // ---- laptop on his lap: lid at the far end, leaning back, screen towards him ----
    box(26, 21, 8, 2, C.deck); box(26, 22, 8, 1, C.deckDark);          // base: mid grey, visible on light and dark pages
    for (var kx = 28; kx < 33; kx += 2) px(kx, 21, C.keyLight);           // keys
    // lid: a 1 px line leaning back by 2 px over its 6 px height, in even 2-row steps so it
    // reads as one straight diagonal
    [[26, 19], [25, 17], [24, 15]].forEach(function (seg) { px(seg[0], seg[1], C.lidBack); px(seg[0], seg[1] + 1, C.lidBack); });
    px(25, 17, C.lidEdge);                                                // logo on the lid back
    px(26, 21, C.lidEdge);                                                // hinge

    // ---- arm: shoulder -> elbow -> hand on the keys ----
    var hy = st.typing && st.beat ? 18 : 19;
    thick(SHOULDER.x, SHOULDER.y, 32, 20, C.k);
    thick(32, 20, 29, 19, C.k);
    box(28, hy, 2, 2, C.s);

    // ---- light from the screen on the sofa and his lap ----
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rgba(0.07);
    ctx.fillRect(22, 12, 18, 20);
    ctx.globalCompositeOperation = 'source-over';
  }
  function glowCol(g, a) {
    return 'rgb(' + Math.round(255 - (255 - g[0]) * a) + ',' + Math.round(255 - (255 - g[1]) * a) + ',' + Math.round(255 - (255 - g[2]) * a) + ')';
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

    var st = { dark: !!opts.dark, t: 0, blink: false, typing: false, beat: false, laugh: false, glowIdx: 0 };
    var raf, t0 = performance.now();
    var blinkAt = 2.5, blinkUntil = 0, typeAt = 2, typeUntil = 0, beatAt = 0, laughAt = 9, laughUntil = 0, glowAt = 5;
    function update(t) {
      st.t = t;
      if (t > typeAt) { typeUntil = t + 1.2 + Math.random() * 2.5; typeAt = typeUntil + 3 + Math.random() * 6; }   // short bursts
      st.typing = t < typeUntil;
      if (st.typing && t > beatAt) { st.beat = !st.beat; beatAt = t + 0.09 + Math.random() * 0.09; }
      if (t > laughAt) { laughUntil = t + 1.1; laughAt = t + 10 + Math.random() * 12; }
      st.laugh = t < laughUntil;
      if (t > glowAt) { st.glowIdx++; glowAt = t + 4 + Math.random() * 5; }    // new video / page
      if (t > blinkAt) { blinkUntil = t + 0.12; blinkAt = t + 2.5 + Math.random() * 3; }
      st.blink = t < blinkUntil;
    }
    function tick(now) {
      update((now - t0) / 1000);
      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { update(1); draw(ctx, st); }
    else raf = requestAnimationFrame(tick);

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarLaptop = { start: start, _draw: draw, _size: [W, H] };
})(window);
