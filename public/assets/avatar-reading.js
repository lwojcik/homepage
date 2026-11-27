/*
 * avatar-reading.js — a pixel-art scene: the avatar reading a book in an
 * armchair, next to a floor lamp and a bookshelf (with one gap where the
 * book came from). He faces us and holds the book open, so we see it from behind:
 * the two back covers, the spine in the middle and the pages peeking over the top.
 * He is reading it, not showing it.
 *
 *   - Head bent over the book, now and then a glance up; he breathes slowly.
 *   - Every few seconds his right hand lifts to turn a page.
 *   - The lamp is switched on when it is dark (night): it glows warmly, flickers a little
 *     and lights the room. In daytime it is off.
 *
 * Usage:
 *   <script src="assets/avatar-reading.js"></script>
 *   <script>AvatarReading.start();</script>
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
    wood: '#8E6B43', woodDark: '#6E5233',
    chair: '#B87049', chairTop: '#CE8A5E', chairDark: '#7A4A32', chairLeg: '#3A2A20',
    lampPole: '#3A3A40', shade: '#E8C97A', shadeDark: '#C9A55A',
    cover: '#3F6F5B', coverSpine: '#2D5242', gold: '#D9B45A', pages: '#F6EBD0'
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
  // His own sprite (13 x 22), as in the other scenes; the front view is used here.
  var ROWS = [
    '...ahahah....','..hahhahhah..','.hahhhahahah.','.asssssshhhha','hsssssssshah.',
    'asesssseshhh.','asssdsssshhh.','.ppsssspphss.','..sddddsshds.','...ssssss....',
    '....sssdd....','.....sdd.....','...kksdkkkkkk','..kkbkkbkk...','.kkbbkkbbkk..',
    '.kkbbkkbbkk..','.kkbbkkbbkk..','.kkbbkkbbkk..','.ssrrrrrrss..','.ssrrrrrrss..',
    '..rrrrrrrr...','..rgr..rgr...'
  ];
  var BOOKS = ['#B5443A', '#3F7CAC', '#E0A33A', '#4F8F5B', '#7A4E9A', '#D9D0BC', '#C9694A', '#2F5D7C'];
  var CYCLE = 7;                              // seconds per page

  function draw(ctx, st) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function px(x, y, col) { box(x, y, 1, 1, col); }
    function thick(x0, y0, x1, y1, col) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (var i = 0; i <= n; i++) box(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 2, 2, col);
    }

    // ---- bookshelf ----
    box(1, 9, 13, 23, C.wood);
    [[10, 5], [16, 5], [22, 5], [28, 3]].forEach(function (row, r) {
      box(2, row[0], 11, row[1], C.woodDark);                 // dark back panel
      var x = 2, i = r * 3;
      while (x < 13) {
        var w = 1 + ((i * 7) % 3 === 0 ? 1 : 0), h = row[1] - ((i * 5) % 3 === 0 ? 1 : 0);
        if (r === 1 && x >= 8 && x < 10) { x += 2; i++; continue; }   // the gap where his book was
        if (x + w > 13) break;
        box(x, row[0] + row[1] - h, w, h, BOOKS[(i * 3 + r) % BOOKS.length]);
        x += w; i++;
      }
    });
    box(2, 15, 11, 1, C.wood); box(2, 21, 11, 1, C.wood); box(2, 27, 11, 1, C.wood);

    // ---- floor lamp ----
    box(17, 13, 2, 17, C.lampPole);
    box(15, 30, 6, 2, C.lampPole);
    var lampOn = !!st.dark;                                   // the lamp is on when it is dark outside
    [[16, 19], [15, 20], [14, 21], [14, 21]].forEach(function (r, j) {
      box(r[0], 9 + j, r[1] - r[0] + 1, 1, lampOn ? (j === 3 ? '#FFD36B' : '#FFEFB0') : (j === 3 ? '#A89D78' : '#C9BE96'));
    });
    if (lampOn) {                                             // a warm pool of light under the shade
      var glow = 0.13 + 0.015 * Math.sin(st.t * 5.3);
      for (var gy = 13; gy <= 29; gy++) {
        var half = 3 + (gy - 13) * 0.5;
        ctx.fillStyle = 'rgba(255,180,80,' + (glow * (1 - (gy - 13) / 20)).toFixed(3) + ')';
        ctx.fillRect(Math.round(17.5 - half), gy, Math.round(half * 2), 1);
      }
      ctx.fillStyle = 'rgba(255,190,90,' + (glow * 1.2).toFixed(3) + ')';
      ctx.fillRect(13, 8, 10, 1); ctx.fillRect(12, 9, 12, 5);   // glow round the shade
    }

    // ---- armchair, seen from the front ----
    box(22, 7, 17, 24, C.chairDark);                          // high back
    box(23, 8, 15, 14, C.chair);                              // back cushion
    box(23, 8, 15, 1, C.chairTop);
    box(22, 22, 3, 9, C.chair); box(22, 22, 3, 1, C.chairTop);        // armrests
    box(36, 22, 3, 9, C.chair); box(36, 22, 3, 1, C.chairTop);
    box(25, 27, 11, 4, C.chairDark); box(25, 27, 11, 1, C.chairTop);  // seat
    box(22, 31, 2, 1, C.chairLeg); box(37, 31, 2, 1, C.chairLeg);

    // ---- avatar, front view: his own sprite, sitting, with a book ----
    var X0 = 25, Y0 = 8;                                      // raised 2 rows: room for longer, bent legs
    var breathe = Math.floor(st.t / 1.4) % 2;                 // slow breathing
    var dy = st.glance ? 0 : 1;                               // head bent over the book
    ROWS.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === '.') continue;
        if (y <= 11) {                                        // head: bent down while reading
          if (ch === 'e' && !st.glance) { px(X0 + x, Y0 + y + dy, C.s); continue; }   // eyes are behind the book (no stray pixel at its edge)
          px(X0 + x, Y0 + y + dy, (st.blink && ch === 'e') ? C.s : C[ch]);
          continue;
        }
        if (y === 12 && x >= 9) continue;                     // the bar sticking out at the shoulder
        if (y >= 14 && y <= 17 && (x <= 2 || x >= 9)) continue;   // arms are drawn below
        if (y >= 18 && ch === 's') continue;                  // hands are drawn below
        // shorter body: torso rows 16-17 are left out, the hips move up 2 rows, the feet stay at the floor
        if (y === 16 || y === 17) continue;
        px(X0 + x, Y0 + (y >= 21 ? 23 : y >= 18 ? y - 2 : y), C[ch]);
      }
    });
    // shins between the knees (row 20) and the feet: longer legs, so he clearly sits
    box(X0 + 2, Y0 + 19, 3, 4, C.r); box(X0 + 7, Y0 + 19, 3, 4, C.r);
    box(X0 + 2, Y0 + 18, 8, 1, '#35363D');                    // knees, a touch lighter

    // The book is held up in front of his face: it is big and sits a bit to the left, so
    // it covers his eyes and most of his face; only forehead and hair show above it
    // (it is lowered when he glances up).
    var by = Y0 + dy + (st.glance ? 8 : 5) + breathe;         // top of the spine
    var handY = by + 4;
    // (no sleeves drawn: his arms are hidden behind the book and the hands grip its edges)

    // ---- the book, held open: seen from behind, so it is the two back covers meeting
    // at the spine, with the pages peeking over the top. He reads it, not shows it. ----
    box(X0 - 1, by + 1, 7, 7, C.cover);                       // left cover
    box(X0 + 7, by + 1, 6, 7, C.cover);                       // right cover (14 px wide in all)
    box(X0 + 6, by, 1, 8, C.coverSpine);                      // spine, in the middle
    box(X0, by, 6, 1, C.pages); box(X0 + 7, by, 5, 1, C.pages);   // page blocks over the covers
    box(X0 - 1, by + 7, 7, 1, C.coverSpine); box(X0 + 7, by + 7, 6, 1, C.coverSpine);   // lower edge in shade
    box(X0 + 8, by + 3, 4, 1, C.gold);                        // title, on the right cover only
    box(X0 + 9, by + 5, 2, 1, C.gold);
    // hands on the outer edges; the right one turns a page now and then
    var flipT = st.flip, lift = flipT >= 0 ? Math.round(Math.sin(flipT * Math.PI) * 4) : 0;
    box(X0 - 2, by + 4, 2, 2, C.s);                           // left hand
    box(X0 + 12, by + 4 - lift, 2, 2, C.s);                   // right hand
    if (lift) box(X0 + 12, by + 6 - lift, 2, lift, C.k);      // forearm follows the lifted hand

    // ---- warm lamplight ----
    if (lampOn) {                                             // lamp on: the room is lit warmly
      var flick = 0.16 + 0.015 * Math.sin(st.t * 5.3);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,205,120,' + flick + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
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

    var st = { dark: !!opts.dark, t: 0, blink: false, glance: false, flip: -1, page: 0 };
    var raf, t0 = performance.now(), blinkAt = 2.5, blinkUntil = 0, glanceAt = 8, glanceUntil = 0;
    function update(t) {
      st.t = t;
      var c = t % CYCLE;
      st.page = Math.floor(t / CYCLE);
      st.flip = (c > 5.4 && c < 5.9) ? (c - 5.4) / 0.5 : -1;
      if (t > glanceAt) { glanceUntil = t + 0.9; glanceAt = t + 7 + Math.random() * 6; }
      st.glance = t < glanceUntil;
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

  global.AvatarReading = { start: start, _draw: draw, _size: [W, H] };
})(window);
