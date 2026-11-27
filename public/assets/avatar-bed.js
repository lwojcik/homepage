/*
 * avatar-bed.js — a pixel-art scene: the avatar asleep in bed.
 *
 *   - He lies on his side, head on a pillow, eyes closed, under a blanket.
 *   - The blanket rises and falls as he breathes.
 *   - "Z"s drift up from the pillow.
 *
 * The head is the same sprite as in the other scenes, turned on its side.
 *
 * Usage:
 *   <script src="assets/avatar-bed.js"></script>
 *   <script>AvatarBed.start();</script>
 *
 * Options (all optional):
 *   variant    'sleep' (default) or 'phone': awake in the middle of the night,
 *              lit by his phone, thumb scrolling
 *   container  element to sit in (default: the viewport, fixed position)
 *   position   'right' (default) or 'left'; 'left' mirrors the scene
 *   edge       gap to the side of the window in px (default 24)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   floor      draw the plank floor across the bottom (default true)
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 */
(function (global) {
  'use strict';

  var W = 44, H = 36;                       // scene size in sprite pixels
  var C = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', 
    p: '#E88989',
    wood: '#7A5538', rail: '#8E6B43', woodLight: '#A07A52',
    mattress: '#E6DFCB', mattressEdge: '#BFB28F',
    pillow: '#9CC3E6', pillowShade: '#7BA5CC',
    blanket: '#3F8F8B', blanketTop: '#6FC2BB', blanketStripe: '#2F7470',
    e: '#839392', zzz: '#5E6C8F', zzzDark: '#C9D6FF', pyjama: '#5B6FA3', lid: '#3A281C'
  };

  // The back of his head (he sleeps facing away): a small rounded dome in the
  // same hair colours as the other scenes, 10 wide, with the neck below.
  var HEAD = [
    '...hahh...',
    '.hhahhahh.',
    'hahhhahahh',
    'hhahhhhhah',
    'ahhhahhhhh',
    'hhhahhhahh',
    'hahhhhahhh',
    '.hhahhhhh.',
    '..hhhahh..',
    '....sdd...'
  ];
  // Turn it 90 degrees counter-clockwise: the top of the head points to the
  // headboard, the chin to the body.
  var HW = HEAD[0].length, HH = HEAD.length;
  var HEAD_SIDE = [];
  for (var ry = 0; ry < HW; ry++) {
    var line = '';
    for (var rx = 0; rx < HH; rx++) line += HEAD[rx][HW - 1 - ry];
    HEAD_SIDE.push(line);
  }
  // Awake: the real face (cropped to 11 columns, rows 0-9), lying on his back.
  var FACE = ['...ahahah....','..hahhahhah..','.hahhhahahah.','.asssssshhhha','hsssssssshah.',
              'asesssseshhh.','asssdsssshhh.','.ppsssspphss.','..sddddsshds.','...ssssss....']
    .map(function (r) { return r.slice(1, 12); });
  // Transposed (not rotated): forehead to the headboard, chin to the body, face up.
  var HEAD_FACE = [];
  for (var fy = 0; fy < FACE[0].length; fy++) {
    var fl = '';
    for (var fx = 0; fx < FACE.length; fx++) fl += FACE[fx][fy];
    HEAD_FACE.push(fl);
  }
  var HEAD_X = 6, HEAD_Y = 8;   // one row lower: the cheek sinks into the pillow

  var Z_GLYPH = ['xxxx', '..x.', '.x..', 'xxxx'];

  // Blanket top edge (y) for x = 15..39. His body is as thick as in the other
  // scenes (shoulders ~10 px, hips ~8, legs ~6), so the hump follows that.
  function blanketTop(x, breath) {
    var y = x < 16 ? 13 : x < 27 ? 11 : x < 36 ? 12 : 14;   // pulled up to his chin
    if (x < 31) y -= breath;
    return y;
  }

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(0, 4);                             // headroom for the Zs
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }

    // ---- bed frame ----
    box(2, 25, 41, 3, C.rail);                       // side rail
    box(3, 28, 2, 2, C.wood); box(40, 28, 2, 2, C.wood);   // feet
    box(5, 20, 35, 5, C.mattress);
    box(5, 24, 35, 1, C.mattressEdge);               // underside shadow of the mattress

    // ---- head (behind pillow and blanket) ----
    (st.phone ? HEAD_FACE : HEAD_SIDE).forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === '.') continue;
        px(HEAD_X + i, HEAD_Y + j + (st.phone ? 1 : 0), (st.blink && ch === 'e') ? C.s : C[ch]);
      }
    });

    // ---- pillow (the cheek sinks into it) ----
    box(6, 17, 11, 4, C.pillow);
    box(6, 20, 11, 1, C.pillowShade);

    // ---- phone arm: comes up from UNDER the blanket (drawn before it) ----
    if (st.phone) {
      var ahy = (Math.floor(st.t / 1.3) % 3 === 0 && (st.t % 1.3) < 0.2) ? -1 : 0;   // thumb flick
      var armPts = [[20, 12], [19, 11], [18, 10], [17, 9], [16, 8], [15, 7]];
      armPts.forEach(function (q) { box(q[0], q[1], 3, 2, C.pyjama); });
      box(14, 5 + ahy, 3, 3, C.s);                       // hand around the end of the phone
    }

    // ---- blanket ----
    for (var x = 15; x <= 39; x++) {
      var top = blanketTop(x, st.breath);
      box(x, top, 1, 26 - top, C.blanket);
      px(x, top, C.blanketTop);
      for (var y = top + 3; y < 25; y += 3) px(x, y, C.blanketStripe);
    }
    box(15, 25, 25, 1, C.blanketStripe);             // hem hanging over the rail

    // ---- phone held above his face, screen towards him ----
    if (st.phone) {
      var flick = 0.18 + 0.06 * Math.sin(st.t * 7);
      // (his eyes are the head sprite's own grey pixels, and blink like in the other scenes)
      box(7, 4, 8, 3, '#2B2E38');                        // the phone, long side along his face
      px(8, 5, '#5A5F6E');                               // camera lens
      box(7, 6, 8, 1, '#BFE3FF');                        // screen edge, facing him
      // light cone from the screen onto his face
      ctx.fillStyle = 'rgba(150,205,255,' + (0.16 + 0.05 * Math.sin(st.t * 7)) + ')';
      ctx.fillRect(8, 7, 6, 1); ctx.fillRect(7, 8, 8, 1);
      // screen light on his face, pillow and blanket (only on pixels already drawn)
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(150,205,255,' + (flick + 0.1) + ')';
      ctx.fillRect(5, 7, 15, 14);
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---- headboard + footboard (in front) ----
    box(2, 5, 3, 25, C.wood);
    box(1, 4, 5, 2, C.woodLight);
    box(40, 17, 3, 13, C.wood);
    box(39, 16, 5, 2, C.woodLight);

    ctx.restore();

    // ---- Zzz ----
    var zc = st.dark ? C.zzzDark : C.zzz;
    for (var i = 0; i < (st.phone ? 0 : 3); i++) {
      var p = ((st.t / 4.2) + i / 3) % 1;            // 0..1 along the path
      var zx = Math.round(19 + p * 13 + Math.sin(p * 6.28 + i) * 1.5);
      var zy = Math.round(9 - p * 9);
      var small = p < 0.45;
      ctx.globalAlpha = p < 0.12 ? p / 0.12 : (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1);
      if (small) {                                   // 3x3 version while it is small
        ctx.fillStyle = zc;
        ctx.fillRect(zx, zy, 3, 1); ctx.fillRect(zx + 1, zy + 1, 1, 1); ctx.fillRect(zx, zy + 2, 3, 1);
      } else {
        Z_GLYPH.forEach(function (r, j) {
          for (var k = 0; k < r.length; k++) if (r[k] === 'x') px(zx + k, zy + j, zc);
        });
      }
      ctx.globalAlpha = 1;
    }
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
    // Two empty rows sit under the bed feet, so they land 2 rows into the floor.
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

    var st = { dark: !!opts.dark, t: 0, breath: 0, phone: opts.variant === 'phone', blink: false };
    var blinkAt = 2 + Math.random() * 3, blinkUntil = 0;
    var raf, start0 = performance.now();
    function tick(now) {
      st.t = (now - start0) / 1000;
      if (st.t > blinkAt) { blinkUntil = st.t + 0.12; blinkAt = st.t + 2 + Math.random() * 4; }
      st.blink = st.t < blinkUntil;
      st.breath = Math.sin(st.t * Math.PI * 2 / 4.5) > 0 ? 1 : 0;   // one breath every 4.5 s
      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { st.t = 1.5; draw(ctx, st); }
    else raf = requestAnimationFrame(tick);

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarBed = { start: start, _draw: draw, _size: [W, H] };
})(window);
