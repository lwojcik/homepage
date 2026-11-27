// One place for the living-background settings, shared by every page.
// With Astro's ClientRouter this file is loaded once; the avatar keeps running while you navigate.
(function () {
  // A "plain" page (the CV, <html data-plain>) shows no avatar, sky or weather and runs no animation, so nothing is started there. The
  // living background starts the first time a normal page is shown (also when you click through from a plain page).
  function startLive() {
    if (window.live || document.documentElement.hasAttribute('data-plain')) return;
    var config = {
      timezone: 'Europe/Warsaw',        // YOUR time zone: the scene follows your day
      lat: 52.2297, lon: 21.0122,       // used for the weather and sunrise / sunset
      // The window in the corner hides only when it would sit on the text column (<main> itself spans the whole screen).
      avoid: 'main > :not(nav), .page > *, [data-avatar-avoid]',
      // The window in the corner needs room beside the text column and its soft edge: below this width it is not shown at all.
      windowMinWidth: 1300
    };
    // The weather comes from YOUR address, which the host forwards to Open-Meteo (the rewrite in public/_redirects), so visitors never contact
    // Open-Meteo themselves. The page sends the Warsaw coordinates above. On localhost there is no rewrite, so there it calls Open-Meteo directly.
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) config.weatherUrl = '/api/weather';
    window.live = AvatarLive.start(config);
  }
  startLive();

  // Runs on the first load and after every client-side navigation: wire up what the new page contains.
  function bindPage() {
    startLive();
    document.querySelectorAll('[data-open-debug]').forEach(function (a) {
      if (a.dataset.bound) return; a.dataset.bound = '1';          // never bind the same link twice
      a.addEventListener('click', function (e) { e.preventDefault(); if (window.live && window.live.debug) window.live.debug(); });   // (no debug panel in production)
    });
  }
  if (!window.__liveBound) { window.__liveBound = true; document.addEventListener('astro:page-load', bindPage); }
  bindPage();
})();
