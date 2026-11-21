/* The abyss: a slow descent into a dark shaft, rendered with a single fragment shader. */
(function () {
  const canvas = document.getElementById('abyss');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = { travel: 0, dive: 0, ready: false, setDive: function (v) { target.dive = v; }, setMouse: function (x, y) { target.mx = x; target.my = y; } };
  const target = { dive: 0, mx: 0, my: 0 };
  const introDir = document.documentElement.classList.contains('is-return') ? -1 : 1;
  if (introDir < 0) api.travel = 4;
  window.Abyss = api;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return;

  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform float uTravel;uniform vec2 uMouse;uniform float uDive;',
    'float h1(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);',
    ' return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),',
    '  mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);',
    ' vec2 p=uv-uMouse*.10;',
    ' float r=length(p);float a=atan(p.y,p.x);',
    ' float z=.34/(r+.015);',
    ' float tz=z+uTravel;',
    ' vec3 q=vec3(cos(a)*1.7,sin(a)*1.7,tz*1.1);',
    ' float w=fbm(q);',
    ' float w2=fbm(q*2.3+vec3(0.,0.,uTime*.02));',
    ' float strata=.5+.5*sin(tz*7.+w*5.);',
    ' float rock=w*.75+strata*.22+w2*.25;',
    ' float fog=exp(-z*.46);',
    ' vec3 deep=vec3(.006,.008,.014);',
    ' vec3 wall=vec3(.19,.23,.29);',
    ' vec3 col=mix(deep,wall,clamp(rock*fog*1.15,0.,1.));',
    ' col+=vec3(.04,.11,.13)*pow(fog,2.6)*w2;',
    ' float ridge=smoothstep(.62,.7,w)*fog;col+=vec3(.12,.16,.2)*ridge*.6;',
    ' float core=smoothstep(.22,0.,r);col+=vec3(.01,.05,.045)*core*(.6+uDive*1.6);',
    ' vec2 g=vec2(a*6.3662,tz*5.);vec2 id=floor(g);vec2 f=fract(g)-.5;float hs=h2(id);',
    ' vec2 o=vec2(h2(id+3.1),h2(id+7.7))-.5;float d=length((f-o*.6)*vec2(1.,1.));',
    ' float mote=step(.86,hs)*smoothstep(.07,.0,d)*fog*(.5+.5*sin(uTime*1.5+hs*40.));',
    ' col+=vec3(.55,.75,.8)*mote*.55;',
    ' float streak=step(.9,hs)*smoothstep(.04,.0,abs(f.x-o.x*.6))*smoothstep(.5,.0,abs(f.y))*uDive*fog;',
    ' col+=vec3(.4,1.,.75)*streak*.5;',
    ' col*=smoothstep(1.35,.15,length(uv));',
    ' col+=(h2(gl_FragCoord.xy+fract(uTime*7.)*91.)-.5)*.022;',
    ' col=pow(col,vec3(.95));',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uTime', 'uTravel', 'uMouse', 'uDive'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  let quality = 0.62;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth * dpr * quality), h = Math.round(window.innerHeight * dpr * quality);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  window.addEventListener('resize', resize);
  resize();

  const st = { mx: 0, my: 0, time: 0 };
  let last = 0, slow = 0;
  function render() {
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, st.time);
    gl.uniform1f(U.uTravel, api.travel);
    gl.uniform2f(U.uMouse, st.mx, st.my);
    gl.uniform1f(U.uDive, api.dive);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (dt > 0.034) { slow++; if (slow > 40 && quality > 0.4) { quality -= 0.1; slow = 0; resize(); } } else slow = Math.max(0, slow - 1);
    st.time += dt;
    api.dive += (target.dive - api.dive) * Math.min(1, dt * 2.2);
    st.mx += (target.mx - st.mx) * Math.min(1, dt * 2.5);
    st.my += (target.my - st.my) * Math.min(1, dt * 2.5);
    const intro = Math.max(0, 1 - st.time / 3.2);
    api.travel += dt * (0.05 + api.dive * 1.6 + introDir * intro * intro * 1.2);
    render();
    if (!document.hidden) requestAnimationFrame(frame); else last = 0;
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !reduced) requestAnimationFrame(frame); });
  api.ready = true;
  if (reduced) {
    api.travel = 3.0 + Math.max(0, api.travel); render();
    window.addEventListener('resize', render);
  } else {
    requestAnimationFrame(frame);
  }
})();
