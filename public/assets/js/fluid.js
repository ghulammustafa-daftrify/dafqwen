/* ═══════════ LIVING DESK — ink fluid hero ═══════════
   Compact GPU stable-fluids solver (advection / pressure-projection /
   dye). Custom-tinted to Daftrify brand ink: deep emerald on near-black.
   Caps DPR, pauses offscreen, static fallback under reduced motion. */
(function () {
  'use strict';
  var canvas = document.getElementById('fluidCanvas');
  if (!canvas) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function kill() { canvas.style.display = 'none'; }
  if (reduceMotion) { kill(); return; }

  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl', { alpha: false });
  if (!gl) { kill(); return; }

  var isMobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  /* half-float without linear filtering is an incomplete texture under LINEAR — fall back */
  var dyeFiltering = (function () {
    var hf = !!gl.getExtension('OES_texture_half_float');
    var lin = !!gl.getExtension('OES_texture_half_float_linear');
    return (hf && !lin) ? gl.NEAREST : gl.LINEAR;
  })();
  var SIM_RES = isMobile ? 96 : 128;
  var DYE_RES = isMobile ? 384 : 640;
  var DENSITY_DISSIPATION = 0.985;
  var VELOCITY_DISSIPATION = 0.992;
  var PRESSURE = 0.8;
  var PRESSURE_ITER = 22;
  var CURL = 26;
  var SPLAT_RADIUS = 0.22;

  function getExtension(format) {
    var ext = gl.getExtension('OES_texture_half_float');
    return { format: format, halfFloat: !!ext, supportLinearFiltering: !!gl.getExtension('OES_texture_half_float_linear') };
  }
  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
    return s;
  }
  function createProgram(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
    return p;
  }
  function getUniforms(p) {
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { u[gl.getActiveUniform(p, i).name] = gl.getUniformLocation(p, gl.getActiveUniform(p, i).name); }
    return u;
  }
  var blit = (function () {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    var elem = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elem);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    return function (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  var baseVS = 'precision highp float; attribute vec2 aPosition; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform vec2 texelSize; void main(){ vUv = aPosition * 0.5 + 0.5; vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0); vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y); gl_Position = vec4(aPosition, 0.0, 1.0); }';
  var copyFS = 'precision mediump float; varying highp vec2 vUv; uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv); }';
  var splatFS = 'precision highp float; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main(){ vec2 p = vUv - point.xy; p.x *= aspectRatio; vec3 splat = exp(-dot(p, p) / radius) * color; vec3 base = texture2D(uTarget, vUv).xyz; gl_FragColor = vec4(base + splat, 1.0); }';
  var advFS = 'precision highp float; varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation; vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize){ vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st); vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize); vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize); vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize); vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize); return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y); } void main(){ vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize; vec4 result = bilerp(uSource, coord, dyeTexelSize); float decay = 1.0 + dissipation * dt; gl_FragColor = result / decay; }';
  var divFS = 'precision mediump float; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x; float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y; vec2 C = texture2D(uVelocity, vUv).xy; if (vL.x < 0.0) { L = -C.x; } if (vR.x > 1.0) { R = -C.x; } if (vT.y > 1.0) { T = -C.y; } if (vB.y < 0.0) { B = -C.y; } float div = 0.5 * (R - L + T - B); gl_FragColor = vec4(div, 0.0, 0.0, 1.0); }';
  var curlFS = 'precision mediump float; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y; float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x; float vorticity = R - L - T + B; gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0); }';
  var vortFS = 'precision highp float; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt; void main(){ float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x; vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0; vec2 velocity = texture2D(uVelocity, vUv).xy; velocity += force * dt; velocity = min(max(velocity, -1000.0), 1000.0); gl_FragColor = vec4(velocity, 0.0, 1.0); }';
  var presFS = 'precision mediump float; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence; void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x; float divergence = texture2D(uDivergence, vUv).x; float pressure = (L + R + B + T - divergence) * 0.25; gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0); }';
  var gradFS = 'precision mediump float; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity; void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x; vec2 velocity = texture2D(uVelocity, vUv).xy; velocity.xy -= vec2(R - L, T - B); gl_FragColor = vec4(velocity, 0.0, 1.0); }';
  /* display: brand ink — dye drives emerald luminance over near-black */
  var dispFS = 'precision highp float; varying vec2 vUv; uniform sampler2D uTexture; void main(){ vec3 dye = texture2D(uTexture, vUv).rgb; float lum = dot(dye, vec3(0.299, 0.587, 0.114)); vec3 bg = vec3(0.027, 0.039, 0.035); vec3 inkDeep = vec3(0.043, 0.23, 0.17); vec3 inkGlow = vec3(0.20, 0.83, 0.60); float m = clamp(lum * 1.6, 0.0, 1.0); vec3 ink = mix(inkDeep, inkGlow, pow(m, 1.6)); vec3 col = mix(bg, ink, clamp(m * 1.15, 0.0, 1.0)); col += inkGlow * pow(m, 3.0) * 0.18; gl_FragColor = vec4(col, 1.0); }';

  var copyProg, splatProg, advProg, divProg, curlProg, vortProg, presProg, gradProg, dispProg;
  try {
    copyProg = createProgram(baseVS, copyFS);
    splatProg = createProgram(baseVS, splatFS);
    advProg = createProgram(baseVS, advFS);
    divProg = createProgram(baseVS, divFS);
    curlProg = createProgram(baseVS, curlFS);
    vortProg = createProgram(baseVS, vortFS);
    presProg = createProgram(baseVS, presFS);
    gradProg = createProgram(baseVS, gradFS);
    dispProg = createProgram(baseVS, dispFS);
  } catch (e) { kill(); return; }
  var U = {
    copy: getUniforms(copyProg), splat: getUniforms(splatProg), adv: getUniforms(advProg),
    div: getUniforms(divProg), curl: getUniforms(curlProg), vort: getUniforms(vortProg),
    pres: getUniforms(presProg), grad: getUniforms(gradProg), disp: getUniforms(dispProg)
  };

  function createFBO(w, h, filtering) {
    var ext = getExtension(gl.RGBA);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, ext.halfFloat ? gl.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture: tex, fbo: fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  }
  function createDoubleFBO(w, h, filtering) {
    var fbo1 = createFBO(w, h, filtering), fbo2 = createFBO(w, h, filtering);
    return { width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; }, set read(v) { fbo1 = v; },
      get write() { return fbo2; }, set write(v) { fbo2 = v; },
      swap: function () { var t = fbo1; fbo1 = fbo2; fbo2 = t; } };
  }

  var dye, velocity, divergence, curlF, pressure;
  function initFBOs() {
    var simW = SIM_RES, simH = Math.max(8, Math.round(SIM_RES * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    var dyeW = DYE_RES, dyeH = Math.max(8, Math.round(DYE_RES * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    dye = createDoubleFBO(dyeW, dyeH, dyeFiltering);
    velocity = createDoubleFBO(simW, simH, dyeFiltering);
    divergence = createFBO(simW, simH, gl.NEAREST);
    curlF = createFBO(simW, simH, gl.NEAREST);
    pressure = createDoubleFBO(simW, simH, gl.NEAREST);
  }

  function step(dt) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, velocity.width, velocity.height);
    gl.useProgram(curlProg); U.curl.texelSize && gl.uniform2f(U.curl.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.curl.uVelocity, velocity.read.attach(0)); blit(curlF.fbo);
    gl.useProgram(vortProg);
    gl.uniform2f(U.vort.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.vort.uVelocity, velocity.read.attach(0));
    gl.uniform1i(U.vort.uCurl, curlF.attach(1));
    gl.uniform1f(U.vort.curl, CURL); gl.uniform1f(U.vort.dt, dt);
    blit(velocity.write.fbo); velocity.swap();
    gl.useProgram(divProg);
    gl.uniform2f(U.div.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.div.uVelocity, velocity.read.attach(0)); blit(divergence.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.useProgram(presProg);
    gl.uniform2f(U.pres.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.pres.uDivergence, divergence.attach(0));
    for (var i = 0; i < PRESSURE_ITER; i++) {
      gl.uniform1i(U.pres.uPressure, pressure.read.attach(1));
      blit(pressure.write.fbo); pressure.swap();
    }
    gl.useProgram(gradProg);
    gl.uniform2f(U.grad.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.grad.uPressure, pressure.read.attach(0));
    gl.uniform1i(U.grad.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo); velocity.swap();
    gl.useProgram(advProg);
    gl.uniform2f(U.adv.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(U.adv.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(U.adv.uVelocity, velocity.read.attach(0));
    gl.uniform1i(U.adv.uSource, velocity.read.attach(1));
    gl.uniform1f(U.adv.dt, dt); gl.uniform1f(U.adv.dissipation, VELOCITY_DISSIPATION);
    blit(velocity.write.fbo); velocity.swap();
    gl.viewport(0, 0, dye.width, dye.height);
    gl.uniform2f(U.adv.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(U.adv.uVelocity, velocity.read.attach(0));
    gl.uniform1i(U.adv.uSource, dye.read.attach(1));
    gl.uniform1f(U.adv.dissipation, DENSITY_DISSIPATION);
    blit(dye.write.fbo); dye.swap();
  }
  function render() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(dispProg);
    gl.uniform1i(U.disp.uTexture, dye.read.attach(0));
    blit(null);
  }
  function splat(x, y, dx, dy, r, g, b) {
    var simAspect = velocity.width / velocity.height;
    gl.viewport(0, 0, velocity.width, velocity.height);
    gl.useProgram(splatProg);
    gl.uniform1i(U.splat.uTarget, velocity.read.attach(0));
    gl.uniform1f(U.splat.aspectRatio, simAspect);
    gl.uniform2f(U.splat.point, x, y);
    gl.uniform3f(U.splat.color, dx, dy, 0);
    gl.uniform1f(U.splat.radius, SPLAT_RADIUS / 100);
    blit(velocity.write.fbo); velocity.swap();
    gl.viewport(0, 0, dye.width, dye.height);
    gl.uniform1i(U.splat.uTarget, dye.read.attach(0));
    gl.uniform1f(U.splat.aspectRatio, dye.width / dye.height);
    gl.uniform3f(U.splat.color, r, g, b);
    gl.uniform1f(U.splat.radius, SPLAT_RADIUS / 8);
    blit(dye.write.fbo); dye.swap();
  }
  /* brand ink palette — deep emerald family */
  function inkColor() {
    var v = Math.random();
    if (v < 0.55) return [0.10 + Math.random() * 0.12, 0.55 + Math.random() * 0.25, 0.42 + Math.random() * 0.18];
    if (v < 0.85) return [0.05 + Math.random() * 0.08, 0.30 + Math.random() * 0.18, 0.26 + Math.random() * 0.12];
    return [0.16 + Math.random() * 0.10, 0.72 + Math.random() * 0.20, 0.55 + Math.random() * 0.15];
  }

  var pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, px: 0.5, py: 0.5 };
  function toSim(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.clientX - r.left) / r.width, cy = 1 - (e.clientY - r.top) / r.height;
    return { x: Math.min(1, Math.max(0, cx)), y: Math.min(1, Math.max(0, cy)) };
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var p = toSim(e);
    pointer.dx = (p.x - pointer.px) * 900;
    pointer.dy = (p.y - pointer.py) * 900;
    pointer.px = p.x; pointer.py = p.y; pointer.moved = true;
    var c = inkColor();
    splat(p.x, p.y, pointer.dx, pointer.dy, c[0] * 0.55, c[1] * 0.55, c[2] * 0.55);
  }, { passive: true });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    var w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initFBOs(); seed(); }
  }

  var running = true, visible = true, last = 0, tPrevSeed = 0;
  function seed(now) {
    for (var i = 0; i < 3; i++) {
      var c = inkColor();
      splat(0.25 + Math.random() * 0.5, 0.3 + Math.random() * 0.4,
        (Math.random() - 0.5) * 700, (Math.random() - 0.5) * 700,
        c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
    }
  }
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    var dt = Math.min((now - last) / 1000, 0.01666); last = now;
    /* ambient drift — the desk breathes even without input */
    if (now - tPrevSeed > 2600) {
      tPrevSeed = now;
      var c = inkColor(), a = Math.random() * Math.PI * 2;
      splat(0.3 + Math.random() * 0.4, 0.35 + Math.random() * 0.3,
        Math.cos(a) * 260, Math.sin(a) * 260, c[0] * 0.4, c[1] * 0.4, c[2] * 0.4);
    }
    step(dt);
    render();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { last = performance.now(); });
  window.addEventListener('resize', resize);

  try {
    resize();
    requestAnimationFrame(function (n) { last = n; requestAnimationFrame(frame); });
  } catch (e) { kill(); }
})();
