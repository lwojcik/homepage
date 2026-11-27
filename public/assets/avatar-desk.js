/*
 * avatar-desk.js — a pixel-art scene: the avatar, seen from the side, working
 * at a computer. Desk, monitor, keyboard, mug and an office chair included.
 *
 *   - He types in bursts (hands alternate, keys light up), then pauses to think.
 *   - Code scrolls by on the monitor while he types; the cursor blinks.
 *   - He blinks, nods now and then; steam rises from the mug.
 *
 * Usage:
 *   <script src="assets/avatar-desk.js"></script>
 *   <script>AvatarDesk.start();</script>
 *
 * Options (all optional):
 *   container  element to sit in (default: the viewport, fixed position)
 *   position   'right' (default) or 'left'; he always faces the screen,
 *              the whole scene is mirrored for 'left' so he looks inward
 *   edge       gap to the side of the window in px (default 24)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   floor      draw the plank floor across the bottom (default true)
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 */
(function (global) {
  'use strict';

  var W = 40, H = 34;                       // scene size in sprite pixels
  var C = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', e: '#839392',
    p: '#E88989', k: '#000000', r: '#272828', g: '#636363', b: '#2F9FFF',
    deskTop: '#C99B66', deskEdge: '#B58B5A', deskLeg: '#8E6B43',
    chairBack: '#4B5563', chairSeat: '#5B6575', chairBase: '#2B2F36',
    bezel: '#2B2B30', screen: '#14202B', led: '#5BE37D',
    keysA: '#D9D9D9', keysB: '#BFBFBF', keyHit: '#8FD0FF',
    mug: '#E0674F', mugRim: '#B84A35', mugBand: '#F6D9A8', coffee: '#6A4A2F'
  };
  var CODE_COLORS = ['#7FDBCA', '#C792EA', '#FFCB6B', '#82AAFF', '#C3E88D'];

  // The head exactly as in the other scenes (13 wide, includes the neck),
  // drawn at (26, 3) so the neck lands on the shoulders.
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

  function rand(a, b) { return a + Math.random() * (b - a); }

  function newLine() {
    var indent = Math.floor(rand(0, 2));
    var segs = [], used = 0, max = 6 - indent - Math.floor(rand(0, 2));
    while (used < max) {
      var w = 1 + Math.floor(rand(0, 2));
      if (used + w > max) w = max - used;
      segs.push({ w: w, c: CODE_COLORS[Math.floor(rand(0, CODE_COLORS.length))] });
      used += w + 1;
      if (Math.random() < 0.18) break;
    }
    return { indent: indent, segs: segs };
  }

  // st: { t, typing, beat, hit, nod, blink, lines, cursor, steam }
  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    function rows(list, x0, y0, blink) {
      list.forEach(function (row, j) {
        for (var i = 0; i < row.length; i++) {
          var ch = row[i];
          if (ch === '.') continue;
          px(x0 + i, y0 + j, (blink && ch === 'e') ? C.s : C[ch]);
        }
      });
    }

    // ---- desk ----
    box(6, 21, 25, 1, C.deskTop);
    box(6, 22, 25, 1, C.deskEdge);
    // Drawer pedestal on the monitor side (the leg at the avatar's end is
    // drawn after the chair, below).
    box(7, 23, 7, 9, C.deskLeg);
    box(8, 24, 5, 3, C.deskEdge); box(8, 28, 5, 3, C.deskEdge);      // drawer fronts
    px(10, 25, C.deskLeg); px(11, 25, C.deskLeg);                    // handles
    px(10, 29, C.deskLeg); px(11, 29, C.deskLeg);

    // ---- monitor ----
    box(8, 8, 10, 10, C.bezel);
    box(9, 9, 8, 7, C.screen);
    box(12, 18, 2, 2, C.bezel);                       // neck
    box(10, 20, 6, 1, C.bezel);                       // foot
    var shown = st.lines.slice(-6);
    shown.forEach(function (ln, j) {
      var x = 10 + ln.indent, y = 9 + j;
      ln.segs.forEach(function (sg) { box(x, y, sg.w, 1, sg.c); x += sg.w + 1; });
    });
    var last = shown[shown.length - 1], cx = 10 + last.indent;
    last.segs.forEach(function (sg) { cx += sg.w + 1; });
    if (Math.floor(st.t * 2) % 2 === 0 && cx <= 15) box(cx, 9 + shown.length - 1, 1, 1, '#FFFFFF');

    // ---- keyboard ----
    for (var kx = 23; kx <= 29; kx++) px(kx, 20, kx % 2 ? C.keysA : C.keysB);
    if (st.hit >= 0) px(st.hit, 20, C.keyHit);

    // ---- mug + steam ----
    box(19, 18, 3, 3, C.mug);                        // teal mug, 3 px wide
    box(19, 18, 3, 1, C.mugRim);                     // darker rim
    px(22, 19, C.mug);                               // handle
    box(19, 19, 3, 1, C.mugBand);                    // light band
    ctx.fillStyle = st.dark ? 'rgba(225,230,240,0.6)' : 'rgba(110,110,120,0.6)';   // steam, visible on light and dark pages
    for (var i = 0; i < 2; i++) {
      var ph = (st.t * 1.4 + i * 0.5) % 1;
      ctx.fillRect(19 + ((i * 2 + Math.floor(st.t * 1.4 + i * 0.5)) % 3), Math.round(17 - ph * 4), 1, 1);
    }

    // ---- chair ----
    box(36, 14, 2, 13, C.chairBack);
    box(28, 27, 9, 1, C.chairSeat);
    box(28, 28, 9, 1, C.chairBack);
    box(32, 29, 2, 2, C.chairBase);
    box(28, 31, 10, 1, C.chairBase);
    px(28, 31, C.g); px(37, 31, C.g);

    // ---- avatar ----
    // legs: thigh under the desk, shin down to the floor, shoe pointing left
    // thigh with softened ends: no hard corner at the knee or the butt
    box(25, 23, 11, 1, C.r); box(24, 24, 12, 2, C.r); box(24, 26, 11, 1, C.r);
    box(24, 27, 3, 4, C.r);             // shin, 3 px wide
    box(23, 30, 4, 1, C.r); box(22, 31, 5, 1, C.r);   // shoe with a rounded toe
    px(22, 31, C.g);                    // toe cap
    // torso: blue shirt at the front, black jacket behind
    var by = 0;
    box(30, 15, 5, 1, C.k); box(30, 16, 6, 7, C.k);   // back of the shoulder rounded
    box(30, 16, 2, 7, C.b);
    px(31, 15, C.b);
    // arm: forearm out to the keyboard, hand taps
    box(26, 18, 8, 2, C.k);
    var hy = st.beat ? -1 : 0;
    box(24, 18 + hy, 2, 2, C.s);
    // head
    rows(HEAD, HEAD_X, HEAD_Y + st.nod, st.blink);

    // Desk leg in the foreground: drawn last, in front of his lap and the chair.
    box(28, 23, 2, 9, C.deskLeg);
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
    // Two empty rows sit under the feet, so the feet land 2 rows into the floor (like the walking scene).
    cv.style.cssText = 'position:' + pos + ';bottom:' + (floorH - 4 * scale) + 'px;' +
      (left ? 'left:' : 'right:') + edge + 'px;width:' + W * scale + 'px;height:' + H * scale + 'px;' +
      'image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;user-select:none;z-index:' + z +
      (left ? ';transform:scaleX(-1)' : '');
    (opts.mount || host).appendChild(cv);
    var ctx = cv.getContext('2d');

    var floorEl = null;
    if (floorOn && opts.floor !== 'external') {   // 'external': the page draws the floor
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

    var st = { dark: !!opts.dark, t: 0, typing: true, beat: false, hit: -1, nod: 0, blink: false,
               lines: [], cursor: 0 };
    for (var i = 0; i < 6; i++) st.lines.push(newLine());

    var clock = 0, last = performance.now(), raf;
    var phaseEnd = rand(3, 6), nextBeat = 0, nextScroll = 0, nodUntil = 0;
    var blinkAt = rand(2, 4), blinkUntil = 0;

    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; clock += dt; st.t = clock;

      // Alternate between typing bursts and thinking pauses.
      if (clock > phaseEnd) {
        st.typing = !st.typing;
        phaseEnd = clock + (st.typing ? rand(3, 7) : rand(1.2, 3));
        if (st.typing) nodUntil = clock + 0.18;           // small nod as he gets going
      }
      if (st.typing) {
        if (clock > nextBeat) {
          nextBeat = clock + rand(0.07, 0.15);
          st.beat = !st.beat;
          st.hit = 23 + Math.floor(rand(0, 7));
        }
        if (clock > nextScroll) { nextScroll = clock + rand(0.35, 0.7); st.lines.push(newLine()); st.lines.shift(); }
      } else { st.beat = false; st.hit = -1; }

      st.nod = clock < nodUntil ? 1 : 0;
      if (clock > blinkAt) { blinkUntil = clock + 0.12; blinkAt = clock + rand(2.5, 5.5); }
      st.blink = clock < blinkUntil;

      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }

    if (reduced) draw(ctx, st);
    else raf = requestAnimationFrame(function (t0) { last = t0; tick(t0); });

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarDesk = { start: start, _draw: draw, _size: [W, H], _newLine: newLine };
})(window);
