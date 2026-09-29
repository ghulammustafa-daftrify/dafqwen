/* ═══════════ LIVING DESK — motion orchestrator ═══════════
   Lenis smooth scroll + GSAP ScrollTrigger + reveal-once +
   pinned "How a file moves" chapter + magnetic actions + cursor.
   Everything degrades gracefully: reduced motion, no CDN, mobile. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ── loader ── */
  function hideLoader() {
    var l = document.getElementById('loader');
    if (l) l.classList.add('done');
  }
  window.addEventListener('load', function () { setTimeout(hideLoader, 350); });
  setTimeout(hideLoader, 2600); /* safety */

  /* ── static fallback (reduced motion or CDN failure) ── */
  if (reduceMotion || !hasGsap) {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('.hero-title .w > span').forEach(function (el) { el.style.transform = 'none'; });
    ['heroSub', 'heroCtas'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
    });
    if (window.DossierChapter) DossierChapter.renderFinal();
    var mm = document.getElementById('menuBtn');
    if (mm) wireMenu(mm);
    return;
  }

  /* ── Lenis smooth scroll ── */
  var lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ── anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── nav state ── */
  var nav = document.getElementById('nav');
  function onScrollPos(y) { if (nav) nav.classList.toggle('scrolled', y > 40); }
  if (lenis) lenis.on('scroll', function (e) { onScrollPos(e.scroll); });
  else window.addEventListener('scroll', function () { onScrollPos(window.scrollY); }, { passive: true });

  /* ── hero entrance ── */
  gsap.set('.hero-title .w > span', { yPercent: 110 });
  gsap.set('#heroSub, #heroCtas', { y: 18 });
  var intro = gsap.timeline({ delay: 0.55, defaults: { ease: 'expo.out' } });
  intro
    .to('.hero-title .w > span', { yPercent: 0, duration: 1.15, stagger: 0.07 }, 0)
    .to('#heroSub', { opacity: 1, y: 0, duration: 0.9 }, 0.55)
    .to('#heroCtas', { opacity: 1, y: 0, duration: 0.9 }, 0.7);

  /* ── reveal-once ── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  /* ── pinned "How a file moves" chapter (desktop only) ── */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.how-step'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('#howProgress span'));
  function setStep(i) {
    steps.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    dots.forEach(function (d2, k) { d2.classList.toggle('done', k <= i); });
  }
  if (desktop && window.DossierChapter) {
    ScrollTrigger.create({
      trigger: '#how', start: 'top top+=72', end: '+=190%',
      pin: true, scrub: 0.6,
      onUpdate: function (self) {
        var p = self.progress;
        DossierChapter.setProgress(p);
        setStep(Math.min(3, Math.floor(p * 4)));
      }
    });
  } else if (window.DossierChapter) {
    DossierChapter.renderFinal();
  }

  /* ── magnetic actions (fine pointer only) ── */
  if (finePointer) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      var x = 0, y = 0, tx = 0, ty = 0, raf = null;
      function render() {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        if (Math.abs(tx - x) < 0.05) x = tx;
        if (Math.abs(ty - y) < 0.05) y = ty;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        raf = (x !== tx || y !== ty) ? requestAnimationFrame(render) : null;
      }
      function kick() { if (!raf) raf = requestAnimationFrame(render); }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx = Math.max(-10, Math.min(10, (e.clientX - (r.left + r.width / 2)) * 0.25));
        ty = Math.max(-8, Math.min(8, (e.clientY - (r.top + r.height / 2)) * 0.25));
        kick();
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
    });

    /* ── custom cursor ── */
    var cursor = document.getElementById('cursor');
    if (cursor) {
      var cx = -100, cy = -100, px2 = -100, py2 = -100, craf = null, shown = false;
      function cRender() {
        px2 += (cx - px2) * 0.35; py2 += (cy - py2) * 0.35;
        cursor.style.transform = 'translate(' + px2.toFixed(1) + 'px,' + py2.toFixed(1) + 'px)';
        craf = (Math.abs(cx - px2) > 0.1 || Math.abs(cy - py2) > 0.1) ? requestAnimationFrame(cRender) : null;
      }
      document.addEventListener('pointermove', function (e) {
        cx = e.clientX; cy = e.clientY;
        if (!shown) { shown = true; cursor.style.opacity = '1'; }
        if (!craf) craf = requestAnimationFrame(cRender);
      }, { passive: true });
      document.addEventListener('pointerleave', function () { cursor.style.opacity = '0'; shown = false; });
      document.querySelectorAll('a, button, summary, .drop, .svc').forEach(function (el) {
        el.addEventListener('pointerenter', function () { cursor.classList.add('hovering'); });
        el.addEventListener('pointerleave', function () { cursor.classList.remove('hovering'); });
      });
    }
  }

  /* ── mobile menu ── */
  var menuBtn = document.getElementById('menuBtn');
  if (menuBtn) wireMenu(menuBtn);
  function wireMenu(btn) {
    var menu = document.getElementById('mobileMenu');
    var iconMenu = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
    var iconX = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.innerHTML = open ? iconX : iconMenu;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }
  function closeMenu() {
    var menu = document.getElementById('mobileMenu');
    if (menu && menu.classList.contains('open') && menuBtn) menuBtn.click();
  }
})();
