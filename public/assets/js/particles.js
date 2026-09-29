/* ═══════════ LIVING DESK — paper fragment particles ═══════════
   Lightweight 2D canvas: small paper-like rects drifting over the hero.
   Subtle, cheap, paused offscreen. Skipped under reduced motion. */
(function () {
  'use strict';
  var canvas = document.getElementById('paperCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { canvas.style.display = 'none'; return; }

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, parts = [], running = true, visible = true;
  var isMobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  var COUNT = isMobile ? 22 : 48;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(anyY) {
    var s = 3 + Math.random() * 9;
    return {
      x: Math.random() * W, y: anyY ? Math.random() * H : H + 20,
      w: s * (0.7 + Math.random() * 0.6), h: s * (0.9 + Math.random() * 0.5),
      vy: -(0.12 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.18,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.004,
      a: 0.05 + Math.random() * 0.10,
      shade: 200 + Math.floor(Math.random() * 40)
    };
  }
  function init() { parts = []; for (var i = 0; i < COUNT; i++) parts.push(spawn(true)); }
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y < -30) parts[i] = p = spawn(false);
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = 'rgb(' + p.shade + ',' + (p.shade + 4) + ',' + p.shade + ')';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      /* faint text lines on the fragment */
      ctx.globalAlpha = p.a * 1.6;
      ctx.fillStyle = 'rgba(20,26,22,0.85)';
      var lh = p.h / 5;
      for (var l = 1; l <= 3; l++) ctx.fillRect(-p.w / 2 + 1.5, -p.h / 2 + lh * l, p.w - 3, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  }
  window.addEventListener('resize', function () { resize(); init(); });
  resize(); init();
  requestAnimationFrame(frame);
})();
