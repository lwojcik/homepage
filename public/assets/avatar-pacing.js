/*
 * avatar-pacing.js — a pixel-art scene: the avatar pacing around the living room
 * while he talks on the phone. Sofa, coffee table with a mug, a floor lamp.
 *
 * It uses the walking avatar from avatar-walker.js (phone at his ear, mouth moving,
 * the free hand gesturing) and keeps him inside the room.
 *
 * Usage:
 *   <script src="assets/avatar-walker.js"></script>
 *   <script src="assets/avatar-pacing.js"></script>
 *   <script>AvatarPacing.start();</script>
 *
 * Options (all optional):
 *   position   'right' (default) or 'left'
 *   edge       gap to the side of the window in px (default 24)
 *   scale      CSS pixels per sprite pixel (default 5)
 *   floor      draw the plank floor (default true); 'external' = the page
 *              draws it, only the geometry is used
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   zIndex     default 50
 */
(function (global) {
  'use strict';

  var W = 40, H = 34;                 // backdrop size (same as the other room scenes)
  var ROOM_W = 54;                    // width of the room he paces in
  var C = {
    sofa: '#4F7F8C', sofaDark: '#3E6773', sofaLight: '#6597A5', sofaLeg: '#2B2F36',
    wood: '#8E6B43', woodTop: '#A47C52',
    lampPole: '#3A3A40', shade: '#E8C97A', shadeDark: '#C9A55A',
    mug: '#E0674F', mugRim: '#B84A35', rug: '#C9694A', rugDark: '#A8503A', rugLight: '#E3A98B'
  };

  function drawRoom(ctx) {
    ctx.clearRect(0, 0, W, H);
    function box(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
    // sofa against the back wall, seen from the front
    box(20, 12, 19, 9, C.sofaDark);                           // back
    box(19, 17, 3, 12, C.sofa); box(37, 17, 3, 12, C.sofa);    // arms
    box(19, 17, 3, 1, C.sofaLight); box(37, 17, 3, 1, C.sofaLight);
    box(22, 20, 15, 9, C.sofa);                                // seat
    box(22, 20, 15, 1, C.sofaLight);
    box(29, 21, 1, 8, C.sofaDark);                             // seam between the cushions
    box(20, 29, 19, 1, C.sofaDark);
    box(21, 30, 2, 2, C.sofaLeg); box(36, 30, 2, 2, C.sofaLeg);
    // floor lamp
    box(5, 13, 2, 19, C.lampPole);
    box(3, 31, 6, 1, C.lampPole);
    [[5, 6], [4, 7], [3, 8], [3, 8]].forEach(function (r, j) {
      box(r[0], 9 + j, r[1] - r[0] + 1, 1, j === 3 ? C.shadeDark : C.shade);
    });
    // coffee table with a mug
    box(10, 27, 8, 2, C.wood); box(10, 27, 8, 1, C.woodTop);
    box(11, 29, 2, 3, C.wood); box(15, 29, 2, 3, C.wood);
    box(12, 24, 3, 3, C.mug); box(12, 24, 3, 1, C.mugRim); ctx.fillRect(15, 25, 1, 1);
    // warm lamplight over everything already drawn
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,205,120,0.10)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function start(opts) {
    opts = opts || {};
    if (!global.AvatarWalker) throw new Error('avatar-pacing.js needs avatar-walker.js');
    var scale = opts.scale || 5;
    var edge = opts.edge == null ? 24 : opts.edge;
    var left = opts.position === 'left';
    var floorOn = opts.floor !== false;
    var floorRows = opts.floorRows || 4;
    var floorH = floorOn ? floorRows * scale : 0;
    var z = opts.zIndex || 50;

    // The room: one box that reaches down to the bottom of the page, so the walker's
    // feet land where they do in the other scenes.
    var room = document.createElement('div');
    room.setAttribute('aria-hidden', 'true');
    room.dataset.avatarScene = '1';
    room.style.cssText = 'position:fixed;bottom:0;' + (left ? 'left:' : 'right:') + edge + 'px;' +
      'width:' + ROOM_W * scale + 'px;height:' + (H * scale + floorH - 4 * scale) + 'px;pointer-events:none;' +
      'user-select:none;z-index:' + z;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;bottom:' + (floorH - 4 * scale) + 'px;' +
      (left ? 'left:0;transform:scaleX(-1)' : 'right:0') + ';width:' + W * scale + 'px;height:' + H * scale + 'px;' +
      'image-rendering:pixelated;image-rendering:crisp-edges';
    room.appendChild(cv);
    (opts.mount || document.body).appendChild(room);
    drawRoom(cv.getContext('2d'));

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
      floorEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;pointer-events:none;' +
        'image-rendering:pixelated;z-index:' + (z - 1) + ';height:' + floorH + 'px;background:url(' +
        t.toDataURL() + ') 0 0/' + TW * scale + 'px ' + floorRows * scale + 'px repeat-x';
      (opts.mount || document.body).appendChild(floorEl);
    }

    // The walking avatar, inside the room box. Slow, short hops: he paces.
    var walker = global.AvatarWalker.start({
      container: room, phone: true, scale: scale, speed: 38, floor: 'external', floorRows: floorRows,
      zIndex: 1, pause: [0.6, 1.6]
    });

    return {
      root: room,
      setDark: function () {},
      stop: function () { walker.stop(); room.remove(); if (floorEl) floorEl.remove(); }
    };
  }

  global.AvatarPacing = { start: start, _drawRoom: drawRoom, _size: [W, H] };
})(window);
