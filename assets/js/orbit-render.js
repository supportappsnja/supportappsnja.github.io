/* Orbit Snake miniature: a neon snake travelling on concentric rings. */
(function () {
  function rgb(hex, fallback) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  function OrbitScene(canvas, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({ rings: 3, cy: 0.5, scale: 0.44, stars: 0, still: false, colors: {} }, opts || {});
    const c = this.o.colors;
    this.MINT = rgb(c.accent, '93,255,176'); this.CORE = rgb(c.core, '126,200,255');
    this.ORB = rgb(c.orb, '255,213,106'); this.RING = rgb(c.ring, '80,120,180');
    this.running = false;
    this.last = 0;
    this.t = 0;
    this.resize();
    this.reset();
  }

  OrbitScene.prototype.resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.c.getBoundingClientRect();
    const w = Math.max(1, Math.round((r.width || this.c.width) * dpr));
    const h = Math.max(1, Math.round((r.height || this.c.height) * dpr));
    const changed = this.c.width !== w || this.c.height !== h;
    if (changed) { this.c.width = w; this.c.height = h; }
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h * this.o.cy;
    this.R = Math.min(w, h) * this.o.scale;
    this.radii = [];
    for (let i = 0; i < this.o.rings; i++) this.radii.push(this.R * (0.34 + 0.66 * (i + 1) / this.o.rings));
    this.u = this.R / 100;
    this.starField = [];
    for (let i = 0; i < this.o.stars; i++) this.starField.push([Math.random() * w, Math.random() * h, Math.random()]);
    if (changed && this.trail) this.reset();
  };

  OrbitScene.prototype.reset = function () {
    const s = this;
    s.ring = Math.min(1, s.o.rings - 1);
    s.r = s.radii[s.ring];
    s.rFrom = s.r; s.rTo = s.r; s.jumpT = 1;
    s.theta = Math.random() * Math.PI * 2;
    s.dir = 1;
    s.trail = [];
    s.len = 85 * s.u;
    s.nextJump = 1.4 + Math.random() * 1.6;
    s.flash = 0;
    s.spawnOrb();
    s.rock = { a: Math.random() * 6.28, d: s.R * 1.4, spin: 0, ring: s.o.rings - 1 };
  };

  OrbitScene.prototype.spawnOrb = function () {
    const ring = Math.floor(Math.random() * this.o.rings);
    this.orb = { ring: ring, a: this.theta + this.dir * (1.2 + Math.random() * 2.6) };
  };

  OrbitScene.prototype.step = function (dt) {
    const s = this;
    s.t += dt;
    s.nextJump -= dt;
    if (s.nextJump <= 0 && s.jumpT >= 1) {
      let n = s.ring + (Math.random() < 0.5 ? -1 : 1);
      if (n < 0) n = 1; if (n >= s.o.rings) n = s.o.rings - 2;
      if (s.o.rings < 2) n = 0;
      s.ring = n; s.rFrom = s.r; s.rTo = s.radii[n]; s.jumpT = 0;
      s.nextJump = 1.6 + Math.random() * 2.2;
    }
    if (s.jumpT < 1) {
      s.jumpT = Math.min(1, s.jumpT + dt / 0.32);
      const k = s.jumpT < 0.5 ? 2 * s.jumpT * s.jumpT : 1 - Math.pow(-2 * s.jumpT + 2, 2) / 2;
      s.r = s.rFrom + (s.rTo - s.rFrom) * k;
    }
    const speed = 62 * s.u;
    s.theta += s.dir * speed * dt / Math.max(s.r, 1);
    const hx = s.cx + Math.cos(s.theta) * s.r, hy = s.cy + Math.sin(s.theta) * s.r;
    const lp = s.trail[s.trail.length - 1];
    if (!lp || Math.hypot(hx - lp[0], hy - lp[1]) > 1.2 * s.u) s.trail.push([hx, hy]);
    let acc = 0;
    for (let i = s.trail.length - 1; i > 0; i--) {
      acc += Math.hypot(s.trail[i][0] - s.trail[i - 1][0], s.trail[i][1] - s.trail[i - 1][1]);
      if (acc > s.len) { s.trail.splice(0, i - 1); break; }
    }
    const or = s.radii[s.orb.ring];
    const ox = s.cx + Math.cos(s.orb.a) * or, oy = s.cy + Math.sin(s.orb.a) * or;
    if (Math.hypot(hx - ox, hy - oy) < 7 * s.u) {
      s.flash = 1;
      s.len = Math.min(s.len + 12 * s.u, 120 * s.u);
      if (s.len >= 120 * s.u) s.len = 85 * s.u;
      s.spawnOrb();
    }
    s.flash = Math.max(0, s.flash - dt * 2.5);
    s.rock.a -= dt * 0.35; s.rock.spin += dt * 1.3;
  };

  OrbitScene.prototype.draw = function () {
    const s = this, g = s.ctx, u = s.u;
    const MINT = s.MINT, CORE = s.CORE, ORB = s.ORB, RING = s.RING;
    g.clearRect(0, 0, s.w, s.h);
    for (const st of s.starField) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(s.t * 0.6 + st[2] * 20));
      g.fillStyle = 'rgba(231,236,244,' + (0.08 + 0.25 * st[2] * tw) + ')';
      g.fillRect(st[0], st[1], 1.2, 1.2);
    }
    for (let i = 0; i < s.radii.length; i++) {
      g.beginPath(); g.arc(s.cx, s.cy, s.radii[i], 0, Math.PI * 2);
      g.strokeStyle = 'rgba(' + RING + ',' + (i === s.ring ? 0.75 : 0.42) + ')';
      g.lineWidth = Math.max(1, 1.1 * u);
      g.stroke();
    }
    const cg = g.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, 22 * u);
    cg.addColorStop(0, 'rgba(' + CORE + ',.9)'); cg.addColorStop(0.35, 'rgba(' + CORE + ',.35)'); cg.addColorStop(1, 'rgba(' + CORE + ',0)');
    g.fillStyle = cg; g.beginPath(); g.arc(s.cx, s.cy, 22 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(' + CORE + ',1)'; g.beginPath(); g.arc(s.cx, s.cy, 7 * u, 0, Math.PI * 2); g.fill();

    const or = s.radii[s.orb.ring];
    const ox = s.cx + Math.cos(s.orb.a) * or, oy = s.cy + Math.sin(s.orb.a) * or;
    const pulse = 1 + 0.18 * Math.sin(s.t * 5);
    g.shadowColor = 'rgba(' + ORB + ',1)'; g.shadowBlur = 12 * u;
    g.fillStyle = 'rgba(' + ORB + ',1)'; g.beginPath(); g.arc(ox, oy, 4.2 * u * pulse, 0, Math.PI * 2); g.fill();

    const rr = s.R * 1.12, rx = s.cx + Math.cos(s.rock.a) * rr, ry = s.cy + Math.sin(s.rock.a) * rr * 0.92;
    g.shadowBlur = 0;
    g.save(); g.translate(rx, ry); g.rotate(s.rock.spin);
    g.fillStyle = 'rgba(150,140,130,.55)'; g.beginPath();
    const pts = [[6, 0], [3, 5], [-3, 5.5], [-6.5, 1], [-4, -5], [2, -5.5]];
    pts.forEach(function (p, i) { if (i) g.lineTo(p[0] * u, p[1] * u); else g.moveTo(p[0] * u, p[1] * u); });
    g.closePath(); g.fill(); g.restore();

    const tr = s.trail, n = tr.length;
    if (n > 1) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = 'rgba(' + MINT + ',1)'; g.shadowBlur = (10 + 10 * s.flash) * u;
      const chunks = 6, per = Math.ceil(n / chunks);
      for (let c = 0; c < chunks; c++) {
        const a0 = c * per, a1 = Math.min(n - 1, (c + 1) * per);
        if (a1 <= a0) continue;
        const k = (c + 1) / chunks;
        g.beginPath(); g.moveTo(tr[a0][0], tr[a0][1]);
        for (let i = a0 + 1; i <= a1; i++) g.lineTo(tr[i][0], tr[i][1]);
        g.strokeStyle = 'rgba(' + MINT + ',' + (0.25 + 0.75 * k) + ')';
        g.lineWidth = (2.5 + 4 * k) * u;
        g.stroke();
      }
      const h = tr[n - 1];
      g.fillStyle = '#eafff4'; g.beginPath(); g.arc(h[0], h[1], 4.6 * u, 0, Math.PI * 2); g.fill();
    }
    g.shadowBlur = 0;
  };

  OrbitScene.prototype.frame = function (now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.step(dt); this.draw();
    requestAnimationFrame(this._f);
  };

  OrbitScene.prototype.start = function () {
    if (this.o.still) { for (let i = 0; i < 90; i++) this.step(1 / 30); this.draw(); return; }
    if (this.running) return;
    this.running = true; this.last = 0;
    this._f = this._f || this.frame.bind(this);
    requestAnimationFrame(this._f);
  };

  OrbitScene.prototype.stop = function () { this.running = false; };

  window.OrbitScene = OrbitScene;
})();
