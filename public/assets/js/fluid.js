/* Daftrify v3 — "one living surface": fixed full-viewport stable-fluid ink canvas.
   Pointer-reactive across the whole page; scroll-driven moods via DeskFluid.setMood().
   Fallbacks: no WebGL / reduced motion -> canvas hidden, CSS gradient behind shows. */
(function () {
  'use strict';
  var canvas = document.getElementById('fluid');
  if (!canvas) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getWebGLContext(cv) {
    var params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    var gl = cv.getContext('webgl2', params);
    var isWebGL2 = !!gl;
    if (!isWebGL2) gl = cv.getContext('webgl', params) || cv.getContext('experimental-webgl', params);
    var halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0, 0, 0, 1);
    var halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);
    var formatRGBA, formatRG, formatR;
    if (isWebGL2) { formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType); formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType); formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType); }
    else { formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType); formatRG = formatRGBA; formatR = formatRGBA; }
    return { gl: gl, ext: { formatRGBA: formatRGBA, formatRG: formatRG, formatR: formatR, halfFloatTexType: halfFloatTexType, supportLinearFiltering: supportLinearFiltering } };
  }
  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat: internalFormat, format: format };
  }
  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }

  var ctx = getWebGLContext(canvas);
  var gl = ctx.gl, ext = ctx.ext;
  if (!ext.formatRGBA || reduceMotion) { canvas.style.display = 'none'; return; }

  function compileShader(type, source) {
    var s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    return s;
  }
  function createProgram(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }
  function getUniforms(program) {
    var u = {}, count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) { var n = gl.getActiveUniform(program, i).name; u[n] = gl.getUniformLocation(program, n); }
    return u;
  }
  var baseVertexShader = 'precision highp float;attribute vec2 aPosition;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 texelSize;void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);gl_Position=vec4(aPosition,0.0,1.0);}';
  var copyShader = 'precision highp float;precision highp sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}';
  var splatShader = 'precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}',
    advectionShader = 'precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 texelSize;uniform vec2 dyeTexelSize;uniform float dt;uniform float dissipation;vec4 bilerp(sampler2D sam,vec2 uv,vec2 tsize){vec2 st=uv/tsize-0.5;vec2 i=floor(st);vec2 f=fract(st);vec4 a=texture2D(sam,(i+vec2(0.5,0.5))*tsize);vec4 b=texture2D(sam,(i+vec2(1.5,0.5))*tsize);vec4 c=texture2D(sam,(i+vec2(0.5,1.5))*tsize);vec4 d=texture2D(sam,(i+vec2(1.5,1.5))*tsize);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}void main(){vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;vec4 result=bilerp(uSource,coord,dyeTexelSize);float decay=1.0+dissipation*dt;gl_FragColor=result/decay;}',
    divergenceShader = 'precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;varying highp vec2 vL;varying highp vec2 vR;varying highp vec2 vT;varying highp vec2 vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x;float R=texture2D(uVelocity,vR).x;float T=texture2D(uVelocity,vT).y;float B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.0){L=-C.x;}if(vR.x>1.0){R=-C.x;}if(vT.y>1.0){T=-C.y;}if(vB.y<0.0){B=-C.y;}float div=0.5*(R-L+T-B);gl_FragColor=vec4(div,0.0,0.0,1.0);}',
    curlShader = 'precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;varying highp vec2 vL;varying highp vec2 vR;varying highp vec2 vT;varying highp vec2 vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;float vorticity=R-L-T+B;gl_FragColor=vec4(0.5*vorticity,0.0,0.0,1.0);}',
    vorticityShader = 'precision highp float;precision highp sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;uniform float curl;uniform float dt;void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));force/=length(force)+0.0001;force*=curl*C;force.y*=-1.0;vec2 velocity=texture2D(uVelocity,vUv).xy;velocity+=force*dt;velocity=min(max(velocity,-1000.0),1000.0);gl_FragColor=vec4(velocity,0.0,1.0);}',
    pressureShader = 'precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;varying highp vec2 vL;varying highp vec2 vR;varying highp vec2 vT;varying highp vec2 vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;float divergence=texture2D(uDivergence,vUv).x;float pressure=(L+R+B+T-divergence)*0.25;gl_FragColor=vec4(pressure,0.0,0.0,1.0);}',
    gradientSubtractShader = 'precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;varying highp vec2 vL;varying highp vec2 vR;varying highp vec2 vT;varying highp vec2 vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;vec2 velocity=texture2D(uVelocity,vUv).xy;velocity.xy-=vec2(R-L,T-B);gl_FragColor=vec4(velocity,0.0,1.0);}',
    displayShader = 'precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTexture;void main(){vec3 c=texture2D(uTexture,vUv).rgb;vec3 base=vec3(0.008,0.020,0.016);float l=dot(c,vec3(0.299,0.587,0.114));vec3 ink=mix(base,vec3(0.03,0.22,0.13),smoothstep(0.03,0.7,l));ink=mix(ink,vec3(0.30,0.80,0.52),smoothstep(0.9,2.4,l));vec3 vig=mix(vec3(1.0),vec3(0.72),dot(vUv-0.5,vUv-0.5)*2.2);gl_FragColor=vec4((base*(1.0-smoothstep(0.0,0.5,l))+ink)*vig,1.0);}';

  var blit = (function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    return function (target, clear) {
      if (target == null) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
      if (clear) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  var copyProgram = createProgram(baseVertexShader, copyShader),
    splatProgram = createProgram(baseVertexShader, splatShader),
    advectionProgram = createProgram(baseVertexShader, advectionShader),
    divergenceProgram = createProgram(baseVertexShader, divergenceShader),
    curlProgram = createProgram(baseVertexShader, curlShader),
    vorticityProgram = createProgram(baseVertexShader, vorticityShader),
    pressureProgram = createProgram(baseVertexShader, pressureShader),
    gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader),
    displayProgram = createProgram(baseVertexShader, displayShader);
  var copyU = getUniforms(copyProgram), splatU = getUniforms(splatProgram), advectionU = getUniforms(advectionProgram),
    divergenceU = getUniforms(divergenceProgram), curlU = getUniforms(curlProgram), vorticityU = getUniforms(vorticityProgram),
    pressureU = getUniforms(pressureProgram), gradientSubtractU = getUniforms(gradientSubtractProgram), displayU = getUniforms(displayProgram);

  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture: texture, fbo: fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
  }
  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    var fbo1 = createFBO(w, h, internalFormat, format, type, param), fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return { width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; }, set read(v) { fbo1 = v; }, get write() { return fbo2; }, set write(v) { fbo2 = v; },
      swap: function () { var t = fbo1; fbo1 = fbo2; fbo2 = t; } };
  }
  function getResolution(resolution) {
    var aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    var min = Math.round(resolution), max = Math.round(resolution * aspect);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
    return { width: min, height: max };
  }

  var dye, velocity, divergence, curl, pressure;
  function initFramebuffers() {
    var simRes = getResolution(128), dyeRes = getResolution(512);
    var texType = ext.halfFloatTexType, filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = createDoubleFBO(dyeRes.width, dyeRes.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, texType, filtering);
    velocity = createDoubleFBO(simRes.width, simRes.height, ext.formatRG.internalFormat, ext.formatRG.format, texType, filtering);
    divergence = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
  }
  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.floor(dpr * window.innerWidth), h = Math.floor(dpr * window.innerHeight);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initFramebuffers(); return true; }
    return false;
  }
  resizeCanvas(); initFramebuffers();

  /* ——— moods ——— */
  var MOODS = {
    wild:   { interval: 3500, force: 5200, density: 0.50, velocity: 0.25, curl: 28 },
    drift:  { interval: 6000, force: 3800, density: 0.42, velocity: 0.30, curl: 20 },
    settle: { interval: 9000, force: 2600, density: 0.35, velocity: 0.35, curl: 12 },
    simmer: { interval: 7500, force: 3200, density: 0.40, velocity: 0.30, curl: 18 },
    still:  { interval: 0,    force: 1800, density: 0.30, velocity: 0.40, curl: 8  }
  };
  var cur = { interval: 3500, force: 5200, density: 0.50, velocity: 0.25, curl: 28 };
  var tgt = MOODS.wild;
  window.DeskFluid = { setMood: function (n) { if (MOODS[n]) tgt = MOODS[n]; } };

  /* ——— palette: deep emerald inks ——— */
  var PALETTE = [
    [0.05, 0.42, 0.26], [0.10, 0.62, 0.38], [0.30, 0.85, 0.58],
    [0.04, 0.30, 0.30], [0.16, 0.72, 0.44]
  ];
  function inkColor() {
    var c = PALETTE[(Math.random() * PALETTE.length) | 0];
    var v = 0.55 + Math.random() * 0.35;
    return { r: c[0] * v, g: c[1] * v, b: c[2] * v };
  }

  var pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, down: false };
  function toSim(e) { return { x: e.clientX / window.innerWidth, y: 1 - e.clientY / window.innerHeight }; }
  window.addEventListener('pointermove', function (e) {
    var p = toSim(e);
    pointer.dx = (p.x - pointer.x) * 900;
    pointer.dy = (p.y - pointer.y) * 900;
    pointer.x = p.x; pointer.y = p.y; pointer.moved = true;
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) { var p = toSim(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true; }, { passive: true });
  window.addEventListener('pointerup', function () { pointer.down = false; }, { passive: true });

  function splat(x, y, dx, dy, color) {
    gl.useProgram(splatProgram);
    gl.uniform1i(splatU.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatU.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatU.point, x, y);
    gl.uniform3f(splatU.color, dx, dy, 0);
    gl.uniform1f(splatU.radius, 0.22);
    blit(velocity.write, false); velocity.swap();
    gl.uniform1i(splatU.uTarget, dye.read.attach(0));
    gl.uniform3f(splatU.color, color.r, color.g, color.b);
    blit(dye.write, false); dye.swap();
  }

  var lastAmbient = 0, amb = { x: 0.5, y: 0.5, a: Math.random() * 6.28 };
  function ambientSplat(now) {
    if (!tgt.interval || now - lastAmbient < tgt.interval) return;
    lastAmbient = now;
    amb.a += 0.7 + Math.random() * 0.8;
    amb.x = 0.5 + Math.cos(amb.a) * 0.28;
    amb.y = 0.5 + Math.sin(amb.a * 1.3) * 0.28;
    var c = inkColor();
    splat(amb.x, amb.y, (Math.random() - 0.5) * 700, (Math.random() - 0.5) * 700, c);
  }

  function step(dt) {
    gl.disable(gl.BLEND);
    gl.useProgram(curlProgram);
    gl.uniform2f(curlU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlU.uVelocity, velocity.read.attach(0));
    blit(curl);
    gl.useProgram(vorticityProgram);
    gl.uniform2f(vorticityU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityU.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityU.uCurl, curl.attach(1));
    gl.uniform1f(vorticityU.curl, cur.curl);
    gl.uniform1f(vorticityU.dt, dt);
    blit(velocity.write, false); velocity.swap();
    gl.useProgram(divergenceProgram);
    gl.uniform2f(divergenceU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceU.uVelocity, velocity.read.attach(0));
    blit(divergence);
    gl.useProgram(pressureProgram);
    gl.uniform2f(pressureU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureU.uDivergence, divergence.attach(0));
    for (var i = 0; i < 20; i++) {
      gl.uniform1i(pressureU.uPressure, pressure.read.attach(1));
      blit(pressure.write, false); pressure.swap();
    }
    gl.useProgram(gradientSubtractProgram);
    gl.uniform2f(gradientSubtractU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractU.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradientSubtractU.uVelocity, velocity.read.attach(1));
    blit(velocity.write, false); velocity.swap();
    gl.useProgram(advectionProgram);
    gl.uniform2f(advectionU.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(advectionU.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionU.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    var velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionU.uVelocity, velocityId);
    gl.uniform1i(advectionU.uSource, velocityId);
    gl.uniform1f(advectionU.dt, dt);
    gl.uniform1f(advectionU.dissipation, cur.velocity);
    blit(velocity.write, false); velocity.swap();
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionU.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionU.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionU.uSource, dye.read.attach(1));
    gl.uniform1f(advectionU.dissipation, cur.density);
    blit(dye.write, false); dye.swap();
  }
  function render() {
    gl.useProgram(displayProgram);
    gl.uniform1i(displayU.uTexture, dye.read.attach(0));
    blit(null, false);
  }

  var last = performance.now(), running = true, first = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) last = performance.now(); });
  window.addEventListener('resize', resizeCanvas);

  /* opening gesture: a few ink blooms so the page is alive on load */
  function openingBlooms() {
    var spots = [[0.3, 0.62], [0.62, 0.4], [0.5, 0.72], [0.74, 0.66]];
    spots.forEach(function (s, i) {
      setTimeout(function () { var c = inkColor(); splat(s[0], s[1], (Math.random() - 0.5) * 1200, (Math.random() - 0.5) * 1200, c); }, 350 + i * 420);
    });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    var dt = Math.min((now - last) / 1000, 0.01666); last = now;
    for (var k in cur) cur[k] += (tgt[k] - cur[k]) * 0.045; /* ease mood */
    if (first) { first = false; openingBlooms(); }
    if (pointer.moved) {
      pointer.moved = false;
      var c = inkColor();
      var f = pointer.down ? cur.force * 1.6 : cur.force * 0.22;
      splat(pointer.x, pointer.y, pointer.dx * f / 5200, pointer.dy * f / 5200, c);
    }
    ambientSplat(now);
    step(dt);
    render();
  }
  requestAnimationFrame(frame);
})();
