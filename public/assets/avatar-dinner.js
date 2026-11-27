/*
 * avatar-dinner.js — a pixel-art scene: the avatar, seen from the side,
 * eating at a wooden table. Same animation, different meal:
 *   'breakfast'  toast and a fried egg, a mug of coffee
 *   'lunch'      a salad, a glass of water
 *   'dinner'     pasta with tomato sauce, a glass of orange juice   (default)
 *   'coffee'     a coffee break: mug in hand, a sip, a croissant on the side
 *
 *   - Each bite: fork into the food, up to his mouth, back down.
 *   - He chews for a moment (small head bobs), blinks now and then.
 *   - Steam rises from the plate.
 *
 * Usage:
 *   <script src="assets/avatar-dinner.js"></script>
 *   <script>AvatarDinner.start();</script>
 *
 * Options (all optional):
 *   variant    'breakfast' | 'lunch' | 'dinner' | 'coffee' (default 'dinner')
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

  var W = 40, H = 34;                       // scene size in sprite pixels
  var C = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', e: '#839392',
    p: '#E88989', k: '#000000', r: '#272828', g: '#636363', b: '#2F9FFF',
    tableTop: '#C99B66', tableEdge: '#B58B5A', tableLeg: '#8E6B43',
    chairBack: '#A07A52', chairSeat: '#B58B5A', chairLeg: '#8E6B43',
    plate: '#9FC5E8', plateEnd: '#6F96BF',
    pasta: '#F2C94C', sauce: '#C0392B',
    glassEdge: '#7FA8C9', juice: '#F2A33C',
    fork: '#C9CED6', sleeve: '#000000'
  };

  // The head from the other scenes (13 wide, includes the neck), at (26, 3).
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

  // The meals: a 6 x 4 pattern drawn on the plate at (21, 16), a colour for each letter,
  // the colours of a forkful, the drink, and whether the food steams.
  var MEALS = {
    dinner: {                                                // pasta with sauce
      food: ['..cc..', '.pcpp.', 'pppcpp', 'pppppp'],
      colors: { p: '#F2C94C', c: '#C0392B' },
      fork: ['#F2C94C', '#C0392B'], drink: 'juice', steam: true
    },
    breakfast: {                                             // toast and a fried egg
      food: ['.ccc..', 'cttcee', 'ttteye', 'tttee.'],
      colors: { c: '#B97B3B', t: '#E3A95E', e: '#E4DCC2', y: '#F2B705' },
      fork: ['#E4DCC2', '#F2B705'], drink: 'coffee', steam: true
    },
    coffee: { coffee: true },                                // handled separately: a mug instead of a fork
    lunch: {                                                 // salad
      food: ['.gGg..', 'gGrGgw', 'GgwgrG', 'gGgGgg'],
      colors: { g: '#5BAA4B', G: '#3E8A3A', r: '#D64545', w: '#F6E8A8' },
      fork: ['#5BAA4B', '#D64545'], drink: 'water', steam: false
    }
  };

  // Arm keyframes: elbow (ex, ey) and hand top-left (hx, hy).
  // The upper arm runs from the shoulder (33, 16) to the elbow, which sticks out in
  // front of his chest; the forearm goes on from there to the hand.
  var SHOULDER = { x: 33, y: 16 };
  // Arm lengths match his sprite: upper arm and forearm are each about 5 px.
  var REST  = { ex: 30, ey: 20, hx: 28, hy: 17 };
  var SCOOP = { ex: 30, ey: 20, hx: 27, hy: 17 };
  var LIFT  = { ex: 29, ey: 18, hx: 28, hy: 14 };
  var MOUTH = { ex: 28, ey: 16, hx: 30, hy: 11 };
  // Coffee: the hand stays on the mug; lift, sip (head tilts back), lower, rest.
  var C_REST  = { ex: 30, ey: 20, hx: 27, hy: 18 };
  var C_LIFT  = { ex: 29, ey: 18, hx: 28, hy: 14 };
  var C_MOUTH = { ex: 28, ey: 16, hx: 29, hy: 11 };   // mug right in front of his mouth
  var C_CYCLE = 5.6;
  var CYCLE = 3.4;                          // seconds per bite

  function mix(a, b, u) {
    u = u * u * (3 - 2 * u);                // smoothstep
    var o = {};
    for (var k in a) o[k] = a[k] + (b[k] - a[k]) * u;
    return o;
  }
  function seg(t, t0, t1) { return Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); }

  // Where the arm is, and whether there is pasta on the fork, at time t (s).
  function armAt(t, variant) {
    if (variant === 'coffee') {
      var cc = t % C_CYCLE, cp;
      if (cc < 1.4)       cp = C_REST;
      else if (cc < 2.0)  cp = mix(C_REST, C_LIFT, seg(cc, 1.4, 2.0));
      else if (cc < 2.5)  cp = mix(C_LIFT, C_MOUTH, seg(cc, 2.0, 2.5));
      else if (cc < 3.7)  cp = C_MOUTH;
      else if (cc < 4.4)  cp = mix(C_MOUTH, C_REST, seg(cc, 3.7, 4.4));
      else                cp = C_REST;
      cp = mix(cp, cp, 0);                            // a copy: the keyframes stay untouched
      // how far the mug is tipped: 0 = upright, 1 = on its side with the rim at his lips
      cp.tilt = cc < 2.0 ? 0 : cc < 2.5 ? seg(cc, 2.0, 2.5) : cc < 3.7 ? 1 : cc < 4.0 ? 1 - seg(cc, 3.7, 4.0) : 0;
      cp.sip = cc >= 2.5 && cc < 3.7;
      cp.food = false; cp.chew = false;
      return cp;
    }
    var c = t % CYCLE, pose;
    if (c < 0.6)       pose = mix(REST, SCOOP, seg(c, 0, 0.4));
    else if (c < 1.0)  pose = mix(SCOOP, LIFT, seg(c, 0.6, 1.0));
    else if (c < 1.4)  pose = mix(LIFT, MOUTH, seg(c, 1.0, 1.4));
    else if (c < 1.8)  pose = MOUTH;
    else if (c < 2.3)  pose = mix(MOUTH, REST, seg(c, 1.8, 2.3));
    else               pose = REST;
    pose.food = c >= 0.6 && c < 1.6;
    pose.chew = c >= 1.6 && c < 3.0;
    return pose;
  }

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    // A line drawn 2 px thick (arms are never thinner than 2 px).
    function thick(x0, y0, x1, y1, col) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i <= n; i++)
        box(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 2, 2, col);
    }

    // ---- table ----
    box(5, 21, 26, 1, C.tableTop);
    box(5, 22, 26, 1, C.tableEdge);
    box(7, 23, 3, 9, C.tableLeg);                    // far leg

    // ---- plate, pasta, glass ----
    box(19, 20, 10, 1, C.plate);                     // plate within easy reach of his arm
    px(19, 20, C.plateEnd); px(28, 20, C.plateEnd);
    var meal = MEALS[st.variant] || MEALS.dinner;
    if (meal.coffee) {
      box(23, 20, 6, 1, C.plate); px(23, 20, C.plateEnd); px(28, 20, C.plateEnd);     // saucer
      box(13, 20, 7, 1, C.plate); px(13, 20, C.plateEnd); px(19, 20, C.plateEnd);     // plate with a croissant
      box(15, 19, 3, 1, '#C98B3E'); px(14, 19, '#B8762E'); px(18, 19, '#B8762E'); box(15, 18, 3, 1, '#E0A458');
    } else meal.food.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch !== '.') px(21 + i, 16 + j, meal.colors[ch]);
      }
    });
    if (meal.coffee) {
    } else if (meal.drink === 'coffee') {                   // mug
      box(12, 17, 4, 4, '#E0674F'); box(12, 17, 4, 1, '#B84A35'); px(16, 18, '#E0674F'); px(16, 19, '#E0674F');
    } else {                                                // glass
      box(12, 17, 1, 4, C.glassEdge); box(15, 17, 1, 4, C.glassEdge);
      box(12, 20, 4, 1, C.glassEdge);
      box(13, 18, 2, 2, meal.drink === 'water' ? '#DCEFFA' : C.juice);
    }
    // steam
    ctx.fillStyle = st.dark ? 'rgba(225,230,240,0.6)' : 'rgba(110,110,120,0.55)';
    if (meal.steam && !meal.coffee) for (var i = 0; i < 2; i++) {
      var ph = (st.t * 1.1 + i * 0.5) % 1;
      ctx.fillRect(22 + i * 3 + ((Math.floor(st.t * 1.1 + i * 0.5)) % 2), Math.round(15 - ph * 5), 1, 1);
    }
    if (meal.drink === 'coffee' && !meal.coffee) {          // steam from the mug too
      var pm = (st.t * 1.3) % 1;
      ctx.fillRect(13 + (Math.floor(st.t * 1.3) % 2), Math.round(16 - pm * 4), 1, 1);
    }

    // ---- chair (wooden) ----
    box(36, 14, 2, 13, C.chairBack);
    box(28, 27, 9, 1, C.chairSeat);
    box(28, 28, 9, 1, C.chairLeg);
    box(31, 29, 2, 3, C.chairLeg); box(35, 29, 2, 3, C.chairLeg);

    // ---- avatar ----
    // thigh with softened ends: no hard corner at the knee or the butt
    box(25, 23, 11, 1, C.r); box(24, 24, 12, 2, C.r); box(24, 26, 11, 1, C.r);
    box(24, 27, 3, 4, C.r);                          // shin
    box(23, 30, 4, 1, C.r); box(22, 31, 5, 1, C.r); px(22, 31, C.g);   // shoe with a rounded toe
    box(30, 15, 5, 1, C.k); box(30, 16, 6, 7, C.k);  // torso: jacket (back of the shoulder rounded)
    box(30, 16, 2, 7, C.b); px(31, 15, C.b);         // blue shirt at the front
    var dy = st.arm.chew ? (Math.floor(st.t / 0.18) % 2) : 0;   // chewing
    var back = st.arm.sip;                                      // head tipped back for a sip
    HEAD.forEach(function (row, j) {
      // Tipping back: the head (rows 0-9) lifts one pixel, the neck stays on the shoulders,
      // and the chin row is drawn again in its old place so nothing separates.
      var rdy = back && j <= 9 ? -1 : dy;
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === '.') continue;
        var col = (st.blink && ch === 'e') ? C.s : C[ch];
        px(HEAD_X + i, HEAD_Y + j + rdy, col);
        if (back && j === 9) px(HEAD_X + i, HEAD_Y + j, col);
      }
    });

    // ---- arm: forearm from the elbow, hand, fork ----
    var a = st.arm;
    var hx = Math.round(a.hx), hy = Math.round(a.hy);
    thick(SHOULDER.x, SHOULDER.y, Math.round(a.ex), Math.round(a.ey), C.sleeve);   // upper arm, from the shoulder
    thick(Math.round(a.ex), Math.round(a.ey), hx, hy, C.sleeve);                   // forearm
    if (meal.coffee) {
      // the mug rides in his hand: on the saucer, up to his mouth, and back
      var CO = '#E0674F', RIM = '#B84A35', COF = '#6A4A2F';
      // Mostly upright all the way; at his lips the rim leans towards him by a single pixel.
      var lean = a.tilt > 0.5 ? 1 : 0;
      box(hx - 3 + lean, hy - 1, 4, 1, RIM); box(hx - 2 + lean, hy - 1, 2, 1, COF);
      box(hx - 3, hy, 4, 3, CO);
      px(hx - 4, hy, CO); px(hx - 4, hy + 1, CO);                                     // handle, on the far side
      if (lean) px(hx + 1, hy - 1, RIM);                                              // rim edge touching the lips
      if (!a.tilt) {
        ctx.fillStyle = st.dark ? 'rgba(225,230,240,0.6)' : 'rgba(110,110,120,0.55)';   // steam
        for (var si = 0; si < 2; si++) {
          var sp = (st.t * 1.3 + si * 0.5) % 1;
          ctx.fillRect(hx - 3 + si * 2 + (Math.floor(st.t * 1.3 + si * 0.5) % 2), Math.round(hy - 2 - sp * 4), 1, 1);
        }
      }
      box(hx, hy, 2, 2, C.s);                                                         // hand on the mug
    } else {
      box(hx, hy, 2, 2, C.s);
      box(hx - 2, hy, 2, 1, C.fork);                   // short fork: 2 px handle
      box(hx - 3, hy - 1, 1, 3, C.fork);               // tines
      if (a.food) { box(hx - 4, hy - 1, 1, 3, meal.fork[0]); px(hx - 4, hy, meal.fork[1]); }
    }

    // ---- table leg in the foreground ----
    box(28, 23, 2, 9, C.tableLeg);
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
    // Two empty rows sit under the feet, so they land 2 rows into the floor.
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

    var st = { variant: MEALS[opts.variant] ? opts.variant : 'dinner', dark: !!opts.dark, t: 0, arm: armAt(0, MEALS[opts.variant] ? opts.variant : 'dinner'), blink: false };
    var raf, last = performance.now(), blinkAt = 2 + Math.random() * 2, blinkUntil = 0, speed = 1;
    var baseTransform = left ? 'scaleX(-1)' : '';
    function tick(now) {
      st.t += Math.min(0.1, (now - last) / 1000) * speed; last = now;         // scene time runs at `speed` x
      if (speed > 1.2) {                                                      // too much coffee: the jitters
        var j = (speed - 1) * scale * 0.35;
        cv.style.transform = baseTransform + ' translate(' + Math.round((Math.random() - 0.5) * 2 * j) + 'px,' + Math.round((Math.random() - 0.5) * 2 * j) + 'px)';
      }
      st.arm = armAt(st.t, st.variant);
      if (st.t > blinkAt) { blinkUntil = st.t + 0.12; blinkAt = st.t + 2.5 + Math.random() * 3; }
      st.blink = st.t < blinkUntil;
      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { st.t = 1.2; st.arm = armAt(1.2, st.variant); draw(ctx, st); }
    else raf = requestAnimationFrame(tick);

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      setSpeed: function (x) { speed = x; if (x <= 1.2) cv.style.transform = baseTransform; },   // the coffee cheat (see site.js)
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarDinner = { start: start, _draw: draw, _size: [W, H], _armAt: armAt };
})(window);
