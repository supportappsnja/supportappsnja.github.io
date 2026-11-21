(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const cursor = document.querySelector('.cursor');
  if (!cursor || !fine || reduced) return;
  const body = document.body;
  const dot = cursor.querySelector('.cursor__dot'), ring = cursor.querySelector('.cursor__ring');
  const p = { x: 0, y: 0, rx: 0, ry: 0, on: false };
  body.classList.add('has-cursor');
  window.addEventListener('pointermove', function (e) {
    if (!p.on) { p.on = true; p.rx = e.clientX; p.ry = e.clientY; body.classList.add('cursor-on'); }
    p.x = e.clientX; p.y = e.clientY;
    const t = e.target.closest ? e.target : null;
    cursor.classList.toggle('is-open', !!(t && t.closest('.satellite')) && !body.classList.contains('is-diving'));
    cursor.classList.toggle('is-link', !!(t && t.closest('a[href]')));
  }, { passive: true });
  (function tick() {
    p.rx += (p.x - p.rx) * 0.16; p.ry += (p.y - p.ry) * 0.16;
    dot.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
    ring.style.transform = 'translate3d(' + p.rx + 'px,' + p.ry + 'px,0)';
    requestAnimationFrame(tick);
  })();
})();
