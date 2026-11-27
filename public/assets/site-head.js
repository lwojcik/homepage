// Before the first paint: restore the colours of the last visit (or guess from the clock), so
// a refresh never flashes light before dark; and never leave the page hidden if something fails.
(function () {
  // Is it dark now? Worked out BEFORE the first paint, the same way the scene script does it (night = 20 min before sunrise to 30 min after
  // sunset, in YOUR time zone), so a visit in the evening is dark from the very first frame. Sunrise and sunset come from the last weather
  // lookup if there is one, else from the date and latitude. (Keep TZ / LAT / LON in step with live-config.js.)
  var TZ = 'Europe/Warsaw', LAT = 52.2297, LON = 21.0122;
  function nightNow() {
    var now = new Date(), min, parts = {};
    var asked = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('time') || '');
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now).forEach(function (x) { parts[x.type] = x.value; });
    min = asked ? (+asked[1]) * 60 + (+asked[2]) : (+parts.hour) * 60 + (+parts.minute);
    var rise, set;
    try {
      var w = JSON.parse(localStorage.getItem('avatar-live-weather') || 'null');
      if (w && typeof w.sunrise === 'number' && typeof w.sunset === 'number' && Date.now() - w.at < 4 * 86400000) { rise = w.sunrise; set = w.sunset; }
    } catch (e) {}
    if (rise === undefined) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()), N = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      var dec = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + N) / 365), lat = LAT * Math.PI / 180;
      var half = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(dec)))) * 12 / Math.PI;
      var hr = 0; new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))).forEach(function (x) { if (x.type === 'hour') hr = +x.value; });
      var noon = 12 - LON / 15 + (hr - 12);
      rise = (noon - half) * 60; set = (noon + half) * 60;
    }
    return min < rise - 20 || min > set + 30;
  }
  var r = document.documentElement, night, bg;
  try { night = nightNow(); } catch (e) { var h = new Date().getHours(); night = h < 6 || h >= 21; }
  try { var t = JSON.parse(localStorage.getItem('avatar-live-theme') || 'null'); if (t && t.night === night) bg = t.bg; } catch (e) {}   // the saved tint (golden hour...) only if it is the same kind of time
  r.style.setProperty('--avatar-sky-bg', bg || (night ? 'rgb(28,26,23)' : 'rgb(242,244,247)'));
  r.style.setProperty('--avatar-ink', night ? '#ECE7DD' : '#1D2230');
  r.style.setProperty('--avatar-accent', night ? '#6CB0FF' : '#2457F5');
  r.style.setProperty('--avatar-on-accent', night ? '#14110E' : '#FFFFFF');
  r.style.setProperty('--avatar-card', night ? 'rgba(66,58,50,0.55)' : 'rgba(255,255,255,0.62)');
  r.style.setProperty('--avatar-card-solid', night ? '#2A2622' : '#FFFFFF');
  r.style.colorScheme = night ? 'dark' : 'light';
  r.classList.add('avatar-first');
  // Reveal the page as soon as the document is parsed and the font is in (so no flash of another font), at most 0.8 s from the start. It does NOT
  // wait for the avatar scene: that fades in by itself when it is ready. (3.5 s: the safety net, if something goes wrong.)
  var shown = false;
  function reveal() { if (shown) return; shown = true; r.classList.add('avatar-ready'); }
  setTimeout(reveal, 3500);
  function whenFont() {
    try {
      var f = document.fonts;
      Promise.race([Promise.all([f.load('400 1em "Source Sans 3"'), f.load('700 1em "Source Sans 3"')]), new Promise(function (res) { setTimeout(res, 800); })]).then(reveal, reveal);
    } catch (e) { reveal(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenFont); else whenFont();

  // Astro's ClientRouter swaps <html>'s attributes on navigation: put the theme and the "ready" class back at once,
  // so a page change never flashes.
  if (!window.__themeSwapBound) {
    window.__themeSwapBound = true;
    // Carry the live theme (inline CSS variables, classes, data-*) into the incoming document BEFORE it is swapped in,
    // so the new page is never rendered with the light fallback colours and then transitioned to the dark ones.
    document.addEventListener('astro:before-swap', function (e) {
      var from = document.documentElement, to = e.newDocument.documentElement;
      to.setAttribute('style', from.getAttribute('style') || '');
      to.className = from.className;
      if (from.dataset.avatarTime) to.dataset.avatarTime = from.dataset.avatarTime;
      to.classList.add('avatar-ready', 'avatar-settled');
    });
    document.addEventListener('astro:after-swap', function () {
      var root = document.documentElement;
      root.classList.add('avatar-ready', 'avatar-settled');
      try {
        var t = JSON.parse(localStorage.getItem('avatar-live-theme') || 'null');
        if (t) {
          var night = t.night;
          root.style.setProperty('--avatar-sky-bg', t.bg);
          root.style.colorScheme = night ? 'dark' : 'light';
          root.style.setProperty('--avatar-ink', night ? '#ECE7DD' : '#1D2230');
          root.style.setProperty('--avatar-accent', night ? '#6CB0FF' : '#2457F5');
          root.style.setProperty('--avatar-on-accent', night ? '#14110E' : '#FFFFFF');
          root.style.setProperty('--avatar-card', night ? 'rgba(66,58,50,0.55)' : 'rgba(255,255,255,0.62)');
          root.style.setProperty('--avatar-card-solid', night ? '#2A2622' : '#FFFFFF');
        }
      } catch (e) {}
    });
  }
})();
