(function () {
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slug = body.dataset.app;
  const app = (typeof APPS !== 'undefined' ? APPS : []).find(function (a) { return a.slug === slug; }) || {};
  const main = document.getElementById('app');
  const portal = document.getElementById('portal');
  const back = document.getElementById('back');
  const store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  const colors = app.satellite || {};
  if (colors.accent) body.style.setProperty('--mint', colors.accent);

  /* Google Play link */
  const play = document.getElementById('play-link');
  const url = app.playStoreUrl || '#';
  play.href = url;
  if (url === '#') {
    play.removeAttribute('target');
    play.addEventListener('click', function (e) { e.preventDefault(); });
  }

  const scene = new OrbitScene(document.getElementById('card-screen'), { rings: 4, scale: 0.4, cy: 0.46, stars: 70, still: reduced, colors: colors });

  const arrived = store.get('appsnja:enter') === slug;
  store.del('appsnja:enter');

  function enter() {
    scene.resize(); scene.reset(); scene.start();
    if (window.Abyss) { Abyss.setDive(arrived && !reduced ? 0.7 : 0.15); setTimeout(function () { Abyss.setDive(0.15); }, 700); }
    portal.getAnimations().forEach(function (a) { a.cancel(); });
    portal.style.opacity = '';
    portal.animate([{ opacity: 1 }, { opacity: 0.86 }], { duration: reduced ? 1 : 1100, fill: 'forwards' });
    portal.classList.add('is-settled');
    requestAnimationFrame(function () { requestAnimationFrame(function () { main.classList.add('is-in'); }); });
  }

  let leaving = false;
  back.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    store.set('appsnja:return', slug);
    if (reduced) { location.href = back.href; return; }
    main.classList.remove('is-in');
    portal.classList.remove('is-settled');
    if (window.Abyss) Abyss.setDive(-0.8);
    portal.getAnimations().forEach(function (a) { a.cancel(); });
    portal.animate([{ opacity: 0.86 }, { opacity: 1 }], { duration: 600, fill: 'forwards' });
    setTimeout(function () { location.href = back.href; }, 650);
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') back.click(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; enter(); } });

  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1000); })]).then(enter);
  } else enter();
})();
