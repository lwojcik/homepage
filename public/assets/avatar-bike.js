/*
 * avatar-bike.js — a pixel-art scene: the avatar cycling across the page.
 *
 *   - Wheels turn with the distance travelled, the legs follow the pedals.
 *   - He rides off one edge of the window, pauses out of sight, and comes
 *     back from the other side.
 *
 * Usage:
 *   <script src="assets/avatar-bike.js"></script>
 *   <script>AvatarBike.start();</script>
 *
 * Options (all optional):
 *   container  element to ride in (default: the viewport, fixed position)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   speed      CSS px per second (default 130)
 *   floor      draw the plank floor (default true); 'external' = the page
 *              draws it, only the geometry is used
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 *
 * Returns { root, setDark, leave(), stop() }; leave() resolves once he has
 * ridden out of sight.
 */
(function (global) {
  'use strict';

  var W = 30, H = 34, OFF = 0;              // OFF: extra headroom above the head
  var C = {
    a: '#82715B', s: '#FFBB99', h: '#6A5241', d: '#E2A286', e: '#839392',
    p: '#E88989', k: '#000000', r: '#272828', g: '#636363', b: '#2F9FFF',
    frame: '#D64545', frameDark: '#A83232', tire: '#272828', spoke: '#9AA0A8',
    saddle: '#3A3A40', farLeg: '#1B1C1C', crank: '#B9BEC6'
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

  // Geometry (sprite pixels, rider faces left).
  var REAR = { x: 23, y: 26 }, FRONT = { x: 7, y: 26 }, BB = { x: 15, y: 26 };
  var HIP = { x: 18, y: 20 }, SHOULDER = { x: 16, y: 14 }, BAR = { x: 8, y: 19 };
  var R = 5, CRANK = 3, THIGH = 5, SHIN = 5.5;   // small bike, short legs like his standing sprite (~4-6 px)

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(0, OFF);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function line(x0, y0, x1, y1, col, th) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i <= n; i++)
        box(x0 + (x1 - x0) * i / n - (th - 1) / 2, y0 + (y1 - y0) * i / n - (th - 1) / 2, th, th, col);
    }
    function wheel(c) {
      for (var a = 0; a < 8; a++) {                         // spokes
        var ang = st.wheel + a * Math.PI / 4;
        for (var r = 1; r < R; r++)
          box(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, 1, 1, C.spoke);
      }
      for (var d = 0; d < 360; d += 6) {                    // tire
        var t = d * Math.PI / 180;
        box(c.x + Math.cos(t) * R, c.y + Math.sin(t) * R, 1, 1, C.tire);
      }
      box(c.x, c.y, 1, 1, C.tire);
    }
    // Two-bone leg from hip to foot; the knee bends forward (to the left).
    function knee(foot) {
      var dx = foot.x - HIP.x, dy = foot.y - HIP.y, d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.01);
      var a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
      var h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
      var ux = dx / d, uy = dy / d;
      var k1 = { x: HIP.x + ux * a + uy * h, y: HIP.y + uy * a - ux * h };
      var k2 = { x: HIP.x + ux * a - uy * h, y: HIP.y + uy * a + ux * h };
      return k1.x < k2.x ? k1 : k2;
    }
    function leg(pedal, col, shoe) {
      var k = knee(pedal);
      line(HIP.x, HIP.y, k.x, k.y, col, 3);
      line(k.x, k.y, pedal.x, pedal.y - 1, col, 3);
      box(pedal.x - 2, pedal.y - 1, 4, 2, shoe);
      box(pedal.x - 2, pedal.y, 1, 1, C.g);
    }
    var pa = st.crank;
    var pedA = { x: BB.x + Math.cos(pa) * CRANK, y: BB.y + Math.sin(pa) * CRANK };
    var pedB = { x: BB.x - Math.cos(pa) * CRANK, y: BB.y - Math.sin(pa) * CRANK };

    // far side first
    line(BB.x, BB.y, pedB.x, pedB.y, C.crank, 1);
    leg(pedB, C.farLeg, C.farLeg);
    // wheels and frame
    wheel(REAR); wheel(FRONT);
    var seat = { x: 18, y: 21 }, head = { x: 9, y: 20 };
    line(BB.x, BB.y, REAR.x, REAR.y, C.frameDark, 1);          // chain stay
    line(seat.x, seat.y + 1, REAR.x, REAR.y, C.frameDark, 1);  // seat stay
    line(BB.x, BB.y, seat.x, seat.y, C.frame, 1);              // seat tube
    line(seat.x - 1, seat.y + 1, head.x, head.y, C.frame, 1);  // top tube
    line(BB.x, BB.y, head.x + 1, head.y + 1, C.frame, 1);      // down tube
    line(head.x, head.y, FRONT.x, FRONT.y, C.frameDark, 1);    // fork
    line(head.x, head.y, BAR.x, BAR.y - 1, C.frameDark, 1);    // stem
    box(BAR.x - 2, BAR.y - 2, 3, 1, C.r);                      // handlebar grip
    box(seat.x - 2, seat.y - 2, 5, 2, C.saddle);               // saddle

    // rider: torso leans forward
    var bob = Math.round(Math.sin(st.crank * 2) * 0.5 + 0.5);
    var rows = [[13, 13], [14, 13], [15, 14], [16, 14], [17, 15], [18, 15]];
    rows.forEach(function (r) {
      var y = r[0] + bob * 0, x0 = r[1] + 1;
      box(x0, y, 6, 1, C.k);
      box(x0, y, 2, 1, C.b);                                   // blue shirt at the front
    });
    box(16, 19, 6, 2, C.r);                                    // hips
    // head (neck lands on the shoulders)
    HEAD.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === '.') continue;
        box(9 + i, 1 + j, 1, 1, (st.blink && ch === 'e') ? C.s : C[ch]);
      }
    });
    // near leg and arm
    line(BB.x, BB.y, pedA.x, pedA.y, C.crank, 1);
    leg(pedA, C.r, C.r);
    line(SHOULDER.x + 1, SHOULDER.y + 1, BAR.x + 1, BAR.y, C.k, 2);   // arm: 2 px thick
    box(BAR.x - 1, BAR.y - 1, 2, 2, C.s);                      // hand on the grip
    ctx.restore();
  }

  function start(opts) {
    opts = opts || {};
    var scale = opts.scale || 5;
    var speed = opts.speed || 130;
    var floorOn = opts.floor !== false;
    var floorRows = opts.floorRows || 4;
    var floorH = floorOn ? floorRows * scale : 0;
    var host = opts.container || document.body;
    var fixed = host === document.body || host === document.documentElement;
    var z = opts.zIndex || 50;
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pos = fixed ? 'fixed' : 'absolute';
    if (!fixed && getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.dataset.avatarScene = '1';
    el.style.cssText = 'position:' + pos + ';left:0;top:0;pointer-events:none;user-select:none;will-change:transform;z-index:' + z;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.style.cssText = 'display:block;image-rendering:pixelated;image-rendering:crisp-edges;width:' +
      W * scale + 'px;height:' + H * scale + 'px';
    el.appendChild(cv);
    (opts.mount || host).appendChild(el);
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

    var spriteW = W * scale;
    function vw() { return fixed ? global.innerWidth : host.clientWidth; }
    function vh() { return fixed ? global.innerHeight : host.clientHeight; }
    // feet (wheel bottoms, sprite row 31 + OFF) should sit 2 rows into the floor
    function top() { return vh() - (floorOn ? floorH - 2 * scale : 0) - (OFF + 32) * scale; }

    var dir = 1, x = -spriteW - 20, dist = 0, hidden = 0;
    var leaving = null, clock = 0, blinkAt = 2, blinkUntil = 0;
    var st = { dark: !!opts.dark, wheel: 0, crank: 0, blink: false };
    var last = performance.now(), raf;

    function render() {
      el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(top()) + 'px)';
      cv.style.transform = dir > 0 ? 'scaleX(-1)' : 'none';       // sprite faces left
      // The sprite faces left, so wheels and cranks turn counter-clockwise on screen
      // (canvas angles grow clockwise, hence the minus); mirroring flips it for the other direction.
      st.wheel = -(dist / (R * scale));                            // rolling without slipping
      st.crank = st.wheel * 0.9;
      draw(ctx, st);
    }

    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; clock += dt;
      if (hidden > 0) {
        hidden -= dt;
        if (hidden <= 0) {                       // come back from the opposite side
          dir = -dir;
          x = dir > 0 ? -spriteW - 20 : vw() + 20;
        }
      } else {
        var step = speed * dt;
        x += dir * step; dist += step;
        var gone = dir > 0 ? x > vw() + 20 : x < -spriteW - 20;
        if (gone) {
          if (leaving) { var done = leaving; leaving = null; done(); hidden = 1e9; }
          else hidden = 2 + Math.random() * 5;
        }
      }
      if (clock > blinkAt) { blinkUntil = clock + 0.12; blinkAt = clock + 2 + Math.random() * 4; }
      st.blink = clock < blinkUntil;
      render();
      raf = requestAnimationFrame(tick);
    }
    if (reduced) { x = vw() / 2; render(); }
    else raf = requestAnimationFrame(function (t0) { last = t0; tick(t0); });

    return {
      root: el,
      setDark: function (d) { st.dark = !!d; },
      leave: function () {
        return new Promise(function (resolve) {
          if (hidden > 0 || reduced) return resolve();
          leaving = resolve;
          setTimeout(function () { if (leaving) { leaving = null; resolve(); } }, 20000);
        });
      },
      stop: function () { cancelAnimationFrame(raf); el.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarBike = { start: start, _draw: draw, _size: [W, H] };
})(window);
