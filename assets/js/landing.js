(function () {
  const root = document.documentElement, body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const landing = document.getElementById('landing');
  const wrap = document.getElementById('satellites');
  const tpl = document.getElementById('satellite-template');
  const portal = document.getElementById('portal');
  const depthEl = document.getElementById('depth');
  const apps = (typeof APPS !== 'undefined' ? APPS : []).filter(function (a) { return a && a.slug && a.name; });
  const store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  /* Tagline */
  if (typeof TAGLINE_LEAD === 'string' && TAGLINE_LEAD.trim()) document.getElementById('tagline-lead').textContent = TAGLINE_LEAD.trim();

  /* Transmissions: one line per app, looping */
  (function () {
    const list = apps.filter(function (a) { return a.transmission; });
    const box = document.getElementById('tx'), meta = document.getElementById('tx-meta'), lineEl = document.getElementById('tx-line');
    if (!list.length) { box.hidden = true; return; }
    const GLYPHS = '#%&*+=<>/\\|01ABCDEFXYZ';
    const head = function (i) { return 'SIGNAL ' + String(apps.indexOf(list[i]) + 1).padStart(3, '0') + ' \u2014 ' + String(list[i].name).toUpperCase(); };
    const esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    document.getElementById('tx-static').textContent = list.map(function (t, i) { return head(i) + ': ' + t.transmission; }).join(' ');
    function paint(text, upto, noise, caret) {
      let out = '';
      for (let k = 0; k < text.length; k++) {
        const ch = text[k];
        if (k < upto) out += esc(ch);
        else if (k < upto + noise && ch !== ' ') out += '<span class="g">' + GLYPHS[Math.floor(Math.random() * GLYPHS.length)] + '</span>';
        else if (k < upto + noise) out += ' ';
      }
      lineEl.innerHTML = '<span class="p">&gt; </span>' + out + (caret ? '<span class="caret"></span>' : '');
    }
    if (reduced) { meta.textContent = head(0); paint(list[0].transmission, list[0].transmission.length, 0, false); return; }
    let i = 0;
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const frames = function (ms, fn) {
      return new Promise(function (res) {
        const t0 = performance.now();
        (function f(now) { const k = Math.min(1, Math.max(0, (now - t0) / ms)); fn(k); if (k < 1) requestAnimationFrame(f); else res(); })(t0);
      });
    };
    (async function loop() {
      await wait(1800);
      for (;;) {
        const text = String(list[i].transmission);
        meta.textContent = head(i); meta.style.opacity = 1;
        lineEl.style.opacity = 1; box.classList.remove('is-glitch');
        await frames(Math.max(900, text.length * 45), function (k) { paint(text, Math.floor(k * text.length), 6, true); });
        paint(text, text.length, 0, true);
        await wait(3600);
        box.classList.add('is-glitch');
        await frames(650, function (k) {
          paint(text, Math.floor((1 - k) * text.length), Math.ceil(k * 10), false);
          lineEl.style.opacity = String(1 - k * 0.7);
        });
        box.classList.remove('is-glitch');
        lineEl.innerHTML = ''; meta.style.opacity = 0;
        await wait(1300);
        i = (i + 1) % list.length;
      }
    })();
  })();

  /* Satellites: one per app */
  const sats = apps.map(function (app, i) {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.href = app.slug + '/';
    el.setAttribute('aria-label', 'Open ' + app.name);
    el.dataset.slug = app.slug;
    el.querySelector('.satellite__name').textContent = app.name;
    const c = app.satellite || {};
    if (c.accent) el.style.setProperty('--accent', c.accent);
    if (c.core) el.style.setProperty('--core', c.core);
    if (c.orb) el.style.setProperty('--orb', c.orb);
    el.style.setProperty('--spin', (22 + i * 7) + 's');
    wrap.appendChild(el);
    const scene = new OrbitScene(el.querySelector('canvas'), { rings: 3, scale: 0.4, still: reduced, colors: c });
    return { el: el, app: app, scene: scene, pos: null, depth: 1 + (i % 3) * 0.35 };
  });

  function textRects() {
    const out = [];
    landing.querySelectorAll('.hero, .brand, .tx, .hud--bottom > *').forEach(function (el) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) out.push({ l: r.left - 28, t: r.top - 28, r: r.right + 28, b: r.bottom + 28 });
    });
    return out;
  }
  function boxAt(s, x, y) {
    const w = s.el.offsetWidth;
    return { l: x - w * 0.9, r: x + w * 0.9, t: y - w * 0.75, b: y + w * 0.5 + 58 };
  }
  function fits(s, x, y, avoid) {
    const b = boxAt(s, x, y), W = innerWidth, H = innerHeight, m = Math.max(16, W * 0.035);
    if (b.l < m || b.t < m || b.r > W - m || b.b > H - m) return false;
    for (const a of avoid) if (b.l < a.r && b.r > a.l && b.t < a.b && b.b > a.t) return false;
    return true;
  }
  function apply(s) { s.el.style.setProperty('--x', s.pos.x + 'px'); s.el.style.setProperty('--y', s.pos.y + 'px'); }
  function placeAll(force) {
    const avoid = textRects();
    if (!force && sats.every(function (s, i) {
      const others = sats.filter(function (o, j) { return j !== i && o.pos; }).map(function (o) { return boxAt(o, o.pos.x, o.pos.y); });
      return s.pos && fits(s, s.pos.x, s.pos.y, avoid.concat(others));
    })) return sats.forEach(apply);
    const scales = [1, 0.85, 0.72, 0.6, 0.5];
    for (let si = 0; si < scales.length; si++) {
      wrap.style.setProperty('--sat-scale', scales[si]);
      const taken = avoid.slice();
      let ok = true;
      for (const s of sats) {
        let p = null;
        for (let k = 0; k < 600 && !p; k++) {
          const x = Math.random() * innerWidth, y = Math.random() * innerHeight;
          if (fits(s, x, y, taken)) p = { x: x, y: y };
        }
        if (!p) { ok = false; break; }
        s.pos = p; taken.push(boxAt(s, p.x, p.y));
      }
      if (ok) { sats.forEach(apply); return; }
    }
    sats.forEach(function (s, i) {
      s.pos = { x: innerWidth * (0.2 + 0.3 * (i % 3)), y: innerHeight * (0.22 + 0.16 * Math.floor(i / 3)) };
      apply(s);
    });
  }

  /* Parallax and depth counter */
  const ptr = { nx: 0, ny: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) {
    ptr.nx = e.clientX / innerWidth * 2 - 1; ptr.ny = e.clientY / innerHeight * 2 - 1;
    if (window.Abyss) Abyss.setMouse(ptr.nx, -ptr.ny);
  }, { passive: true });
  let depth = -1;
  function tick() {
    ptr.sx += (ptr.nx - ptr.sx) * 0.05; ptr.sy += (ptr.ny - ptr.sy) * 0.05;
    sats.forEach(function (s) {
      s.el.style.setProperty('--px', (ptr.sx * -18 * s.depth).toFixed(2) + 'px');
      s.el.style.setProperty('--py', (ptr.sy * -14 * s.depth).toFixed(2) + 'px');
    });
    const d = window.Abyss ? Math.max(0, Math.floor(Abyss.travel * 37)) : 0;
    if (d !== depth) { depth = d; depthEl.textContent = String(d).padStart(4, '0'); }
    requestAnimationFrame(tick);
  }
  if (!reduced) requestAnimationFrame(tick); else depthEl.textContent = '0111';

  /* Transitions */
  function center(s) {
    const r = s.el.querySelector('.satellite__body').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rad: r.width / 2 };
  }
  function far(c) { return Math.hypot(Math.max(c.x, innerWidth - c.x), Math.max(c.y, innerHeight - c.y)) + 20; }
  function circle(r, c) { return 'circle(' + r + 'px at ' + c.x + 'px ' + c.y + 'px)'; }
  let leaving = false;

  sats.forEach(function (s) {
    s.el.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      const href = s.el.href, c = center(s);
      store.set('appsnja:enter', s.app.slug);
      if (reduced) { location.href = href; return; }
      portal.style.setProperty('--cx', c.x + 'px'); portal.style.setProperty('--cy', c.y + 'px');
      portal.classList.add('is-active');
      body.classList.add('is-diving');
      if (window.Abyss) Abyss.setDive(1);
      portal.animate([
        { clipPath: circle(c.rad, c) },
        { clipPath: circle(c.rad * 1.4, c), offset: 0.25 },
        { clipPath: circle(far(c), c) }
      ], { duration: 1200, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      setTimeout(function () { location.href = href; }, 1150);
    });
  });

  function reset() {
    leaving = false;
    body.classList.remove('is-diving');
    portal.getAnimations().forEach(function (a) { a.cancel(); });
    portal.classList.remove('is-active');
    root.classList.remove('is-return');
    if (window.Abyss) Abyss.setDive(0);
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) reset(); });

  function returnFrom(slug) {
    store.del('appsnja:return');
    const s = sats.find(function (x) { return x.app.slug === slug; }) || sats[0];
    if (!s || reduced) { root.classList.remove('is-return'); return; }
    const c = center(s);
    portal.style.setProperty('--cx', c.x + 'px'); portal.style.setProperty('--cy', c.y + 'px');
    portal.classList.add('is-active');
    root.classList.remove('is-return');
    const a = portal.animate([
      { clipPath: circle(far(c), c) },
      { clipPath: circle(c.rad, c) }
    ], { duration: 1100, delay: 150, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    a.onfinish = function () { portal.classList.remove('is-active'); a.cancel(); };
  }

  let rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { placeAll(false); sats.forEach(function (s) { s.scene.resize(); }); }, 120);
  });

  function boot() {
    placeAll(true);
    sats.forEach(function (s) { s.scene.resize(); s.scene.reset(); s.scene.start(); });
    const back = store.get('appsnja:return');
    if (back) returnFrom(back); else root.classList.remove('is-return');
    requestAnimationFrame(function () { body.classList.remove('is-intro'); });
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]).then(boot);
  } else boot();
})();
