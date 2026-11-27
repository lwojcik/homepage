/*
 * avatar-couch.js — a pixel-art scene: the avatar on a sofa in front of a TV.
 * Two variants:
 *   'gaming'  he plays a GTA-style driving game: thumbs mash, he leans in when his car
 *             swerves around traffic, and slumps a little when it crashes.
 *   'nap'     a daytime nap: lying on a long sofa on his side, facing away (as in the sleeping scene), a blanket over his legs, breathing.
 *   'tv'      he watches TV with a bucket of popcorn, now and then taking a
 *             handful and laughing.
 *
 * Usage:
 *   <script src="assets/avatar-couch.js"></script>
 *   <script>AvatarCouch.start({ variant: 'gaming' });</script>
 *
 * Options (all optional):
 *   variant    'gaming' (default), 'tv' or 'nap'
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
    wood: '#8E6B43', woodTop: '#A47C52', woodDark: '#6E5233',
    bezel: '#2B2B30', led: '#5BE37D',
    sofa: '#4F7F8C', sofaDark: '#3E6773', sofaLight: '#6597A5', sofaLeg: '#2B2F36',
    pad: '#2B2B30', sleeve: '#000000', bucketRed: '#D64545', bucketWhite: '#F4F1EA', corn: '#F7E08A'
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

  function seg(t, t0, t1) { return Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); }
  function mix(a, b, u) {
    u = u * u * (3 - 2 * u);
    var o = {};
    for (var k in a) o[k] = a[k] + (b[k] - a[k]) * u;
    return o;
  }

  // ---- what the TV shows ----
  // The screen is SW x SH = 18 x 11 pixels, at (2, 10).
  var SW = 18, SH = 11;
  function screenGame(box, px, t) {
    // An open-world driving game: dusk skyline, a street in perspective, traffic ahead, a minimap and a health bar in the
    // corner. Every 7th car he does not swerve in time: crash, police lights, wanted stars until the next car.
    var cyc = Math.floor(t / 2.2), ph = t % 2.2;
    var crash = cyc % 7 === 6;                                    // this car is the crash
    var wanted = cyc % 7 === 0 && cyc > 0;                        // the cycle after a crash: the cops are after him
    var hit = crash && ph > 1.9;
    // sky: dusk
    box(0, 0, SW, 1, '#FF8F6B'); box(0, 1, SW, 1, '#FFAA77'); box(0, 2, SW, 3, '#FFC98A');
    // skyline, scrolling slowly
    var off = Math.floor(t * 1.5), H = [2, 3, 1, 3, 2, 2, 3, 1, 2, 3, 2, 1];
    for (var x = 0; x < SW; x++) {
      var h = H[(x + off) % H.length];
      box(x, 5 - h, 1, h, '#2B2F4A');
      if (h >= 2 && (x + off) % 3 === 0 && (Math.floor(t * 2) + x) % 5) px(x, 6 - h, '#FFD36B');
    }
    // ground and the street, narrowing towards the horizon
    box(0, 5, SW, 6, '#3B4A3F');
    var L = [7, 6, 5, 4, 3, 2], R = [10, 11, 12, 13, 14, 15];
    for (var i = 0; i < 6; i++) {
      var y = 5 + i;
      box(L[i], y, R[i] - L[i] + 1, 1, '#40434F');
      px(L[i], y, '#8A8E9B'); px(R[i], y, '#8A8E9B');             // kerbs
      if ((y + Math.floor(t * 6)) % 3 === 0) { px(8, y, '#F2D45B'); px(9, y, '#F2D45B'); }   // lane dashes
    }
    // the car ahead, getting bigger
    var z = ph / 2.2, cy = 5 + Math.round(z * 4), cw = 1 + Math.round(z * 2), cx = 9 - Math.ceil(cw / 2);
    if (cw >= 2) {
      box(cx, cy, cw, 1, '#3C7BD9'); px(cx, cy, '#FF5050'); px(cx + cw - 1, cy, '#FF5050');
      if (cw >= 3) box(cx + 1, cy - 1, cw - 2, 1, '#1F2740');
    } else px(cx, cy, '#3C7BD9');
    // his car, from behind; it swerves around the traffic (not on the crash cycle)
    var jt = ph - 1.2, in_ = jt > 0 && jt < 0.7;
    var jump = in_ ? Math.sin(jt / 0.7 * Math.PI) * 4 : 0;
    var carX = 6 + (crash ? 0 : Math.round(jump * 0.75)) + (hit ? Math.floor(t * 20) % 2 : 0);
    box(carX + 1, 8, 4, 1, '#2B2B30');                             // rear window
    box(carX, 9, 6, 1, '#E23B3B'); px(carX, 9, '#FFD36B'); px(carX + 5, 9, '#FFD36B');
    box(carX, 10, 2, 1, '#15151A'); box(carX + 4, 10, 2, 1, '#15151A'); box(carX + 2, 10, 2, 1, '#B02A2A');
    // police lights at the edges of the screen
    if (wanted || hit) { var s = Math.floor(t * 6) % 2; box(0, 0, 1, SH, s ? '#FF3B3B' : '#3B6BFF'); box(SW - 1, 0, 1, SH, s ? '#3B6BFF' : '#FF3B3B'); }
    // HUD: wanted stars (top left), minimap and health bar (top right)
    if (wanted) for (var k = 0; k < 3; k++) px(1 + k * 2, 1, Math.floor(t * 4) % 2 ? '#FFD36B' : '#FFF3B0');
    else if (hit) px(1, 1, '#FFD36B');
    box(14, 0, 2, 1, '#2E3A36'); box(13, 1, 4, 2, '#2E3A36'); box(14, 3, 2, 1, '#2E3A36');   // round minimap
    px(14, 1, '#8A978F'); px(15, 2, '#8A978F');                                              // streets
    px(14, 2, '#FFFFFF');                                                                    // him
    if (wanted || hit) px(16, 1, Math.floor(t * 6) % 2 ? '#FF3B3B' : '#3B6BFF');             // the cops
    box(13, 4, hit ? 2 : 4, 1, hit ? '#E23B3B' : '#5BE37D');                                 // health
    return jump;
  }
  function screenShow(box, px, t) {
    var scene = Math.floor(t / 6) % 3, u = (t % 6) / 6;
    if (scene === 0) {                                                      // sunset
      box(0, 0, SW, 4, '#F2846B'); box(0, 4, SW, 3, '#F2B16B'); box(0, 7, SW, 4, '#3C4A6B');
      box(7, 4 + Math.round(u * 3), 5, 3, '#FFE08A');
    } else if (scene === 1) {                                               // sea
      box(0, 0, SW, 5, '#9FD8F5'); box(0, 5, SW, 6, '#3E8FD0');
      for (var i = 0; i < 7; i++) px(((i * 3 + Math.floor(t * 3)) % SW), 6 + (i % 4), '#CFEAFF');
    } else {                                                                // city at night
      box(0, 0, SW, SH, '#1A2140');
      for (var b = 0; b < 5; b++) {
        box(b * 4, 4 + (b % 2), 3, SH - 4 - (b % 2), '#2A3566');
        for (var w = 0; w < 4; w++) if ((Math.floor(t * 2) + b * 3 + w) % 4) px(b * 4 + 1, 5 + (b % 2) + w * 1, '#FFD36B');
      }
    }
  }

  // ---- arm keyframes (elbow ex,ey; hand hx,hy) ----
  var PAD_POSE = { ex: 32, ey: 20, hx: 27, hy: 17 };
  var SHOULDER = { x: 33, y: 16 };            // upper arm: shoulder -> elbow, then the forearm
  var BUCKET   = { ex: 30, ey: 21, hx: 28, hy: 19 };   // each arm segment is ~5 px, like his sprite
  var LIFT     = { ex: 28, ey: 18, hx: 29, hy: 15 };
  var MOUTH    = { ex: 28, ey: 16, hx: 31, hy: 12 };
  var TV_CYCLE = 6;

  // One smooth motion each way (the old version stopped half-way at LIFT every time, which
  // looked robotic): the hand dips into the bucket, then travels to his mouth along a gentle
  // arc, pausing there, and comes back the same way.
  var DIP = { ex: 30, ey: 22, hx: 28, hy: 20 };      // hand pushed into the popcorn
  function arc(a, b, u) {
    var e = u * u * (3 - 2 * u);                      // ease in and out over the WHOLE trip
    var o = {};
    for (var k in a) o[k] = a[k] + (b[k] - a[k]) * e;
    var bulge = Math.sin(e * Math.PI);                // the elbow and hand swing out a little
    o.hx -= bulge * 1.5; o.ex -= bulge * 1.0; o.hy += bulge * 0.5;
    return o;
  }
  function tvArm(t) {
    var c = t % TV_CYCLE, pose;
    if (c < 2.4)       pose = BUCKET;
    else if (c < 2.8)  pose = mix(BUCKET, DIP, seg(c, 2.4, 2.8));         // reach into the bucket
    else if (c < 3.1)  pose = DIP;                                         // grab
    else if (c < 3.9)  pose = arc(DIP, MOUTH, seg(c, 3.1, 3.9));          // up to his mouth, one motion
    else if (c < 4.7)  pose = MOUTH;                                       // pop it in
    else if (c < 5.5)  pose = arc(MOUTH, BUCKET, seg(c, 4.7, 5.5));       // and back down
    else               pose = BUCKET;
    return { p: pose, laugh: c >= 4.9 && c < 5.9, corn: c >= 3.1 && c < 4.2 };
  }


  // The back of his head, as in the sleeping scene (he lies facing away): a hair dome with the neck below, turned on its side. Here the top of
  // the head points to the right (the pillow) and the neck to the left (his body).
  var NAP_BACK = ['...hahh...', '.hhahhahh.', 'hahhhahahh', 'hhahhhhhah', 'ahhhahhhhh', 'hhhahhhahh', 'hahhhhahhh', '.hhahhhhh.', '..hhhahh..', '....sdd...'];
  var NAP_HEAD = [];
  for (var ry = 0; ry < 10; ry++) {
    var nl = '';
    for (var rx = 0; rx < 10; rx++) nl += NAP_BACK[rx][9 - ry];
    NAP_HEAD.push(nl.split('').reverse().join(''));
  }

  // ---- the nap: lying on a long sofa, in daylight, on his side facing away (like the sleeping scene), a blanket over his legs ----
  function drawNap(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    var breath = Math.round(Math.sin(st.t * 1.4) * 0.5 + 0.5);                 // 0 / 1: his back rises and falls

    // ---- the sofa: back, armrests, seat ----
    box(6, 16, 31, 10, C.sofaDark); box(6, 16, 31, 1, '#4E7F8D');
    for (var sx = 14; sx < 36; sx += 8) box(sx, 17, 1, 9, '#33596A');                // seams between the back cushions
    box(3, 19, 3, 12, C.sofa); box(3, 19, 3, 1, C.sofaLight);                          // left armrest
    box(37, 19, 3, 12, C.sofa); box(37, 19, 3, 1, C.sofaLight);                        // right armrest
    box(6, 26, 31, 2, C.sofa); box(6, 26, 31, 1, C.sofaLight);                          // seat cushion
    box(5, 28, 33, 3, C.sofaDark);
    box(6, 31, 2, 1, C.sofaLeg); box(36, 31, 2, 1, C.sofaLeg);

    // ---- him: socks on the left armrest, legs, his back ----
    box(4, 22, 3, 3, '#9AA0B4');                                                       // socks
    box(7, 19, 8, 7, C.r);                                                             // legs
    // his back: blue, like his body in every other scene, with a rounded shoulder towards the head (not a block) and a lighter top edge; it rises with each breath.
    var ty = 18 - breath, rows = 8 + breath;
    for (var r = 0; r < rows; r++) {
      var right = r === 0 ? 23 : (r === 1 || r === rows - 1) ? 24 : 25;           // the end by the head is rounded off at the top and the bottom
      box(14, ty + r, right - 14 + 1, 1, r === 0 ? '#5BB5FF' : C.b);
    }
    // the hood of his hoodie, bunched up between his shoulders behind his neck: black like the sleeves, rounded, with a fold and a drawstring end
    box(22, ty + 1, 4, 1, C.k); box(21, ty + 2, 5, 3, C.k); box(22, ty + 5, 4, 1, C.k);
    box(21, ty + 2, 1, 3, '#1F2025'); box(22, ty + 1, 4, 1, '#2B2D33');
    px(23, ty + 6, '#E8E6DA'); px(23, ty + 7, '#E8E6DA');
    box(24, 23, 3, 2, C.k);                                                    // only a black cuff, where his arm goes under the pillow (his arms are in front of him)
    // a blanket over his legs and the lower half of his back; the part over his back rises with his breath, so it always covers him
    box(7, 18, 7, 9, '#B5533C'); box(14, 18 - breath, 6, 9 + breath, '#B5533C');
    for (var bx = 9; bx < 20; bx += 3) { var up = bx >= 14 ? breath : 0; box(bx, 18 - up, 1, 9 + up, '#D9795C'); }
    box(7, 26, 13, 1, '#8E3D2C');

    // ---- the head: the back of it, facing away, then the pillow over its lower edge (the cheek sinks into it) ----
    NAP_HEAD.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) { var ch = row[i]; if (ch !== '.') px(26 + i, 16 + j, C[ch]); }
    });
    box(27, 23, 10, 1, '#E8D9B5'); box(26, 24, 11, 2, '#E8D9B5'); box(26, 25, 11, 1, '#CDBB9A');                 // the pillow, its top corner rounded

    // ---- real Zs drifting up from his head: a 3x4 one while it is small, a 4x4 one as it grows ----
    var Z4 = ['xxx', '..x', '.x.', 'xxx'], Z5 = ['xxxx', '..x.', '.x..', 'xxxx'], zc = st.dark ? '#C9D6FF' : '#5E6C8F';
    for (var z = 0; z < 3; z++) {
      var p = ((st.t / 4.2) + z / 3) % 1, zx = Math.round(27 + p * 6 + Math.sin(p * 6.28 + z) * 1), zy = Math.round(13 - p * 9);
      ctx.globalAlpha = p < 0.12 ? p / 0.12 : (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1);
      ctx.fillStyle = zc;
      (p < 0.45 ? Z4 : Z5).forEach(function (r, jz) {
        for (var kz = 0; kz < r.length; kz++) if (r[kz] === 'x') ctx.fillRect(zx + kz, zy + jz, 1, 1);
      });
      ctx.globalAlpha = 1;
    }
  }

  function draw(ctx, st) {
    if (st.variant === 'nap') { drawNap(ctx, st); return 0; }
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    function thick(x0, y0, x1, y1, col) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i < n + 1; i++)
        box(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 2, 2, col);
    }
    var gaming = st.variant === 'gaming';

    // ---- TV on a low cabinet ----
    box(1, 25, 20, 7, C.wood); box(1, 25, 20, 1, C.woodTop);
    box(2, 27, 8, 4, C.woodDark); box(12, 27, 8, 4, C.woodDark);
    px(9, 29, C.woodTop); px(12, 29, C.woodTop);
    box(1, 9, 20, 14, C.bezel);                              // big TV
    box(10, 23, 2, 2, C.bezel);
    var jump = 0;
    ctx.save(); ctx.translate(2, 10);
    ctx.beginPath(); ctx.rect(0, 0, SW, SH); ctx.clip();      // nothing on the screen may leave the screen
    var sbox = function (x, y, w, h, col) { box(x, y, w, h, col); };
    if (gaming) jump = screenGame(sbox, function (x, y, c) { box(x, y, 1, 1, c); }, st.t);
    else screenShow(sbox, function (x, y, c) { box(x, y, 1, 1, c); }, st.t);
    ctx.restore();

    // ---- sofa ----
    box(35, 12, 4, 16, C.sofaDark);                 // back
    box(35, 12, 1, 16, C.sofa);
    box(24, 27, 15, 2, C.sofa);                     // seat cushion
    box(24, 27, 15, 1, C.sofaLight);
    box(24, 29, 15, 2, C.sofaDark);                 // base
    box(25, 31, 2, 1, C.sofaLeg); box(37, 31, 2, 1, C.sofaLeg);

    // ---- avatar ----
    var lean = gaming && st.lean > 0 ? 1 : 0;       // leans toward the screen
    var slump = gaming && st.slump ? 1 : 0;
    var laugh = !gaming && st.laugh ? (Math.floor(st.t / 0.14) % 2) : 0;
    // thigh with softened ends: no hard corner at the knee or the butt
    box(25, 23, 11, 1, C.r); box(24, 24, 12, 2, C.r); box(24, 26, 11, 1, C.r);
    box(24, 27, 3, 4, C.r);                         // shin
    box(23, 30, 4, 1, C.r); box(22, 31, 5, 1, C.r); px(22, 31, C.g);   // shoe with a rounded toe
    box(30 - lean, 15 + slump, 5, 1, C.k); box(30 - lean, 16 + slump, 6, 7 - slump, C.k);   // torso (back of the shoulder rounded)
    box(30 - lean, 16 + slump, 2, 7 - slump, C.b); px(31 - lean, 15 + slump, C.b);
    var hdx = -lean, hdy = slump + laugh;
    HEAD.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === '.') continue;
        px(HEAD_X + i + hdx, HEAD_Y + j + hdy, (st.blink && ch === 'e') ? C.s : C[ch]);
      }
    });
    // TV light on his face
    ctx.fillStyle = 'rgba(140,190,255,' + (0.08 + 0.05 * Math.sin(st.t * 9)) + ')';
    HEAD.forEach(function (row, j) {                // only on his face, not the background
      for (var i = 0; i < row.length; i++)
        if (row[i] !== '.') ctx.fillRect(HEAD_X + i + hdx, HEAD_Y + j + hdy, 1, 1);
    });

    // ---- arm ----
    if (gaming) {
      var mash = Math.floor(st.t / 0.09) % 2, hy = 17 + slump + (st.lean > 0 ? -1 : 0);
      thick(SHOULDER.x - lean, SHOULDER.y + slump, 31 - lean, 20 + slump, C.sleeve);   // upper arm
      thick(31 - lean, 20 + slump, 27 - lean, hy + mash, C.sleeve);                    // forearm
      box(27 - lean, hy + mash, 2, 2, C.s);                      // hand on the pad
      box(24 - lean, hy + 1, 5, 2, C.pad);                       // controller
      px(25 - lean, hy + 1, '#E23B3B'); px(26 - lean, hy + 2, '#5BE37D');
      if (mash) px(27 - lean, hy + 1, '#FFD36B');
    } else {
      // popcorn bucket on his lap
      box(27, 20, 5, 4, C.bucketWhite);
      box(28, 20, 1, 4, C.bucketRed); box(30, 20, 1, 4, C.bucketRed);
      box(27, 19, 5, 1, C.corn); px(28, 18, C.corn); px(30, 18, C.corn); px(29, 18, C.corn);
      var a = st.arm, p = a.p;
      thick(SHOULDER.x, SHOULDER.y, p.ex, p.ey, C.sleeve);
      thick(p.ex, p.ey, p.hx, p.hy, C.sleeve);
      box(p.hx, p.hy, 2, 2, C.s);
      if (a.corn) px(p.hx - 1, p.hy, C.corn);
    }
    // foreground sofa arm-rest not needed; keep scene open at the right
    return jump;
  }

  function start(opts) {
    opts = opts || {};
    var variant = opts.variant === 'tv' ? 'tv' : opts.variant === 'nap' ? 'nap' : 'gaming';
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

    var st = { variant: variant, dark: !!opts.dark, t: 0, blink: false, lean: 0, slump: false,
               laugh: false, arm: tvArm(0) };
    var raf, t0 = performance.now(), blinkAt = 2, blinkUntil = 0;
    function update(t) {
      st.t = t;
      if (variant === 'nap') {
        // nothing to update: the breathing is drawn from the time
      } else if (variant === 'gaming') {
        var ph = t % 2.2, jt = ph - 1.2;
        st.lean = (jt > -0.15 && jt < 0.7) ? 1 : 0;           // leans in as the hero jumps
        var crash = Math.floor(t / 2.2) % 7 === 6 && ph > 1.9;   // every 7th obstacle: crash
        st.slump = crash;
      } else {
        st.arm = tvArm(t);
        st.laugh = st.arm.laugh;
      }
      if (t > blinkAt) { blinkUntil = t + 0.12; blinkAt = t + 2.5 + Math.random() * 3; }
      st.blink = t < blinkUntil;
    }
    function tick(now) {
      update((now - t0) / 1000);
      draw(ctx, st);
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { update(1.5); draw(ctx, st); }
    else raf = requestAnimationFrame(tick);

    return {
      root: cv,
      setDark: function (d) { st.dark = !!d; },
      stop: function () { cancelAnimationFrame(raf); cv.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarCouch = { start: start, _draw: draw, _size: [W, H], _tvArm: tvArm };
})(window);
