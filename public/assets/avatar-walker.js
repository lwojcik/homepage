/*
 * avatar-walker.js — a pixel-art avatar that wanders around your page.
 *
 * The sprite is the 13x22 pixel grid extracted from Logo_FullVectorsNoBG.svg.
 * It is drawn on a <canvas> from separate body parts (head, torso, hands, legs)
 * so a walk cycle can be built procedurally:
 *   - legs lift alternately (the lifted foot leaves the ground)
 *   - the body bobs down on each footfall
 *   - hands swing opposite to the legs
 *   - the head lags the body by a pixel for a bit of weight
 *   - a shadow stays on the ground while the body bobs
 *   - step rate is tied to travel distance, so feet don't "skate"
 * When idle it breathes and blinks, then picks a new spot to walk to.
 *
 * Usage:
 *   <script src="assets/avatar-walker.js"></script>
 *   <script>AvatarWalker.start();</script>
 *
 * Options (all optional):
 *   container  element to roam in (default: the viewport, fixed position)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   speed      walk speed in CSS px/second (default 55)
 *   phone      he talks on the phone while he walks: phone at his ear, mouth moving, the
 *              other hand gesturing (default false)
 *   camera     hang a camera round his neck; every so often he stops and takes
 *              a photo (default false)
 *   photoEvery [min, max] seconds between photos (default [8, 18])
 *   floor      draw a floor for him to walk on (default true)
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 *   pause      [min, max] idle seconds between walks (default [1.5, 5])
 */
(function (global) {
  'use strict';

  // 13 x 22 sprite, extracted from the SVG. One letter per pixel.
  var ROWS = [
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
    '.....sdd.....',
    '...kksdkkkkkk',
    '..kkbkkbkk...',
    '.kkbbkkbbkk..',
    '.kkbbkkbbkk..',
    '.kkbbkkbbkk..',
    '.kkbbkkbbkk..',
    '.ssrrrrrrss..',
    '.ssrrrrrrss..',   // hands are 2 px wide, like the arms
    '..rrrrrrrr...',
    '..rgr..rgr...'
  ];
  var COLORS = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', e: '#839392',
    p: '#E88989', k: '#000000', r: '#272828', g: '#636363', b: '#2F9FFF'
  };
  var W = 13, H = 22, PAD = 2;          // PAD: spare rows/cols for the bob
  var TOP = 7;                          // spare rows above the head, for the umbrella
  var CW = W + PAD * 2 + 2, CH = H + PAD + 2 + TOP;

  // Split the grid into parts so they can move independently.
  var parts = { head: [], body: [], hip: [], waist: [], armWaist: [], bar: [], armL: [], armR: [], trousers: [], handL: [], handR: [], legL: [], legR: [] };
  ROWS.forEach(function (row, y) {
    for (var x = 0; x < W; x++) {
      var c = row[x];
      if (c === '.') continue;
      var cell = { x: x, y: y, c: c };
      if (y <= 11) parts.head.push(cell);
      else if (y >= 18 && c === 's') (x < 6 ? parts.handL : parts.handR).push(cell);
      else if (y >= 20) {
        if (x >= 5 && x <= 6) parts.hip.push(cell);       // crotch stays put
        else (x < 6 ? parts.legL : parts.legR).push(cell);
      } else if (y >= 18) parts.trousers.push(cell);   // stays planted
      else {
        // The black stripes on the sides of the jacket are his arms.
        var armSide = c !== 'k' ? 0 :
          (y < 14 ? 0 : (x <= 2 ? -1 : (x >= 9 ? 1 : 0)));
        if (y === 12 && x >= 9) { parts.bar.push(cell); return; }   // 1-px bar sticking out at the shoulder
        if (armSide) (armSide < 0 ? parts.armL : parts.armR).push(cell);
        else parts.body.push(cell);
        if (y === 17) (armSide ? parts.armWaist : parts.waist).push(cell);  // static filler under the jacket
      }
    }
  });

  // Trousers under the hands, so nothing is missing when a hand swings up.
  parts.trousers.push({ x: 2, y: 19, c: 'r' }, { x: 9, y: 19, c: 'r' });

  function draw(ctx, st) {
    // st: {frame: 0..3 or -1 when standing, breathe: 0|1, blink: bool}
    ctx.clearRect(0, 0, CW, CH);
    ctx.save();
    ctx.translate(0, TOP);
    var f = st.frame;

    // Frames: 0 = left foot lifted, 1 = both down, 2 = right foot lifted,
    // 3 = both down. The body rises one pixel while a leg swings through
    // and settles on each footfall; hands swing opposite to the legs.
    var passing = f === 0 || f === 2;
    var bodyY = f < 0 ? -st.breathe : (passing ? -1 : 0);
    var lLift = f === 0, rLift = f === 2;
    var handLdy = f === 0 ? 1 : f === 2 ? -1 : 0;
    var handRdy = -handLdy;

    function put(list, dy) {
      list.forEach(function (p) {
        ctx.fillStyle = (st.blink && p.c === 'e') ? COLORS.s : COLORS[p.c];
        ctx.fillRect(PAD + p.x, PAD + p.y + dy, 1, 1);
      });
    }

    put(parts.legL, lLift ? -1 : 0);   // lifted foot leaves the ground
    put(parts.legR, rLift ? -1 : 0);
    put(parts.hip, 0);
    put(parts.trousers, 0);
    put(parts.waist, 0);              // keeps jacket joined to trousers when it bobs
    var pose = st.camera ? (st.pose || 0) : -1;   // -1 = no camera at all
    var armsDown = pose < 1;                      // arms are raised while he aims
    var um = !!st.umbrella;                       // right arm bent up, hand gripping the pole
    var ph = !!st.phone;                          // left arm up, phone at his ear
    if (armsDown) put(parts.armWaist.filter(function (p) { return !(um && p.x >= 6) && !(ph && p.x < 6); }), 0);
    put(parts.body, bodyY);
    var gest = ph && st.beat ? -2 : 0;            // the free hand gestures while he talks
    if (armsDown) {
      if (!ph) put(parts.armL, bodyY);
      put(um ? parts.armR.filter(function (p) { return p.y <= 14; }) : parts.armR, bodyY);
      put(parts.bar, bodyY);
      if (!ph) put(parts.handL, bodyY + handLdy);
      if (!um) put(parts.handR, bodyY + handRdy + (um ? 0 : gest));
    }
    put(parts.head, bodyY);
    if (ph) {
      if (st.beat) { ctx.fillStyle = '#8A3F2B'; ctx.fillRect(PAD + 4, PAD + 8 + bodyY, 2, 1); }   // mouth open
      // phone at the left ear, held by a hand with the arm bent up beside his head
      ctx.fillStyle = COLORS.k;
      ctx.fillRect(PAD - 2, PAD + 9 + bodyY, 2, 5);                 // forearm
      ctx.fillRect(PAD - 2, PAD + 13 + bodyY, 5, 2);                // shoulder / elbow
      ctx.fillStyle = '#2B2E38';
      ctx.fillRect(PAD - 2, PAD + 3 + bodyY, 2, 5);                 // the phone
      ctx.fillStyle = st.beat ? '#BFE3FF' : '#7FA8C9';
      ctx.fillRect(PAD - 1, PAD + 4 + bodyY, 1, 3);                 // screen edge, facing his ear
      ctx.fillStyle = COLORS.s;
      ctx.fillRect(PAD - 2, PAD + 7 + bodyY, 2, 2);                 // hand around the phone
    }

    if (pose >= 0) drawCamera(ctx, pose, bodyY, st.flash);

    if (um) {
      // Pole in front of him, from the tip down to his hand; the hand wraps round it.
      ctx.fillStyle = '#8A8F98';
      ctx.fillRect(PAD + 10, PAD - 7 + bodyY, 1, 22);
      ctx.fillStyle = COLORS.s;
      ctx.fillRect(PAD + 9, PAD + 14 + bodyY, 2, 3);          // hand, 2 px wide
      ctx.fillStyle = COLORS.k;
      ctx.fillRect(PAD + 9, PAD + 13 + bodyY, 2, 1);          // cuff
      // canopy
      var rowsU = [[8, 12], [6, 14], [4, 16], [3, 16], [3, 16]];
      rowsU.forEach(function (r, j) {
        for (var x = r[0]; x <= r[1]; x++) {
          ctx.fillStyle = (x % 4 < 2) ? '#E0674F' : '#F6D9A8';
          if (j === 4 && x % 2) continue;         // scalloped hem
          ctx.fillRect(PAD + x, PAD - 7 + j + bodyY, 1, 1);
        }
      });
    }
    ctx.restore();
  }

  // Camera on a strap. pose 0: hanging on the chest, 1: being lifted,
  // 2: held up to the face (hands + forearms visible).
  function drawCamera(ctx, pose, bodyY, flash) {
    function px(x, y, col) { ctx.fillStyle = col; ctx.fillRect(PAD + x, PAD + y, 1, 1); }
    function box(x0, y0, w, h, col) { ctx.fillStyle = col; ctx.fillRect(PAD + x0, PAD + y0, w, h); }
    var STRAP = '#8A5A3A', PLATE = '#E0E0E0', BODY = '#111111', RIM = '#8C8C8C',
        GLASS = '#3B6E9E', GLINT = '#CFE8FF';
    var x0, y0, w = 6, h = 4;
    if (pose === 0) { x0 = 3; y0 = 14 + bodyY; }
    else if (pose === 1) { x0 = 3; y0 = 10 + bodyY; }
    else { x0 = 2; y0 = 5 + bodyY; }

    if (pose === 0) { px(4, 13 + bodyY, STRAP); px(7, 13 + bodyY, STRAP); }  // strap up to the neck
    else if (pose === 1) {
      // Arms coming up: short forearms, hands at the sides of the camera.
      box(1, 13 + bodyY, 2, 2, COLORS.k); box(9, 13 + bodyY, 2, 2, COLORS.k);
      box(1, 11 + bodyY, 2, 2, COLORS.s); box(9, 11 + bodyY, 2, 2, COLORS.s);
    } else {
      // Elbows out, forearms vertical, hands gripping the camera.
      box(0, 8 + bodyY, 2, 7, COLORS.k); box(8, 8 + bodyY, 2, 7, COLORS.k);
      box(2, 13 + bodyY, 2, 2, COLORS.k);          // upper arm joining the shoulder: 2 px thick, not 1
      box(0, 6 + bodyY, 2, 2, COLORS.s); box(8, 6 + bodyY, 2, 2, COLORS.s);
    }
    // Black body with a light rim so it stands out against the black jacket.
    box(x0, y0, w, h, RIM);                        // outline
    box(x0, y0, w, 1, PLATE);                      // top plate with the shutter button
    box(x0 + 1, y0 + 1, w - 2, h - 2, BODY);
    box(x0 + 2, y0 + 1, 2, 2, GLASS);              // lens
    px(x0 + 2, y0 + 1, GLINT);
    px(x0 + w - 2, y0, '#E23B3B');                 // shutter button
    if (flash) {                                   // the flash going off
      var fx = x0 + w - 1, fy = y0 - 2;                       // starburst at the flash
      box(fx, fy, 2, 2, '#FFFFFF');
      px(fx - 2, fy, '#FFF3A8'); px(fx + 3, fy, '#FFF3A8'); px(fx, fy - 2, '#FFF3A8'); px(fx + 1, fy + 3, '#FFF3A8');
      px(fx - 1, fy - 1, '#FFF3A8'); px(fx + 2, fy - 1, '#FFF3A8'); px(fx - 1, fy + 2, '#FFF3A8'); px(fx + 2, fy + 2, '#FFF3A8');
    }
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function start(opts) {
    opts = opts || {};
    var scale = opts.scale || 5;
    var speed = opts.speed || 55;
    var floorOn = opts.floor !== false;
    var floorRows = opts.floorRows || 4;
    var floorH = floorOn ? floorRows * scale : 0;
    var camera = !!opts.camera;
    var photoEvery = opts.photoEvery || [8, 18];
    var pause = opts.pause || (opts.phone ? [2, 5] : [1, 3.5]);
    var host = opts.container || document.body;
    var fixed = host === document.body || host === document.documentElement;
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.dataset.avatarScene = '1';
    el.style.cssText = 'position:' + (fixed ? 'fixed' : 'absolute') +
      ';left:0;top:0;pointer-events:none;user-select:none;will-change:transform;z-index:' + (opts.zIndex || 50);
    var cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    cv.style.cssText = 'display:block;image-rendering:pixelated;image-rendering:crisp-edges;' +
      'width:' + CW * scale + 'px;height:' + CH * scale + 'px';
    var ctx = cv.getContext('2d');
    el.appendChild(cv);
    if (!fixed && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    (opts.mount || host).appendChild(el);

    var floorEl = null;
    if (floorOn && opts.floor !== 'external') {
      // One small pixel-art plank tile, repeated along the bottom edge.
      var TW = 16, t = document.createElement('canvas');
      t.width = TW; t.height = floorRows;
      var tc = t.getContext('2d');
      for (var r = 0; r < floorRows; r++) {
        tc.fillStyle = r === 0 ? '#B79F7E' : (r % 2 ? '#D8C7A8' : '#CDBB9A');
        tc.fillRect(0, r, TW, 1);
        if (r > 0) { tc.fillStyle = '#B79F7E'; tc.fillRect((r * 7) % TW, r, 1, 1); } // plank joints
      }
      floorEl = document.createElement('div');
      floorEl.setAttribute('aria-hidden', 'true');
      floorEl.style.cssText = 'position:' + (fixed ? 'fixed' : 'absolute') +
        ';left:0;right:0;bottom:0;pointer-events:none;image-rendering:pixelated;z-index:' + ((opts.zIndex || 50) - 1) +
        ';height:' + floorH + 'px;background:url(' + t.toDataURL() + ') 0 0/' + TW * scale + 'px ' + floorRows * scale + 'px repeat-x';
      (opts.mount || host).appendChild(floorEl);
    }

    var spriteW = CW * scale, spriteH = CH * scale;
    function bounds() {
      var w = fixed ? global.innerWidth : host.clientWidth;
      var h = fixed ? global.innerHeight : host.clientHeight;
      return { w: w, h: h, minX: -PAD * scale, maxX: w - (PAD + W + 2) * scale,
               baseY: h - (floorOn ? floorH - 2 * scale : 0) - (TOP + PAD + H) * scale };  // feet land mid-floor
    }

    var b = bounds();
    var x = rand(b.minX, b.maxX), y = b.baseY;
    var leaving = null;
    if (opts.enterFrom) {                  // walk in from outside the window
      x = opts.enterFrom === 'left' ? -CW * scale : b.w + 4;
      tx = x;
    }
    var tx = x, ty = y, dir = 1;
    var vel = 0;                       // current speed fraction 0..1
    var phase = 0;                     // walk cycle position, in cycles
    var cyclePx = 5 * 5 * (scale / 5); // distance per full cycle (2 steps)
    var idleLeft = rand(0.5, 1.5);
    var walking = false;
    if (opts.enterFrom) {                  // head for a spot inside the window
      tx = opts.enterFrom === 'left' ? b.minX + rand(150, 400) : b.maxX - rand(150, 400);
      ty = b.baseY; walking = true;
    }
    var blinkAt = rand(2, 4), blinkT = 0, clock = 0;
    var last = performance.now();
    var state = { frame: -1, breathe: 0, blink: false, camera: camera, pose: 0, flash: false, umbrella: !!opts.umbrella,
                  phone: !!opts.phone, talk: false, beat: false, t: 0 };
    var talking = false, talkSwitch = 1;
    var photoT = -1, nextPhoto = rand(photoEvery[0], photoEvery[1]) / 2, flashed = false;

    // The flash is local: the avatar and a halo round him light up for an instant. Nothing
    // covers the page, so text stays readable.
    function fireFlash() {
      cv.style.transition = 'none';
      cv.style.filter = 'brightness(1.7) drop-shadow(0 0 ' + Math.round(scale * 2.4) + 'px rgba(255,255,235,0.95))';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        cv.style.transition = 'filter .5s ease-out';
        cv.style.filter = 'none';
      }); });
    }

    // Photo timeline (seconds): lift, aim, click + flash, hold, lower.
    function photoPose(t) {
      if (t < 0.2) return 1;
      if (t < 1.4) return 2;
      if (t < 1.9) return 2;
      if (t < 2.1) return 1;
      return 0;
    }

    function pickTarget() {
      b = bounds();
      var nx;
      // Short hops (about 2-6 s of walking) so it stops often.
      var hop = rand(100, 320) * (Math.random() < 0.5 ? -1 : 1);
      nx = x + hop;
      if (nx < b.minX || nx > b.maxX) nx = x - hop;      // bounce off the edges
      nx = Math.max(b.minX, Math.min(b.maxX, nx));
      tx = nx;
      ty = b.baseY;
      walking = true;
    }

    function render() {
      y = bounds().baseY;                                   // follows window resizes
      el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      cv.style.transform = dir > 0 ? 'scaleX(-1)' : 'none'; // sprite faces left
      draw(ctx, state);
    }

    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;

      if (walking) {
        var dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy);
        // Ease in at the start, ease out when close to the target.
        var want = Math.min(1, dist / (speed * 0.6));
        vel += (Math.max(0.15, want) - vel) * Math.min(1, dt * 6);
        var step = Math.min(dist, speed * (state.phone ? 0.7 : 1) * vel * dt);
        if (dist < 1.5) {
          walking = false; vel = 0;
          idleLeft = rand(pause[0], pause[1]);
          if (leaving) { var done = leaving; leaving = null; done(); }
        } else {
          x += dx / dist * step; y += dy / dist * step;
          if (Math.abs(dx) > 4) dir = dx > 0 ? 1 : -1;
          phase += step / cyclePx;           // feet are tied to distance
        }
      } else {
        idleLeft -= dt;
        if (photoT >= 0) {
          photoT += dt;
          state.pose = photoPose(photoT);
          // shutter at 1.4 s
          state.flash = photoT >= 1.4 && photoT < 1.55;
          if (state.flash && !flashed) {
            flashed = true;
            fireFlash();
          }
          if (photoT >= 2.6) { photoT = -1; state.pose = 0; idleLeft = rand(0.6, 1.4); }
        } else if (idleLeft <= 0) {
          if (camera && !state.umbrella && !state.phone && clock >= nextPhoto) {
            photoT = 0; flashed = false;
            nextPhoto = clock + rand(photoEvery[0], photoEvery[1]);
          } else pickTarget();
        }
      }
      if (walking) { state.pose = 0; state.flash = false; photoT = -1; }

      // Phone call: talking in bursts, listening in between.
      state.t = clock;
      if (state.phone) {
        if (clock > talkSwitch) { talking = !talking; talkSwitch = clock + (talking ? 0.8 + Math.random() * 1.6 : 0.5 + Math.random() * 0.8); }
        state.talk = talking;
        state.beat = talking && Math.floor(clock / 0.17) % 2 === 0;
      }

      // Walk cycle: 4 frames per cycle.
      if (walking) state.frame = Math.floor((phase % 1) * 4);
      else { state.frame = -1; phase = Math.round(phase); }
      state.breathe = (!walking && photoT < 0 && Math.floor(clock * 1.2) % 2) ? 1 : 0;

      // Blink.
      if (clock > blinkAt) { blinkT = clock + 0.12; blinkAt = clock + rand(2.5, 5.5); }
      state.blink = clock < blinkT && photoT < 0;

      render();
      raf = requestAnimationFrame(tick);
    }

    var raf;
    if (reduced) { render(); }
    else { raf = requestAnimationFrame(function (t) { last = t; tick(t); }); }

    return {
      root: el,
      setDark: function () {},
      setUmbrella: function (u) { state.umbrella = !!u; },
      // Walk out of the window (towards the nearer edge); resolves when gone.
      leave: function () {
        return new Promise(function (resolve) {
          if (reduced) return resolve();
          b = bounds();
          photoT = -1; state.pose = 0; state.flash = false;
          tx = x > b.w / 2 ? b.w + CW * scale : -CW * scale * 2;
          ty = b.baseY; walking = true;
          leaving = resolve;
          setTimeout(function () { if (leaving) { leaving = null; resolve(); } }, 25000);
        });
      },
      stop: function () { cancelAnimationFrame(raf); el.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarWalker = { start: start, _draw: draw, _size: [CW, CH] };
})(window);
