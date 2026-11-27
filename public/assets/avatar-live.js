/*
 * avatar-live.js — runs the right avatar scene for the time of day.
 *
 *   <script src="assets/avatar-live.js"></script>
 *   <script>AvatarLive.start({ timezone: 'Europe/Warsaw', lat: 52.23, lon: 21.01 });</script>
 *
 * What it does
 *   - Picks a scene from a weekday / weekend schedule, in YOUR time zone
 *     (not the visitor's), and switches when the schedule changes.
 *   - Rare scenes: some nights he is awake in bed, scrolling his phone; some evenings
 *     he spends the walk, or the evening on the sofa, on the phone.
 *   - Weather (Open-Meteo, no key): rain, snow, storms and fog fall in the
 *     background; outdoors he carries an umbrella; he skips cycling in bad weather.
 *   - Indoors the sky and weather appear only through a window above him; outdoors
 *     (walking, cycling) the whole page shows them.
 *   - A pixel sky behind the page (outdoor scenes): gradient, sun / moon, stars and clouds follow
 *     the time of day (the sun follows today's sunrise and sunset, high in summer, low in
 *     winter). In clear weather, near sunrise and sunset, everything takes on a warm golden-hour
 *     tint. Scenes dim at dusk and night.
 *   - Smooth transitions: walkers and cyclists leave the window first, seated
 *     scenes cross-fade.
 *   - The page can react: <html data-avatar-time="day|dusk|night"> and the CSS
 *     variables --avatar-ink (text colour that reads on the sky), --avatar-sky-bg and
 *     --avatar-scene-h (the height the scene needs at the bottom: use it as padding-bottom
 *     so content never sits under the scene) and --avatar-card (a semi-transparent panel colour: give your text blocks
 *     `background: var(--avatar-card); backdrop-filter: blur(6px)` to keep them legible).
 *   - No flash on load: the page fades in once, when the first scene and the fonts are ready.
 *     Put this in <head> (see avatar-live.html) so a refresh never flashes light before dark:
 *       html:not(.avatar-ready) body { opacity: 0 }  +  a tiny script that restores the last
 *       theme colours from localStorage ('avatar-live-theme').
 *   - Hover him for a tooltip ("Working - until 12:00"); click him for a reaction.
 *   - Debug panel: open the page with ?debug (or press the ` key).
 *
 * URL parameters (all optional, for testing):
 *   ?debug            open the debug panel (on a phone: tap the avatar five times in a row,
 *                     or use ?debugbtn / the debugButton option for a small corner button)
 *   ?debugbtn         show a small button in the corner that opens the debug panel
 *   ?scene=desk       force a scene: sleep phone breakfast desk lunch walk
 *                     dinner bike gaming tv reading laptop coffee call callin
 *   ?time=14:30       pretend it is this time (your time zone)
 *   ?date=2026-06-21  pretend it is this date (also MM-DD): sunrise, sunset and the sun's
 *                     height follow that date, and so does the weekday unless ?day= is given
 *   ?day=sat          pretend it is this weekday (mon..sun)
 *   ?weather=rain     clear cloudy rain snow storm fog
 *   ?rare=1           force (1) or forbid (0) the rare night scene
 *   ?call=1           force (1) or forbid (0) the rare phone-call walk
 *   ?nap=1            force (1) or forbid (0) the rare afternoon nap
 *   ?timelapse=600    run the clock this many times faster than real time
 *
 * Options for start():
 *   timezone   IANA zone of the page owner (default 'Europe/Warsaw')
 *   lat, lon   location for the weather and sunrise / sunset
 *   base       folder with the avatar-*.js files (default: next to this file)
 *   scale      CSS px per sprite pixel on big screens (default 5); smaller screens get 4, 3 or 2
 *              automatically, and the scene is redrawn when the window is resized
 *   edge       gap to the window edge for the seated scenes (default 24)
 *   position   'right' (default) or 'left' for the seated scenes
 *   floorRows  floor thickness in sprite pixels (default 4)
 *   sky        draw the pixel sky behind the page (default true)
 *   skyIntensity  0..1, how strongly the sky shows through (default 0.28; it is
 *              blended into a calm page colour so text stays legible)
 *   weatherIntensity  0..1, amount and strength of rain / snow (default 0.6)
 *   window     draw the window above him in indoor scenes (default true)
 *   avoid      CSS selector of the content the window must never overlap; it fades out when
 *              it would (default 'main, [data-avatar-avoid]')
 *   weather    use real weather (default true)
 *   weatherUrl where the weather comes from (default: Open-Meteo directly). Point it at your own address (e.g. '/api/weather') and
 *              proxy that to https://api.open-meteo.com/v1/forecast, so visitors never contact Open-Meteo themselves.
 *   weatherQuery  true (default): the page adds latitude, longitude... to weatherUrl. false: weatherUrl is called exactly as it is, because
 *              the proxy already holds the full address (the location is then fixed on the server, not by the page).
 *   debug      show the debug panel (default: only with ?debug)
 *   debugButton  show a small corner button that toggles the debug panel (default false)
 *   zIndex     base z-index of the scenes (default 50)
 */
(function (global) {
  'use strict';

  var CUR = document.currentScript && document.currentScript.src;
  var DEFAULT_BASE = CUR ? CUR.slice(0, CUR.lastIndexOf('/') + 1) : 'assets/';

  // ---------------------------------------------------------------- scenes
  var SCENES = {
    sleep:     { script: 'avatar-bed.js',    g: 'AvatarBed',    opts: { variant: 'sleep' },  label: 'Asleep',                        poke: 'Zzz...' },
    phone:     { script: 'avatar-bed.js',    g: 'AvatarBed',    opts: { variant: 'phone' },  label: 'Awake, scrolling his phone',    poke: '...five more minutes.' },
    breakfast: { script: 'avatar-dinner.js', g: 'AvatarDinner', opts: { variant: 'breakfast' },                   label: 'Having breakfast',              poke: 'Mmph. (chewing)' },
    desk:      { script: 'avatar-desk.js',   g: 'AvatarDesk',   opts: {},                   label: 'Working',                       poke: "Shh, I'm compiling." },
    coffee:    { script: 'avatar-dinner.js', g: 'AvatarDinner', opts: { variant: 'coffee' }, label: 'Having a coffee break', poke: "Don't talk to me before the second cup." },
    lunch:     { script: 'avatar-dinner.js', g: 'AvatarDinner', opts: { variant: 'lunch' },                   label: 'Having lunch',                  poke: 'Mmph. (chewing)' },
    callin:    { script: 'avatar-pacing.js', g: 'AvatarPacing', opts: {}, needs: [{ script: 'avatar-walker.js', g: 'AvatarWalker' }],
                 label: 'Pacing around, on the phone',   poke: 'Hold on... it is a call.' },
    call:      { script: 'avatar-walker.js', g: 'AvatarWalker', opts: { phone: true },       label: 'Out for a walk, on the phone',  poke: "Yes, yes... I'm listening!", outdoor: true, roams: true },
    walk:      { script: 'avatar-walker.js', g: 'AvatarWalker', opts: { camera: true },      label: 'Out on a photo walk',           poke: 'Say cheese!', outdoor: true, roams: true },
    dinner:    { script: 'avatar-dinner.js', g: 'AvatarDinner', opts: { variant: 'dinner' },                   label: 'Having dinner',                 poke: 'Mmph. (chewing)' },
    bike:      { script: 'avatar-bike.js',   g: 'AvatarBike',   opts: {},                   label: 'Out cycling',                   poke: 'On your left!', outdoor: true, roams: true },
    gaming:    { script: 'avatar-couch.js',  g: 'AvatarCouch',  opts: { variant: 'gaming' }, label: 'Playing video games',           poke: 'Not now, boss fight!' },
    tv:        { script: 'avatar-couch.js',  g: 'AvatarCouch',  opts: { variant: 'tv' },     label: 'Watching TV',                   poke: 'Shh, this is the good part.' },
    reading:   { script: 'avatar-reading.js', g: 'AvatarReading', opts: {},                  label: 'Reading a book',                poke: 'Shh... chapter twelve.' },
    laptop:    { script: 'avatar-laptop.js',  g: 'AvatarLaptop',  opts: {},                  label: 'Browsing on his laptop',        poke: 'Just five more tabs.' },
    // A rare afternoon nap: dozing on the sofa in daylight, not in bed (see the nap rule in the schedule).
    nap:       { script: 'avatar-couch.js',  g: 'AvatarCouch',  opts: { variant: 'nap' },    label: 'Taking a nap',                poke: 'Shh... power nap.' },
    // A night out: he is never shown, only what he left behind. First the empty room (he has just gone), then his bike outside a bar.
    outroom:   { script: 'avatar-outroom.js',  g: 'AvatarOutRoom',  opts: {}, label: 'Out for the evening',                 poke: 'Not home. Ask the city.' },
    outvenue:  { script: 'avatar-outvenue.js', g: 'AvatarOutVenue', opts: {}, label: 'Out somewhere in the city',            poke: 'Not telling where.', outdoor: true }
  };
  var SCENE_IDS = Object.keys(SCENES);

  // ------------------------------------------------------------- schedule
  // Minutes since midnight. 0 = Monday ... 6 = Sunday.
  var WEEKDAY = [
    [0, 360, 'night'], [360, 420, 'breakfast'], [420, 630, 'desk'], [630, 645, 'coffee'], [645, 720, 'desk'],
    [720, 750, 'lunch'], [750, 840, 'desk'], [840, 855, 'coffee'], [855, 960, 'desk'], [960, 1170, 'walk'], [1170, 1230, 'dinner'], [1230, 1320, 'lounge'],
    [1320, 1440, 'night']
  ];
  var WEEKEND = [
    [0, 360, 'night'], [360, 420, 'breakfast'], [420, 630, 'lounge'], [630, 645, 'coffee'], [645, 780, 'outing'], [780, 840, 'lunch'],
    [840, 855, 'coffee'], [855, 1050, 'lounge'], [1050, 1140, 'walk'], [1140, 1200, 'dinner'], [1200, 1320, 'lounge'],
    [1320, 1440, 'night']
  ];
  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // A night out: how likely each evening is (Mon..Sun), decided from the week and the day so it varies from week to week. Mostly Friday and Saturday,
  // now and then Thursday, rarely otherwise: one kind of evening among several, never the main one.
  var NIGHT_OUT = [0.03, 0.04, 0.06, 0.15, 0.50, 0.50, 0.08];
  function chance(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function nightOut(dow, week) { return chance(week * 7 + dow + 0.5) < NIGHT_OUT[dow]; }
  // ...and now and then by day: a weekend afternoon in the city, or drinks after work on a Friday (still in the light for half the year).
  var DAY_OUT = { 4: 0.20, 5: 0.22, 6: 0.18 };
  function dayOut(dow, week) { return (DAY_OUT[dow] || 0) > chance(week * 7 + dow + 0.25); }
  // Which scene is on at (dow, minute)? ctx: { weather, rare, call, week }
  function resolve(dow, min, ctx) {
    var table = dow >= 5 ? WEEKEND : WEEKDAY, row = table[0], week = ctx.week || 0;
    for (var i = 0; i < table.length; i++) if (min >= table[i][0] && min < table[i][1]) { row = table[i]; break; }
    var kind = row[2], seed = (dow * 7 + Math.floor(row[0] / 60) + week * 3) % 4;   // the evening / weekend pick changes from week to week
    var bad = ctx.weather === 'rain' || ctx.weather === 'storm' || ctx.weather === 'snow';
    if (kind === 'walk' && ctx.call) return 'call';          // rare: he spends the walk on the phone
    if (kind === 'lounge' && ctx.call) return 'callin';      // ...or the evening on the sofa
    // rare: an afternoon nap: an hour after work on a weekday (17:00 - 18:00), or after lunch at the weekend (14:15 - 15:30)
    // (never before 14:00, whatever the slots around it are)
    if (ctx.nap && min >= 840 && ((kind === 'walk' && dow < 5 && min >= 1020 && min < 1080) || (kind === 'lounge' && dow >= 5 && min >= 855 && min < 930))) return 'nap';
    if (kind === 'lounge' && dow >= 5 && min >= 900 && min < 1050 && dayOut(dow, week)) return 'outvenue';   // a weekend afternoon in the city (15:00 - 17:30)
    if (kind === 'walk' && dow === 4 && min >= 1020 && dayOut(dow, week)) return 'outvenue';                          // Friday after work
    if (kind === 'lounge' && min >= 1200 && nightOut(dow, week)) return min < row[0] + 75 ? 'outroom' : 'outvenue';   // he has just left; later he is out
    if (kind === 'night' && ((min >= 1320 && nightOut(dow, week)) || (min < 90 && nightOut((dow + 6) % 7, dow === 0 ? week - 1 : week)))) return 'outvenue';   // out until 01:30
    if (kind === 'night') {
      var late = min >= 1380 || min < 240;                   // 23:00 - 04:00
      return (ctx.rare && late) ? 'phone' : 'sleep';
    }
    if (kind === 'outing') return bad ? ['reading', 'gaming', 'laptop', 'tv'][seed] : ['bike', 'walk', 'bike', 'walk'][seed];   // rainy day: stay in; otherwise a ride or a photo walk
    if (kind === 'lounge') return ['tv', 'gaming', 'reading', 'laptop'][seed];
    return kind;
  }
  // When does the scene change next? (minutes ahead, or null)
  function nextChange(dow, min, ctx) {
    var cur = resolve(dow, min, ctx);
    for (var m = 1; m <= 1440; m++) {
      var t = Math.floor(min) + m, d = (dow + Math.floor(t / 1440)) % 7;
      if (resolve(d, t % 1440, ctx) !== cur) return t % 1440;
    }
    return null;
  }
  function hhmm(min) {
    return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + Math.floor(min % 60)).slice(-2);
  }

  // ----------------------------------------------------------------- sky
  var SKY = [  // hour, top, bottom
    [0, '#14110F', '#26211D'], [5, '#18140F', '#332A26'], [6.5, '#4A5A8C', '#F4A97B'],
    [8, '#7FB8E8', '#D6EAF7'], [12, '#5BA3E0', '#C4E3F6'], [16, '#6FB0E3', '#F7E3B0'],
    [17.5, '#5878B8', '#F6B07A'], [19, '#3F4A88', '#EE8A66'], [20.5, '#2A2430', '#5A4A5E'], [22, '#14110F', '#26211D'], [24, '#14110F', '#26211D']
  ];
  function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  // The keys above are for a day with sunrise at 6:30 and sunset at 19:00. Stretch or squeeze
  // the real day onto them, so the sky always reaches its sunset colours AT sunset and gets
  // gradually darker on the way there, in winter and in summer alike.
  function skyHour(hour, rise, set) {
    if (hour <= rise) return hour / rise * 6.5;
    if (hour <= set) return 6.5 + (hour - rise) / (set - rise) * 12.5;
    return Math.min(24, 19 + (hour - set) / (24 - set) * 5);
  }
  function skyColors(hour) {
    for (var i = 0; i < SKY.length - 1; i++) {
      if (hour >= SKY[i][0] && hour <= SKY[i + 1][0]) {
        var u = (hour - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
        var a = hex(SKY[i][1]), b = hex(SKY[i + 1][1]), c = hex(SKY[i][2]), d = hex(SKY[i + 1][2]);
        return { top: a.map(function (v, k) { return lerp(v, b[k], u); }), bot: c.map(function (v, k) { return lerp(v, d[k], u); }) };
      }
    }
    return { top: hex(SKY[0][1]), bot: hex(SKY[0][2]) };
  }
  function rgb(c, f) {
    f = f == null ? 1 : f;
    return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')';
  }

  // ---------------------------------------------------------------- start
  function start(userOpts) {
    var O = {
      timezone: 'Europe/Warsaw', lat: 52.2297, lon: 21.0122, base: DEFAULT_BASE, scale: 5, edge: 24,
      weatherUrl: 'https://api.open-meteo.com/v1/forecast', weatherQuery: true, position: 'right', avoid: 'main, [data-avatar-avoid]', floorRows: 4, sky: true, skyIntensity: 0.28, weatherIntensity: 0.6, weather: true, zIndex: 200
    };
    for (var k in userOpts) O[k] = userOpts[k];
    var Q = new URLSearchParams(global.location.search);
    // Everything the background creates goes into one persistent layer (<div id="avatar-layer" transition:persist>),
    // so it survives page navigation instead of restarting on every page.
    var LAYER = document.getElementById('avatar-layer') || document.body;
    if (Q.get('tz')) O.timezone = Q.get('tz');

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var S = {
      override: { scene: Q.get('scene') || '', day: Q.get('day') || '', time: Q.get('time') || '', date: Q.get('date') || '',
                  weather: Q.get('weather') || '', rare: Q.get('rare') || '', call: Q.get('call') || '', nap: Q.get('nap') || '' },
      factor: Math.max(1, Number(Q.get('timelapse')) || 1),
      weatherKind: 'clear', weatherSource: 'default', sunrise: 390, sunset: 1170,
      rare: Math.random() < 0.2, call: Math.random() < 0.15, nap: Math.random() < 0.12, current: null, swapping: false, loaded: {}
    };
    var tzFmt;
    try {
      tzFmt = new Intl.DateTimeFormat('en-GB', { timeZone: O.timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    } catch (e) { O.timezone = 'UTC'; tzFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }); }

    // ------------------------------------------------------------ clock
    function realParts() {
      var p = {}; tzFmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return { dow: Math.max(0, DAYS.indexOf(String(p.weekday).toLowerCase().slice(0, 3))), min: (+p.hour) * 60 + (+p.minute) };
    }
    var base = { real: Date.now(), dow: 0, min: 0 };
    // The date the sky is computed for: today, or the one forced with ?date=YYYY-MM-DD (or MM-DD).
    function overrideDate() {
      var m = /^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/.exec(S.override.date || '');
      if (!m) return null;
      var d = new Date(m[1] ? +m[1] : new Date().getFullYear(), +m[2] - 1, +m[3], 12);
      return isNaN(d) ? null : d;
    }
    function skyDate() { return overrideDate() || new Date(); }
    function rebase() {
      var r = realParts();
      var od = overrideDate();
      var dow = S.override.day && DAYS.indexOf(S.override.day) >= 0 ? DAYS.indexOf(S.override.day) : (od ? (od.getDay() + 6) % 7 : r.dow);
      var min = r.min;
      if (/^\d{1,2}:\d{2}$/.test(S.override.time)) { var t = S.override.time.split(':'); min = (+t[0]) * 60 + (+t[1]); }
      base = { real: Date.now(), dow: dow, min: min };
    }
    function clock() {
      var total = base.dow * 1440 + base.min + (Date.now() - base.real) / 60000 * S.factor;
      total = ((total % 10080) + 10080) % 10080;
      return { dow: Math.floor(total / 1440), min: total % 1440 };
    }
    rebase();

    // Sunrise and sunset: from the weather service for today; worked out from the latitude
    // for a date forced with ?date= (the weather service only knows today).
    function tzOffsetHours(d) {
      var parts = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: O.timezone, hour: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))).forEach(function (x) { parts[x.type] = x.value; });
      return (+parts.hour) - 12;
    }
    function astroSun(d) {
      var N = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      var dec = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365), lat = O.lat * Math.PI / 180;
      var c = Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(dec)));
      var half = Math.acos(c) * 12 / Math.PI, noon = 12 - O.lon / 15 + tzOffsetHours(d);
      return { rise: (noon - half) * 60, set: (noon + half) * 60 };
    }
    function applySun() {
      var od = overrideDate();
      if (od) { var a = astroSun(od); S.sunrise = a.rise; S.sunset = a.set; }
      else if (S.apiSun) { S.sunrise = S.apiSun.rise; S.sunset = S.apiSun.set; }
      else { var fb = astroSun(skyDate()); S.sunrise = fb.rise; S.sunset = fb.set; }   // before (or without) the weather lookup: from the date and latitude, like the head script
    }

    // ---------------------------------------------------------- weather
    function weatherNow() { return S.override.weather || S.weatherKind; }
    // How overcast the sky is: 0 clear .. 1. Cloudy is clearly grey (no sun, no moon, no stars); rain, snow and fog are darker; a storm is the darkest.
    // The colours the sky is greyed towards (top, bottom): rain is dark and blue-grey, snow a bright cool white, fog a pale haze.
    function greysOf(w) {
      return w === 'rain' || w === 'storm' ? { top: [112, 122, 140], bot: [158, 167, 181] }
           : w === 'snow' ? { top: [186, 194, 208], bot: [220, 226, 236] }
           : w === 'fog' ? { top: [190, 195, 201], bot: [208, 211, 215] }
           : { top: [150, 158, 170], bot: [190, 196, 205] };
    }
    // Cloud drift speed (a factor) and opacity: any overcast sky (cloudy, rain, snow, fog, storm) is a slow, soft grey deck, not shapes sliding past.
    function cloudSpeed(w) { return w === 'clear' ? 1 : 0.2; }
    function cloudAlpha(w) { return w === 'clear' ? 1 : 0.5; }
    function overcastOf(w) { return w === 'cloudy' ? 0.55 : (w === 'rain' || w === 'snow' || w === 'fog') ? 0.7 : w === 'storm' ? 0.85 : 0; }
    function kindFromCode(c) {
      if (c >= 95) return 'storm';
      if (c >= 71 && c <= 77 || c === 85 || c === 86) return 'snow';
      if (c >= 51 && c <= 67 || c >= 80 && c <= 82) return 'rain';
      if (c === 45 || c === 48) return 'fog';
      if (c >= 2) return 'cloudy';
      return 'clear';
    }
    function toMin(iso) { var m = /T(\d\d):(\d\d)/.exec(iso || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    function loadWeather() {
      if (O.weather === false) return;
      var KEY = 'avatar-live-weather', cached = null;
      try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (cached && Date.now() - cached.at < 30 * 60000 && cached.lat === O.lat && cached.lon === O.lon) {
        S.weatherKind = cached.kind; S.apiSun = { rise: cached.sunrise, set: cached.sunset }; S.weatherSource = 'cache';
        return;
      }
      var url = O.weatherQuery === false ? O.weatherUrl : O.weatherUrl + '?latitude=' + O.lat + '&longitude=' + O.lon +
        '&current=weather_code&daily=sunrise,sunset&forecast_days=1&timezone=' + encodeURIComponent(O.timezone);
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        S.weatherKind = kindFromCode(j.current.weather_code);
        var sr = toMin(j.daily && j.daily.sunrise[0]), ss = toMin(j.daily && j.daily.sunset[0]);
        if (sr != null && ss != null) S.apiSun = { rise: sr, set: ss };
        S.weatherSource = 'open-meteo';
        try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), lat: O.lat, lon: O.lon, kind: S.weatherKind, sunrise: S.apiSun ? S.apiSun.rise : 390, sunset: S.apiSun ? S.apiSun.set : 1170 })); } catch (e) {}
      }).catch(function () { S.weatherSource = 'unavailable (using clear)'; });
    }

    // ------------------------------------------------------ loading JS
    function load(def) {
      return Promise.all((def.needs || []).map(load)).then(function () {   // dependencies first
        if (global[def.g]) return;
        if (S.loaded[def.script]) return S.loaded[def.script];
        return (S.loaded[def.script] = new Promise(function (res, rej) {
          var s = document.createElement('script');
          s.src = O.base + def.script; s.onload = res; s.onerror = function () { rej(new Error('cannot load ' + s.src)); };
          document.head.appendChild(s);
        }));
      });
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // ------------------------------------------------------------ floor
    // On narrow screens everything is drawn smaller, so the scene never swallows the text.
    function pickScale() {
      var w = global.innerWidth, max = O.scale;
      var sc = w >= 1000 ? max : w >= 700 ? Math.min(max, 4) : w >= 480 ? Math.min(max, 3) : Math.min(max, 2);
      return Math.max(1, sc);
    }
    var scale = pickScale(), floorH = O.floorRows * scale;
    var floorTile = '';
    var floorEl = document.createElement('div');
    (function () {
      var TW = 16, t = document.createElement('canvas');
      t.width = TW; t.height = O.floorRows;
      var tc = t.getContext('2d');
      for (var r = 0; r < O.floorRows; r++) {
        tc.fillStyle = r === 0 ? '#B79F7E' : (r % 2 ? '#D8C7A8' : '#CDBB9A');
        tc.fillRect(0, r, TW, 1);
        if (r > 0) { tc.fillStyle = '#B79F7E'; tc.fillRect((r * 7) % TW, r, 1, 1); }
      }
      floorEl.setAttribute('aria-hidden', 'true');
      floorEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;pointer-events:none;image-rendering:pixelated;' +
        'z-index:' + (O.zIndex - 1) + ';height:' + floorH + 'px;background:url(' + (floorTile = t.toDataURL()) + ') 0 0/' +
        TW * scale + 'px ' + O.floorRows * scale + 'px repeat-x';
      LAYER.appendChild(floorEl);
    })();

    // ------------------------------------------------------- wet ground
    // In rain, outdoors, the floor is wet: a dark blue wash over the planks with a few shiny puddles. It darkens quickly when the rain
    // starts and dries slowly (8 s) when it stops.
    var WET_TW = 32;
    var wetEl = document.createElement('div');
    (function () {
      var t = document.createElement('canvas'); t.width = WET_TW; t.height = O.floorRows;
      var tc = t.getContext('2d');
      for (var r = 0; r < O.floorRows; r++) { tc.fillStyle = r === 0 ? 'rgba(25,45,80,0.5)' : 'rgba(40,66,108,0.36)'; tc.fillRect(0, r, WET_TW, 1); }
      // puddles: pale blue-grey with a white glint on top
      [[3,1,6,2],[15,2,5,2],[24,1,7,2]].forEach(function (p) {
        tc.fillStyle = 'rgba(176,200,228,0.85)'; tc.fillRect(p[0], p[1], p[2], p[3]);
        tc.fillStyle = 'rgba(235,244,255,0.95)'; tc.fillRect(p[0] + 1, p[1], Math.max(1, p[2] - 3), 1);
      });
      wetEl.setAttribute('aria-hidden', 'true');
      wetEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;pointer-events:none;image-rendering:pixelated;opacity:0;transition:opacity 2s ease;' +
        'z-index:' + (O.zIndex - 1) + ';height:' + floorH + 'px;background:url(' + t.toDataURL() + ') 0 0/' +
        WET_TW * scale + 'px ' + O.floorRows * scale + 'px repeat-x';
      document.body.appendChild(wetEl);
    })();
    var wetEl2 = wetEl.cloneNode(false);                 // a second wash on top, only for a storm: much darker planks, shinier puddles
    document.body.appendChild(wetEl2);

    // ------------------------------------------------------- snow cover
    // In snow, outdoors, the ground is white: a snow layer over the floor with an uneven drift line along its top (2 rows above the
    // floor), shaded a little bluer towards the bottom. It fades in and out with the weather and is dimmed like the floor.
    var SNOW_TW = 32, SNOW_ROWS = O.floorRows + 2;
    var snowEl = document.createElement('div');
    (function () {
      var t = document.createElement('canvas'); t.width = SNOW_TW; t.height = SNOW_ROWS;
      var tc = t.getContext('2d');
      var drift = [1,2,2,1,1,0,1,2,2,2,1,1,0,0,1,1,2,2,1,0,1,1,2,2,2,1,1,0,1,1,2,1];
      for (var x = 0; x < SNOW_TW; x++) {
        var h = drift[x];
        for (var r = 0; r < 2; r++) if (r >= 2 - h) { tc.fillStyle = r === 2 - h ? '#F1F6FD' : '#FFFFFF'; tc.fillRect(x, r, 1, 1); }
      }
      var body = ['#FFFFFF', '#F4F8FD', '#E6EEF8', '#D3DFEE', '#C4D3E6', '#BCCCE0'];
      for (var r2 = 2; r2 < SNOW_ROWS; r2++) { tc.fillStyle = body[Math.min(body.length - 1, r2 - 2)]; tc.fillRect(0, r2, SNOW_TW, 1); }
      tc.fillStyle = '#FFFFFF'; [[3,3],[9,4],[14,3],[21,4],[27,3],[30,5]].forEach(function (p) { tc.fillRect(p[0], p[1], 1, 1); });   // sparkles
      tc.fillStyle = '#B4C5DA'; [[6,4],[17,5],[24,3],[11,5]].forEach(function (p) { tc.fillRect(p[0], p[1], 1, 1); });                  // small shadows
      snowEl.setAttribute('aria-hidden', 'true');
      snowEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;pointer-events:none;image-rendering:pixelated;opacity:0;transition:opacity 1.6s ease;' +
        'z-index:' + (O.zIndex - 1) + ';height:' + SNOW_ROWS * scale + 'px;background:url(' + t.toDataURL() + ') 0 0/' +
        SNOW_TW * scale + 'px ' + SNOW_ROWS * scale + 'px repeat-x';
      document.body.appendChild(snowEl);
    })();
    // The space the scene needs at the bottom of the page, for your layout: padding-bottom: var(--avatar-scene-h).
    function publishSceneHeight() {
      document.documentElement.style.setProperty('--avatar-scene-h', (36 * scale + floorH - 4 * scale) + 'px');
    }
    publishSceneHeight();
    // Called when the window crosses a size breakpoint: redraw floor, window and scene smaller or bigger.
    function applyScale() {
      var ns = pickScale();
      if (ns === scale) return;
      scale = ns; floorH = O.floorRows * scale;
      floorEl.style.height = floorH + 'px';
      floorEl.style.backgroundSize = 16 * scale + 'px ' + O.floorRows * scale + 'px';
      [wetEl, wetEl2].forEach(function (e) { e.style.height = floorH + 'px'; e.style.backgroundSize = WET_TW * scale + 'px ' + O.floorRows * scale + 'px'; });
      snowEl.style.height = SNOW_ROWS * scale + 'px'; snowEl.style.backgroundSize = SNOW_TW * scale + 'px ' + SNOW_ROWS * scale + 'px';
      winEl.style.width = WINW * scale + 'px'; winEl.style.height = WINH * scale + 'px';
      publishSceneHeight();
      if (S.current && !S.swapping) swapTo(S.current.id, true, true);      // restart it at the new size, instantly
    }

    // ------------------------------------------------------------- sun
    // Where the sun is at a given hour (fractions of the sky: x east -> west, y top -> bottom).
    // It rises at today's sunrise, sets at today's sunset, and how high it climbs depends on
    // the latitude and the time of year (a low winter sun, a high summer sun).
    function sunPos(hour) {
      var rise = S.sunrise / 60, set = S.sunset / 60, f = Math.min(1, Math.max(0, (hour - rise) / (set - rise)));
      var now = skyDate(), start = new Date(now.getFullYear(), 0, 0);
      var N = Math.floor((now - start) / 86400000);                                   // day of the year
      var dec = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365);      // solar declination
      var lat = O.lat * Math.PI / 180, H0 = (set - rise) * Math.PI / 24;               // half the day, as an angle
      var H = (f - 0.5) * 2 * H0;                                                      // hour angle
      var elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
      elev = Math.max(0, elev * 180 / Math.PI);                                        // degrees above the horizon
      return { x: f, y: 0.72 - Math.min(1, elev / 70) * 0.6 };                         // 14 deg (winter) low, 60 deg (summer) high
    }

    // Golden hour: strongest at sunrise and sunset, fading over the next hour or so; full
    // strength only in clear weather (a little when it is just cloudy, none in rain or snow).
    function goldenAmount(hour) {
      var rise = S.sunrise / 60, set = S.sunset / 60, span = 1.8;
      var m = hour - rise, e = set - hour, g = 0;
      if (m >= -0.3 && m <= span) g = Math.max(g, 1 - Math.max(0, m) / span);
      if (e >= -0.3 && e <= span) g = Math.max(g, 1 - Math.max(0, e) / span);
      var w = weatherNow();
      var wf = w === 'clear' ? 1 : w === 'cloudy' ? 0.3 : 0;
      return g * g * (3 - 2 * g) * wf;                                    // smoothstep
    }
    function mixRGB(a, b, u) { return a.map(function (v, i) { return v + (b[i] - v) * u; }); }

    // -------------------------------------------------------------- sky
    var sky = null, skyCtx = null, SW = 0, SH = 96, stars = [], clouds = [];
    if (O.sky !== false) {
      sky = document.createElement('canvas');
      sky.setAttribute('aria-hidden', 'true');
      sky.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-2;image-rendering:pixelated;pointer-events:none;transition:opacity .8s;opacity:' + O.skyIntensity;
      LAYER.insertBefore(sky, LAYER.firstChild);
      skyCtx = sky.getContext('2d');
      for (var si = 0; si < 70; si++) stars.push({ x: Math.random(), y: Math.random() * 0.7, p: Math.random() * 6 });
      for (var ci = 0; ci < 9; ci++) clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.4, w: 9 + Math.floor(Math.random() * 12), v: 0.004 + Math.random() * 0.006 });
    }
    function resizeSky() { if (!sky) return; SW = Math.max(40, Math.round(SH * global.innerWidth / global.innerHeight)); sky.width = SW; sky.height = SH; }

    function drawSky(c, dt) {
      if (!skyCtx) return;
      var hour = c.min / 60, w = weatherNow();
      var col = skyColors(skyHour(hour, S.sunrise / 60, S.sunset / 60)), g = skyCtx;
      var overcast = overcastOf(w);
      var greyTop = greysOf(w).top, greyBot = greysOf(w).bot;
      var lum = (col.top[0] + col.top[1] + col.top[2]) / 3 / 255;        // 0 night .. ~0.5 day
      var mixGrey = function (cc, grey) { return cc.map(function (v, i) { return lerp(v, grey[i] * (0.35 + lum), overcast); }); };
      var top = mixGrey(col.top, greyTop), bot = mixGrey(col.bot, greyBot);
      var gold = goldenAmount(hour);
      top = mixRGB(top, [215, 130, 95], gold * 0.6); bot = mixRGB(bot, [255, 140, 50], gold * 1.0);   // golden hour
      var BAND = 6;
      for (var y = 0; y < SH; y += BAND) {
        var u = y / SH;
        g.fillStyle = rgb([lerp(top[0], bot[0], u), lerp(top[1], bot[1], u), lerp(top[2], bot[2], u)]);
        g.fillRect(0, y, SW, BAND);
      }
      var night = hour < S.sunrise / 60 - 0.4 || hour > S.sunset / 60 + 0.6;
      if (night && overcast < 0.5) {
        stars.forEach(function (s) {
          var a = (Math.sin(performance.now() / 700 + s.p) * 0.3 + 0.7) * (1 - overcast);
          g.fillStyle = 'rgba(255,255,235,' + a.toFixed(2) + ')';
          g.fillRect(Math.floor(s.x * SW), Math.floor(s.y * SH), 1, 1);
        });
      }
      function arc(prog) { return { x: prog * SW, y: SH * 0.62 - Math.sin(prog * Math.PI) * SH * 0.5 }; }
      var rise = S.sunrise / 60, set = S.sunset / 60;
      if (hour >= rise - 0.5 && hour <= set + 0.5 && overcast < 0.5) {          // sun
        var sp0 = sunPos(hour), p = { x: sp0.x * SW, y: sp0.y * SH };
        g.fillStyle = gold > 0.25 ? '#FFB347' : overcast > 0.3 ? '#FFF2B8' : '#FFE066';   // a warm orange sun at golden hour
        g.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 4, 7, 9); g.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 3, 9, 7);
      } else if (night && overcast < 0.5) {                                     // moon
        var h2 = hour < 12 ? hour + 24 : hour, mp = Math.min(1, Math.max(0, (h2 - (set + 0.5)) / (rise + 24 - set - 0.5)));
        var m = arc(mp);
        g.fillStyle = '#F4F1D8';
        g.fillRect(Math.round(m.x) - 2, Math.round(m.y) - 3, 5, 7); g.fillRect(Math.round(m.x) - 3, Math.round(m.y) - 2, 7, 5);
        g.fillStyle = '#D9D5B5'; g.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 1); g.fillRect(Math.round(m.x) + 1, Math.round(m.y) + 1, 1, 1);
      }
      var count = w === 'clear' ? 3 : 9;                     // clouds
      var cc = w === 'clear' ? [250, 252, 255] : w === 'cloudy' ? [205, 211, 221] : [150, 158, 172];
      var dim = night ? 0.28 : (hour < rise + 1 || hour > set - 1) ? 0.78 : 1;
      g.globalAlpha = cloudAlpha(w);
      clouds.slice(0, count).forEach(function (cl) {
        cl.x += cl.v * dt * cloudSpeed(w) * (reduced ? 0 : 1); if (cl.x > 1.1) cl.x = -0.15;
        var x = Math.round(cl.x * SW), y = Math.round(cl.y * SH), cw = w === 'cloudy' ? Math.round(cl.w * 1.8) : cl.w;   // wide, heavy clouds when it is cloudy
        g.fillStyle = rgb(cc, dim);
        g.fillRect(x, y + 2, cw, 3); g.fillRect(x + 2, y + 1, cw - 5, 1); g.fillRect(x + 4, y, Math.max(2, cw - 11), 1);
        g.fillStyle = rgb(cc.map(function (v) { return v * 0.88; }), dim);
        g.fillRect(x + 1, y + 5, cw - 2, 1);
      });
      g.globalAlpha = 1;
    }

    // -------------------------------------------------------- particles
    var wx = document.createElement('canvas');
    wx.setAttribute('aria-hidden', 'true');
    wx.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    LAYER.insertBefore(wx, LAYER.firstChild);
    var wctx = wx.getContext('2d'), drops = [], splashes = [], flakes = [], bolt = 0, nextBolt = 8;
    function resizeWx() { wx.width = global.innerWidth; wx.height = global.innerHeight; }
    function drawWeather(dt) {
      var w = weatherNow(), W2 = wx.width, H2 = wx.height, floorTop = H2 - floorH;
      wctx.clearRect(0, 0, W2, H2);
      if (reduced) return;
      var WI = O.weatherIntensity;
      wctx.globalAlpha = 0.8 * WI / 0.6;
      var outdoor = S.current && S.current.def.outdoor;
      wx.style.zIndex = '55';
      if (!outdoor) { drops.length = 0; flakes.length = 0; splashes.length = 0; return; }   // indoors: only through the window
      var night = clock().min / 60 > S.sunset / 60 + 0.6 || clock().min / 60 < S.sunrise / 60 - 0.4;
      if (w === 'rain' || w === 'storm') {
        var want = Math.round((w === 'storm' ? 260 : 150) * WI / 0.6);
        while (drops.length < want) drops.push({ x: Math.random() * W2, y: Math.random() * H2, v: 640 + Math.random() * 260, end: floorTop - 2 - Math.random() * 10 });
        wctx.fillStyle = night ? 'rgba(190,210,255,0.75)' : 'rgba(60,90,150,0.8)';
        drops.forEach(function (d) {
          d.y += d.v * dt; d.x -= d.v * dt * 0.18;
          if (d.y >= d.end) {
            if (splashes.length < 160) splashes.push({ x: d.x, y: d.end, t: 0 });
            d.y = -10; d.x = Math.random() * (W2 + 200); d.end = floorTop - 2 - Math.random() * 10;
          }
          wctx.fillRect(Math.round(d.x / 3) * 3, Math.round(d.y / 3) * 3, 3, 12);
        });
        wctx.fillStyle = night ? 'rgba(200,215,255,0.85)' : 'rgba(80,115,175,0.85)';
        splashes = splashes.filter(function (s) {
          s.t += dt;
          if (s.t > 0.2) return false;
          wctx.fillRect(Math.round(s.x / 3) * 3 - 3, Math.round(s.y / 3) * 3, 3, 3);
          wctx.fillRect(Math.round(s.x / 3) * 3 + 3, Math.round(s.y / 3) * 3, 3, 3);
          return true;
        });
      } else drops.length = 0;
      if (w === 'snow') {
        while (flakes.length < Math.round(130 * WI / 0.6)) flakes.push({ x: Math.random() * W2, y: Math.random() * H2, v: 40 + Math.random() * 50, s: Math.random() < 0.15 ? 9 : Math.random() < 0.45 ? 6 : 3, p: Math.random() * 6 });
        wctx.fillStyle = night ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)';
        flakes.forEach(function (f) {
          f.y += f.v * dt; f.x += Math.sin(performance.now() / 900 + f.p) * 18 * dt;
          if (f.y > floorTop + floorH * 0.7) { f.y = -8; f.x = Math.random() * W2; }
          var fx = Math.round(f.x / 3) * 3, fy = Math.round(f.y / 3) * 3;
          if (!night) { wctx.fillStyle = 'rgba(120,140,170,0.32)'; wctx.fillRect(fx - 1, fy - 1, f.s + 2, f.s + 2); wctx.fillStyle = 'rgba(255,255,255,0.97)'; }
          wctx.fillRect(fx, fy, f.s, f.s);
        });
      } else flakes.length = 0;
      if (w === 'fog') { wctx.fillStyle = 'rgba(225,230,235,0.2)'; wctx.fillRect(0, H2 * 0.35, W2, H2 * 0.65); }
      if (w === 'storm') {
        nextBolt -= dt;
        if (nextBolt <= 0) { bolt = 0.35; nextBolt = 7 + Math.random() * 9; }
        if (bolt > 0) { bolt -= dt; wctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, bolt * 0.45).toFixed(2) + ')'; wctx.fillRect(0, 0, W2, H2); }
      }
    }

    // ---------------------------------------------------------- window
    // Indoors, the sky and the weather are only visible through a window above him.
    var WINW = 32, WINH = 24, PX = 3, PY = 3, PW = 26, PH = 18;
    var winEl = document.createElement('canvas');
    winEl.width = WINW; winEl.height = WINH;
    winEl.setAttribute('aria-hidden', 'true');
    winEl.style.cssText = 'position:fixed;left:0;top:0;width:' + WINW * scale + 'px;height:' + WINH * scale + 'px;' +
      'image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;opacity:0;transition:opacity .7s;z-index:48';
    LAYER.appendChild(winEl);
    var wg = winEl.getContext('2d'), wClouds = [], wStars = [], wDrops = [], wFlakes = [], wBolt = 0, wNextBolt = 6;
    for (var wi = 0; wi < 5; wi++) wClouds.push({ x: Math.random() * 30 - 4, y: 1 + Math.random() * 8, w: 6 + Math.floor(Math.random() * 4), v: 0.5 + Math.random() * 0.6 });
    for (var wsi = 0; wsi < 16; wsi++) wStars.push({ x: Math.floor(Math.random() * PW), y: Math.floor(Math.random() * 11), p: Math.random() * 6 });

    // The window hides itself when it would overlap your content (elements matching the
    // `avoid` option, by default <main> and anything marked data-avatar-avoid).
    var avoidEls = [], avoidAt = -1e9, lastOverlap = false;
    function overlapsContent(x, y, w, h) {
      var now = performance.now();
      // Refresh every second, and at once when a cached element has left the page (a client-side navigation swaps <main>).
      var stale = false;
      for (var k = 0; k < avoidEls.length; k++) if (!avoidEls[k].isConnected) { stale = true; break; }
      if (stale || now - avoidAt > 1000) { avoidAt = now; try { avoidEls = [].slice.call(document.querySelectorAll(O.avoid)); } catch (e) { avoidEls = []; } }
      if (!avoidEls.length) return lastOverlap;      // mid-swap, nothing to measure: keep the last decision (no blink)
      var pad = 12, hit = false;
      for (var i = 0; i < avoidEls.length; i++) {
        var r = avoidEls[i].getBoundingClientRect();
        if (r.width && r.height && x < r.right + pad && x + w > r.left - pad && y < r.bottom + pad && y + h > r.top - pad) { hit = true; break; }
      }
      lastOverlap = hit;
      return hit;
    }
    function drawWindow(c, dt) {
      var show = O.window !== false && S.current && !S.current.def.outdoor && global.innerWidth >= (O.windowMinWidth || 640);
      // The same spot in every scene: centred over the seated-scene area, above the tallest scene.
      var sceneBottom = global.innerHeight - (floorH - 4 * scale);
      var top = sceneBottom - 36 * scale - WINH * scale - 10;
      var cx = O.position === 'left' ? O.edge + 20 * scale : global.innerWidth - O.edge - 20 * scale;
      if (show && top < 6) show = false;
      var wl = Math.round(cx - WINW * scale / 2);
      if (show && overlapsContent(wl, top, WINW * scale, WINH * scale)) show = false;   // never cover your content
      winEl.style.opacity = show ? '1' : '0';
      if (!show) return;
      winEl.style.left = wl + 'px';
      winEl.style.top = Math.round(top) + 'px';

      var hour = c.min / 60, w = weatherNow(), g = wg;
      var col = skyColors(skyHour(hour, S.sunrise / 60, S.sunset / 60));
      var overcast = overcastOf(w);
      var lum = (col.top[0] + col.top[1] + col.top[2]) / 3 / 255;
      var grey = function (cc, gr) { return cc.map(function (v, i) { return lerp(v, gr[i] * (0.35 + lum), overcast); }); };
      var t1 = grey(col.top, greysOf(w).top), b1 = grey(col.bot, greysOf(w).bot);
      var wgold = goldenAmount(hour);
      t1 = mixRGB(t1, [215, 130, 95], wgold * 0.6); b1 = mixRGB(b1, [255, 140, 50], wgold * 1.0);
      g.clearRect(0, 0, WINW, WINH);
      // frame and sill
      g.fillStyle = '#8E6B43'; g.fillRect(0, 0, WINW, 21);
      g.fillStyle = '#A47C52'; g.fillRect(0, 0, WINW, 1);
      g.fillStyle = '#B58B5A'; g.fillRect(0, 21, WINW, 2); g.fillStyle = '#8E6B43'; g.fillRect(0, 23, WINW, 1);
      g.save(); g.translate(PX, PY);
      g.beginPath(); g.rect(0, 0, PW, PH); g.clip();
      for (var y = 0; y < PH; y += 2) {                                   // sky
        var u = y / PH;
        g.fillStyle = rgb([lerp(t1[0], b1[0], u), lerp(t1[1], b1[1], u), lerp(t1[2], b1[2], u)]);
        g.fillRect(0, y, PW, 2);
      }
      var rise = S.sunrise / 60, set = S.sunset / 60;
      var night = hour < rise - 0.4 || hour > set + 0.6;
      if (night && overcast < 0.5) wStars.forEach(function (s) {
        g.fillStyle = 'rgba(255,255,235,' + ((Math.sin(performance.now() / 700 + s.p) * 0.3 + 0.7) * (1 - overcast)).toFixed(2) + ')';
        g.fillRect(s.x, s.y, 1, 1);
      });
      function warc(p) { return { x: p * PW, y: PH * 0.75 - Math.sin(p * Math.PI) * PH * 0.6 }; }
      if (hour >= rise - 0.4 && hour <= set + 0.4 && overcast < 0.5) {
        var sp1 = sunPos(hour), sp = { x: sp1.x * PW, y: sp1.y * PH };
        g.fillStyle = wgold > 0.25 ? '#FFB347' : overcast > 0.3 ? '#FFF2B8' : '#FFE066';
        g.fillRect(Math.round(sp.x) - 1, Math.round(sp.y) - 2, 3, 5); g.fillRect(Math.round(sp.x) - 2, Math.round(sp.y) - 1, 5, 3);
      } else if (night && overcast < 0.5) {
        var h2 = hour < 12 ? hour + 24 : hour;
        var mp = warc(Math.min(1, Math.max(0, (h2 - (set + 0.5)) / (rise + 24 - set - 0.5))));
        g.fillStyle = '#F4F1D8';
        g.fillRect(Math.round(mp.x) - 1, Math.round(mp.y) - 2, 3, 5); g.fillRect(Math.round(mp.x) - 2, Math.round(mp.y) - 1, 5, 3);
      }
      var cn = w === 'clear' ? 1 : 5;
      var cc = w === 'clear' ? [250, 252, 255] : w === 'cloudy' ? [205, 211, 221] : [150, 158, 172];
      var dim = night ? 0.3 : 1;
      g.globalAlpha = cloudAlpha(w);
      wClouds.slice(0, cn).forEach(function (cl) {
        cl.x += cl.v * dt * cloudSpeed(w); if (cl.x > PW + 2) cl.x = -cl.w - 2;
        var x = Math.round(cl.x), yy = Math.round(cl.y), cw = w === 'cloudy' ? Math.round(cl.w * 1.6) : cl.w;
        g.fillStyle = rgb(cc, dim);
        g.fillRect(x, yy + 1, cw, 2); g.fillRect(x + 1, yy, cw - 3, 1);
      });
      g.globalAlpha = 1;
      // weather behind the glass
      if (w === 'rain' || w === 'storm') {
        var want = w === 'storm' ? 46 : 30;
        while (wDrops.length < want) wDrops.push({ x: Math.random() * (PW + 6), y: Math.random() * PH, v: 38 + Math.random() * 20 });
        g.fillStyle = night ? 'rgba(200,215,255,0.8)' : 'rgba(70,100,150,0.75)';
        wDrops.forEach(function (d) {
          d.y += d.v * dt; d.x -= d.v * dt * 0.2;
          if (d.y > PH) { d.y = -2; d.x = Math.random() * (PW + 6); }
          g.fillRect(Math.round(d.x), Math.round(d.y), 1, 2);
        });
      } else wDrops.length = 0;
      if (w === 'snow') {
        while (wFlakes.length < 26) wFlakes.push({ x: Math.random() * PW, y: Math.random() * PH, v: 4 + Math.random() * 5, p: Math.random() * 6 });
        g.fillStyle = '#FFFFFF';
        wFlakes.forEach(function (f) {
          f.y += f.v * dt; f.x += Math.sin(performance.now() / 900 + f.p) * 2 * dt;
          if (f.y > PH) { f.y = -1; f.x = Math.random() * PW; }
          g.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        });
      } else wFlakes.length = 0;
      if (w === 'fog') { g.fillStyle = 'rgba(225,230,235,0.4)'; g.fillRect(0, 4, PW, PH - 4); }
      if (w === 'storm') {
        wNextBolt -= dt; if (wNextBolt <= 0) { wBolt = 0.3; wNextBolt = 7 + Math.random() * 9; }
        if (wBolt > 0) { wBolt -= dt; g.fillStyle = 'rgba(255,255,255,' + Math.max(0, wBolt * 2).toFixed(2) + ')'; g.fillRect(0, 0, PW, PH); }
      }
      g.restore();
      g.fillStyle = '#8E6B43';                                             // muntins
      g.fillRect(PX + 12, PY, 2, PH); g.fillRect(PX, PY + 8, PW, 2);
    }

    // ---------------------------------------------------- dusk / night
    function isDark(c) { return c.min < S.sunrise - 20 || c.min > S.sunset + 30; }
    function dimFor(c) {
      var m = c.min;
      if (m < S.sunrise - 40 || m > S.sunset + 60) return 0.66;
      if (m < S.sunrise + 20) return 0.66 + (m - (S.sunrise - 40)) / 60 * 0.34;
      if (m > S.sunset - 40) return 1 - (m - (S.sunset - 40)) / 100 * 0.34;
      return 1;
    }
    function baseBgNow(c) {
      var g = goldenAmount(c.min / 60);
      return isDark(c) ? [28, 26, 23] : mixRGB(mixRGB([242, 244, 247], [253, 226, 188], g), [222, 227, 234], overcastOf(weatherNow()) * 0.5);   // greyer when overcast
    }
    function applyDim(c) {
      var b = dimFor(c), gold = goldenAmount(c.min / 60);
      var f = 'brightness(' + b.toFixed(2) + ')' + (gold > 0.02 ? ' sepia(' + (gold * 0.6).toFixed(2) + ') saturate(' + (1 + gold * 0.45).toFixed(2) + ')' : '');   // warm light at golden hour
      // Let the page react: html[data-avatar-time] = day | dusk | night, plus colour variables.
      var rootEl = document.documentElement, night = isDark(c);
      rootEl.dataset.avatarTime = night ? 'night' : (b < 1 ? 'dusk' : 'day');
      rootEl.dataset.avatarRoams = (S.current && S.current.def.roams) ? '1' : '';   // walking / cycling: crosses the whole width, so the page keeps room for him
      rootEl.style.setProperty('--avatar-ink', night ? '#ECE7DD' : '#1D2230');
      rootEl.style.setProperty('--avatar-accent', night ? '#6CB0FF' : '#2457F5');
      rootEl.style.setProperty('--avatar-on-accent', night ? '#14110E' : '#FFFFFF');
      try {
        localStorage.setItem('avatar-live-theme', JSON.stringify({ night: night, bg: 'rgb(' + baseBgNow(c).map(Math.round).join(',') + ')' }));
      } catch (e) {}
      rootEl.style.setProperty('--avatar-card-solid', night ? '#2A2622' : '#FFFFFF');   // a solid colour that contrasts with --avatar-ink (e.g. text on a filled button)
      rootEl.style.setProperty('--avatar-card', night ? 'rgba(66,58,50,0.55)' : 'rgba(255,255,255,0.62)');   // semi-transparent panel for text
      var baseBg = baseBgNow(c);   // calm base colour, warm at golden hour
      rootEl.style.setProperty('--avatar-sky-bg', 'rgb(' + baseBg.map(Math.round).join(',') + ')');
      floorEl.style.filter = f; snowEl.style.filter = f; wetEl.style.filter = f; wetEl2.style.filter = f;
      winEl.style.filter = f;
      if (S.current) {
        S.current.handle.root.style.filter = f;
        if (S.current.handle.setDark) S.current.handle.setDark(isDark(c));
      }
    }

    // ------------------------------------------------------ scene swap
    // No flash on load: the page stays invisible (html without .avatar-ready) until the first
    // scene and the fonts are ready, then fades in once. The colours of the last visit are
    // remembered, so a refresh never flashes from light to dark.
    var revealed = false;
    function revealPage() {
      if (revealed) return;
      revealed = true;
      var go = function () { requestAnimationFrame(function () { document.documentElement.classList.add('avatar-ready'); }); };
      if (document.fonts && document.fonts.ready) {
        var done = false, once = function () { if (!done) { done = true; go(); } };
        document.fonts.ready.then(once); setTimeout(once, 1500);
      } else go();
    }
    setTimeout(function () { revealed = true; document.documentElement.classList.add('avatar-ready'); }, 3000);   // safety net

    function swapTo(id, first, instant) {
      S.swapping = true;
      var def = SCENES[id], old = S.current;
      var goneP;
      if (old && instant) goneP = Promise.resolve();
      else if (old) {
        if (old.handle.leave) goneP = old.handle.leave();
        else {
          old.handle.root.style.transition = 'opacity .6s'; old.handle.root.style.opacity = '0';
          goneP = sleep(650);
        }
      } else goneP = Promise.resolve();
      return Promise.all([goneP, load(def)]).then(function () {
        if (old) { old.handle.stop(); S.current = null; }
        var o = { mount: LAYER, scale: scale, edge: O.edge, position: O.position, floor: 'external', floorRows: O.floorRows,
                  zIndex: O.zIndex, dark: isDark(clock()) };
        for (var k in def.opts) o[k] = def.opts[k];
        if (!first && (def.g === 'AvatarWalker')) o.enterFrom = Math.random() < 0.5 ? 'left' : 'right';
        o.umbrella = def.g === 'AvatarWalker' && /rain|storm/.test(weatherNow());
        var h = global[def.g].start(o);
        if (true) {                             // every scene fades in by itself, the first one too (the page text does not wait for it)
          h.root.style.opacity = '0';
          h.root.style.transition = 'opacity .7s';
          requestAnimationFrame(function () { requestAnimationFrame(function () { h.root.style.opacity = '1'; }); });
        }
        S.current = { id: id, def: def, handle: h };
        S.swapping = false;
        applyDim(clock());
        if (first) revealPage();
      }).catch(function (e) {
        S.swapping = false;
        if (first) revealPage();
        if (global.console) console.error('[AvatarLive]', e);
      });
    }

    function wantedScene(c) {
      if (S.override.scene && SCENES[S.override.scene]) return S.override.scene;
      return resolve(c.dow, c.min, ctxNow());
    }
    function rareNow() { return S.override.rare === '1' ? true : S.override.rare === '0' ? false : S.rare; }
    function callNow() { return S.override.call === '1' ? true : S.override.call === '0' ? false : S.call; }
    function napNow() { return S.override.nap === '1' ? true : S.override.nap === '0' ? false : S.nap; }
    function weekNow() { return Math.floor(((overrideDate() || new Date()).getTime() - 4 * 86400000) / 604800000); }   // changes on Mondays
    function ctxNow() { return { weather: weatherNow(), rare: rareNow(), call: callNow(), nap: napNow(), week: weekNow() }; }

    // ---------------------------------------------------------- tooltip
    var tip = document.createElement('div');
    tip.setAttribute('aria-hidden', 'true');
    tip.style.cssText = 'position:fixed;z-index:100001;pointer-events:none;opacity:0;transition:opacity .15s;' +
      'background:#272828;color:#F4EFE6;font:12px/1.35 system-ui,sans-serif;padding:6px 9px;border-radius:6px;' +
      'max-width:240px;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    LAYER.appendChild(tip);
    var tipUntil = 0, tipText = null;
    function describe() {
      if (!S.current) return '';
      var c = clock(), id = S.current.id, until = nextChange(c.dow, c.min, ctxNow());
      var forced = S.override.scene ? ' (forced)' : '';
      return S.current.def.label + (until != null && !S.override.scene ? ' · until ' + hhmm(until) : forced);
    }
    function inside(e) {
      if (!S.current) return false;
      var r = S.current.handle.root.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }
    function onMove(e) {
      if (!inside(e)) { if (!tipText) tip.style.opacity = '0'; return; }
      tip.textContent = tipText || describe();
      tip.style.left = Math.min(global.innerWidth - 250, e.clientX + 14) + 'px';
      tip.style.top = Math.max(8, e.clientY - 34) + 'px';
      tip.style.opacity = '1';
    }
    var taps = [];
    function onClick(e) {
      if (!inside(e) || !S.current) return;
      var now = Date.now();                                    // five quick taps on him open the debug panel
      taps = taps.filter(function (t) { return now - t < 2500; }); taps.push(now);
      /*DEBUG-START*/
      if (taps.length >= 5) {
        taps = []; togglePanel();
        tipText = panel ? 'Debug panel on' : 'Debug panel off'; tip.textContent = tipText; tip.style.opacity = '1';
        clearTimeout(tipUntil); tipUntil = setTimeout(function () { tipText = null; tip.style.opacity = '0'; }, 1500);
        return;
      }
      /*DEBUG-END*/
      if (!S.current.handle.root.animate) return;
      try {
        S.current.handle.root.animate([{ translate: '0 0' }, { translate: '0 -14px' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
      } catch (err) {}
      tipText = S.current.def.poke;
      tip.textContent = tipText; tip.style.left = Math.min(global.innerWidth - 250, e.clientX + 14) + 'px';
      tip.style.top = Math.max(8, e.clientY - 34) + 'px'; tip.style.opacity = '1';
      clearTimeout(tipUntil);
      tipUntil = setTimeout(function () { tipText = null; tip.style.opacity = '0'; }, 1800);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('click', onClick);

    /*DEBUG-START*/
    // ------------------------------------------------------ debug panel
    var panel = null, ui = {};
    var panelStyle = document.createElement('style');
    panelStyle.textContent =
      '.al-panel select,.al-panel input,.al-panel button{font:inherit}' +
      '@media (max-width:560px){' +
      '.al-panel{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto!important;' +
      'max-height:62vh;overflow:auto;font-size:14px!important;padding:12px 14px!important;border-radius:14px!important;-webkit-overflow-scrolling:touch}' +
      '.al-panel select,.al-panel input[type=time],.al-panel input[type=date]{min-height:38px;font-size:15px!important;width:150px!important}' +
      '.al-panel button{min-height:40px;padding:0 14px;font-size:14px!important}' +
      '#al-x{padding:8px 10px;margin:-8px -10px}' +
      '}';
    panelStyle.setAttribute('data-astro-transition-persist', '');   // keep it when the head is swapped
    document.head.appendChild(panelStyle);

    // An optional corner button (touch screens have no ` key): AvatarLive.start({ debugButton: true }) or ?debugbtn.
    var dbgBtn = null;
    if (O.debugButton || Q.has('debugbtn')) {
      dbgBtn = document.createElement('button');
      dbgBtn.type = 'button';
      dbgBtn.setAttribute('aria-label', 'Toggle debug panel');
      dbgBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.4" fill="currentColor"/><circle cx="15" cy="17" r="2.4" fill="currentColor"/></svg>';
      dbgBtn.style.cssText = 'position:fixed;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));' +
        'z-index:100001;width:42px;height:42px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;' +
        'background:rgba(20,22,30,.78);color:#E8EAF0;box-shadow:0 2px 8px rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent';
      dbgBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
      LAYER.appendChild(dbgBtn);
    }

    function buildPanel() {
      panel = document.createElement('div');
      panel.className = 'al-panel';
      panel.style.cssText = 'position:fixed;left:10px;top:10px;z-index:100002;background:rgba(20,22,30,.94);color:#E8EAF0;' +
        'font:12px/1.4 ui-monospace,Menlo,monospace;padding:10px 12px;border-radius:8px;width:236px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.35)';
      var h = '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>Avatar debug</b>' +
        '<span id="al-x" style="cursor:pointer">✕</span></div>' +
        '<div id="al-now" style="margin-bottom:8px;color:#9fd0ff"></div>';
      function sel(id, label, opts) {
        return '<label style="display:flex;justify-content:space-between;align-items:center;margin:3px 0">' + label +
          '<select id="' + id + '" style="width:130px;font:inherit">' +
          opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></label>';
      }
      h += sel('al-scene', 'Scene', [['', 'auto (schedule)']].concat(SCENE_IDS.map(function (s) { return [s, s]; })));
      h += sel('al-day', 'Day', [['', 'auto']].concat(DAYS.map(function (d) { return [d, d]; })));
      h += '<label style="display:flex;justify-content:space-between;align-items:center;margin:3px 0">Time ' +
        '<span><input id="al-time" type="time" style="width:92px;font:inherit"> <span id="al-auto" style="cursor:pointer;color:#9fd0ff" title="back to real time">auto</span></span></label>';
      h += '<label style="display:flex;justify-content:space-between;align-items:center;margin:3px 0">Date ' +
        '<span><input id="al-date" type="date" style="width:118px;font:inherit"> <span id="al-dauto" style="cursor:pointer;color:#9fd0ff" title="back to today">auto</span></span></label>';
      h += sel('al-lapse', 'Time lapse', [[1, 'real time'], [60, '1 min = 1 s'], [300, '5 min = 1 s'], [900, '15 min = 1 s'], [3600, '1 h = 1 s']]);
      h += sel('al-weather', 'Weather', [['', 'auto'], ['clear', 'clear'], ['cloudy', 'cloudy'], ['rain', 'rain'], ['snow', 'snow'], ['storm', 'storm'], ['fog', 'fog']]);
      h += sel('al-rare', 'Rare: night phone', [['', 'auto'], ['1', 'force on'], ['0', 'force off']]);
      h += sel('al-call', 'Rare: phone call', [['', 'auto'], ['1', 'force on'], ['0', 'force off']]);
      h += sel('al-nap', 'Rare: afternoon nap', [['', 'auto'], ['1', 'force on'], ['0', 'force off']]);
      h += '<div style="margin-top:6px;display:flex;gap:6px"><button id="al-restart" style="font:inherit">restart scene</button>' +
        '<button id="al-reroll" style="font:inherit">re-roll rare</button></div>' +
        '<div id="al-info" style="margin-top:8px;color:#9aa0b4"></div>';
      panel.innerHTML = h;
      LAYER.appendChild(panel);
      ['scene', 'day', 'time', 'date', 'lapse', 'weather', 'rare', 'call', 'nap', 'now', 'info'].forEach(function (k) { ui[k] = panel.querySelector('#al-' + k); });
      ui.scene.value = S.override.scene; ui.day.value = S.override.day; ui.time.value = S.override.time;
      var od0 = overrideDate(); ui.date.value = od0 ? od0.getFullYear() + '-' + ('0' + (od0.getMonth() + 1)).slice(-2) + '-' + ('0' + od0.getDate()).slice(-2) : '';
      ui.lapse.value = String(S.factor); ui.weather.value = S.override.weather; ui.rare.value = S.override.rare; ui.call.value = S.override.call; ui.nap.value = S.override.nap;
      panel.querySelector('#al-x').onclick = function () { togglePanel(false); };
      ui.scene.onchange = function () { S.override.scene = ui.scene.value; tick(true); };
      ui.day.onchange = function () { S.override.day = ui.day.value; rebase(); tick(true); };
      ui.time.onchange = function () { S.override.time = ui.time.value; rebase(); tick(true); };
      panel.querySelector('#al-auto').onclick = function () { S.override.time = ''; S.override.day = ''; ui.time.value = ''; ui.day.value = ''; rebase(); tick(true); };
      ui.date.onchange = function () { S.override.date = ui.date.value; rebase(); tick(true); };
      panel.querySelector('#al-dauto').onclick = function () { S.override.date = ''; ui.date.value = ''; rebase(); tick(true); };
      ui.lapse.onchange = function () { var c = clock(); base = { real: Date.now(), dow: c.dow, min: c.min }; S.factor = Number(ui.lapse.value) || 1; };
      ui.weather.onchange = function () { S.override.weather = ui.weather.value; tick(true); };
      ui.rare.onchange = function () { S.override.rare = ui.rare.value; tick(true); };
      ui.call.onchange = function () { S.override.call = ui.call.value; tick(true); };
      ui.nap.onchange = function () { S.override.nap = ui.nap.value; tick(true); };
      panel.querySelector('#al-restart').onclick = function () { if (!S.swapping && S.current) swapTo(S.current.id); };
      panel.querySelector('#al-reroll').onclick = function () { S.rare = Math.random() < 0.2; S.call = Math.random() < 0.15; S.nap = Math.random() < 0.12; tick(true); };
    }
    function togglePanel(on) {
      if (on == null) on = !panel;
      if (on && !panel) buildPanel();
      else if (!on && panel) { panel.remove(); panel = null; }
    }
    function updatePanel(c) {
      if (!panel) return;
      ui.now.textContent = DAYS[c.dow].toUpperCase() + ' ' + hhmm(c.min) + ' (' + O.timezone + ')' + (S.factor > 1 ? '  x' + S.factor : '');
      if (document.activeElement !== ui.time && !S.override.time) ui.time.value = hhmm(c.min);
      var until = nextChange(c.dow, c.min, ctxNow());
      ui.info.innerHTML = 'scene: <b>' + (S.current ? S.current.id : '-') + '</b>' + (S.swapping ? ' (switching)' : '') +
        '<br>next change: ' + (until != null ? hhmm(until) : '-') +
        '<br>weather: ' + weatherNow() + ' <span style="opacity:.7">[' + (S.override.weather ? 'forced' : S.weatherSource) + ']</span>' +
        '<br>sun: ' + hhmm(S.sunrise) + ' - ' + hhmm(S.sunset) + (S.override.date ? ' <span style="opacity:.7">[computed for ' + S.override.date + ']</span>' : '') +
        '<br>rare tonight: ' + (rareNow() ? 'yes' : 'no') + ' &middot; phone call: ' + (callNow() ? 'yes' : 'no') + ' &middot; nap: ' + (napNow() ? 'yes' : 'no');
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === '`' && !/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) togglePanel();
    });

    /*DEBUG-ELSE*/
    var panel = null, dbgBtn = null, panelStyle = null;   // (production: there is no debug panel)
    /*DEBUG-END*/

    // ------------------------------------------------------------- loop
    function tick(force) {
      applySun();
      var c = clock();
      if (!S.swapping) {
        var want = wantedScene(c);
        if (!S.current || S.current.id !== want) swapTo(want, !S.current);
      }
      if (S.current && S.current.handle.setUmbrella) S.current.handle.setUmbrella(/rain|storm/.test(weatherNow()));
      applyDim(c);
      /*DEBUG-START*/updatePanel(c);/*DEBUG-END*/
    }
    var last = performance.now(), raf;
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var c = clock();
      drawWeather(dt);
      drawSky(c, dt);
      drawWindow(c, dt);
      if (sky) sky.style.opacity = (S.current && S.current.def.outdoor) ? O.skyIntensity * (1 + 0.6 * overcastOf(weatherNow())) : 0;
      snowEl.style.opacity = (S.current && S.current.def.outdoor && weatherNow() === 'snow') ? 1 : 0;      // snow on the ground
      var wetNow = S.current && S.current.def.outdoor && (weatherNow() === 'rain' || weatherNow() === 'storm');   // wet ground: quick to get wet, slow to dry
      wetEl.style.transitionDuration = wetNow ? '2s' : '8s'; wetEl.style.opacity = wetNow ? 1 : 0;
      var stormNow = wetNow && weatherNow() === 'storm';
      wetEl2.style.transitionDuration = stormNow ? '2s' : '8s'; wetEl2.style.opacity = stormNow ? 1 : 0;
      raf = requestAnimationFrame(frame);
    }
    resizeSky(); resizeWx();
    global.addEventListener('resize', function () { resizeSky(); resizeWx(); applyScale(); });
    loadWeather();
    tick(true);
    var timer = setInterval(tick, 1000);
    raf = requestAnimationFrame(frame);
    /*DEBUG-START*/if (Q.has('debug') || O.debug) togglePanel(true);/*DEBUG-END*/

    // ---------------------------------------------------------- cheats (see site.js: the Konami code)
    // 'coffee': unlimited coffee. The coffee break takes over and the sips get faster (1x -> 4x) with a growing case of the jitters.
    // `onWarn` is called shortly before the peak (5 s in). At the peak (7 s in) `onPeak` is called, so the page can blow up; the same moment the scene goes back to the normal schedule
    // (or to whatever the debug panel had forced), under the cover of the explosion.
    var cheatTimer = null;
    function coffeeCheat(onPeak, onWarn) {
      if (cheatTimer) return false;                                    // already running
      var prev = S.override.scene, began = Date.now(), t0 = null, warned = false;
      S.override.scene = 'coffee';
      // Swap at once: no waiting for a walker to walk off or a cyclist to ride away. The countdown only starts when the coffee scene is
      // really on screen, so it always gets its full build-up before the peak.
      function ensure() { if (!S.swapping && (!S.current || S.current.id !== 'coffee')) swapTo('coffee', !S.current, true); }
      ensure();
      cheatTimer = setInterval(function () {
        var cur = S.current;
        if (!cur || cur.id !== 'coffee' || S.swapping) {
          ensure(); t0 = null;
          if (Date.now() - began > 15000) { clearInterval(cheatTimer); cheatTimer = null; S.override.scene = prev; tick(true); }   // it never came up: give up
          return;
        }
        if (t0 === null) t0 = Date.now();
        var el = (Date.now() - t0) / 1000;
        if (el >= 5.2 && !warned) { warned = true; try { if (onWarn) onWarn(); } catch (e) { if (global.console) console.error(e); } }   // shortly before the peak
        if (el < 7) {
          if (cur.handle.setSpeed) cur.handle.setSpeed(el < 1 ? 1 : 1 + Math.min(3, (el - 1) / 1.9));
          return;
        }
        clearInterval(cheatTimer); cheatTimer = null;
        try { if (onPeak) onPeak(); } catch (e) { if (global.console) console.error(e); }
        if (cur.handle.setSpeed) cur.handle.setSpeed(1);
        S.override.scene = prev; tick(true);
      }, 100);
      return true;
    }

    return {
      stop: function () {
        clearInterval(timer); cancelAnimationFrame(raf);
        if (S.current) S.current.handle.stop();
        [floorEl, wetEl, wetEl2, snowEl, sky, wx, winEl, tip, panel, dbgBtn, panelStyle].forEach(function (e) { if (e) e.remove(); });
        document.removeEventListener('pointermove', onMove); document.removeEventListener('click', onClick);
      },
      /*DEBUG-START*/debug: togglePanel,/*DEBUG-END*/
      cheat: function (name, onPeak, onWarn) { return name === 'coffee' ? coffeeCheat(onPeak, onWarn) : false; },   // e.g. live.cheat('coffee')
      describe: describe,                 // e.g. "Working · until 12:00", for a live status line
      state: S
    };
  }

  global.AvatarLive = { start: start, _resolve: resolve, _nextChange: nextChange, _scenes: SCENES };
})(window);
