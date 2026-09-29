/* Daftrify v3 — motion, scenes, form. Vanilla + GSAP + Lenis via CDN. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  if (!hasGsap) document.documentElement.classList.add('no-anim');

  /* ——— smooth scroll ——— */
  var lenis = null;
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', function () { if (window.ScrollTrigger) ScrollTrigger.update(); });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var rafL = function (t) { lenis.raf(t); requestAnimationFrame(rafL); };
      requestAnimationFrame(rafL);
    }
  }
  /* anchor links through lenis */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0 });
      else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ——— fluid moods per scene ——— */
  function setMood(n) { if (window.DeskFluid) window.DeskFluid.setMood(n); }
  if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('[data-mood]').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 45%',
        onToggle: function (self) { if (self.isActive) setMood(sec.getAttribute('data-mood')); }
      });
    });
  }

  /* ——— hero intro ——— */
  if (hasGsap && !reduceMotion) {
    gsap.set('#hero .rv', { opacity: 0, y: 34 });
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('#hero .hero-title .row > span', { yPercent: 115, duration: 1.25, stagger: 0.09 }, 0.15)
      .to('#hero .rv', { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0.7);
  }

  /* ——— reveals (fade once; never unfolding) ——— */
  if (hasGsap && window.ScrollTrigger && !reduceMotion) {
    ScrollTrigger.batch('main .rv:not(#hero .rv), footer .rv', {
      start: 'top 88%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07 }); }
    });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ——— manifesto: word-by-word light ——— */
  (function () {
    var p = document.getElementById('manifestoText');
    if (!p) return;
    var html = p.innerHTML.split(/(\s+)/).map(function (tok) {
      if (!tok.trim()) return tok;
      if (tok.indexOf('<') === 0) return tok; /* keep <em> tags intact-ish */
      return '<span class="w">' + tok + '</span>';
    }).join('');
    /* re-wrap words inside em too */
    p.innerHTML = html.replace(/<em>(.*?)<\/em>/g, function (m, inner) {
      return '<em>' + inner.split(/(\s+)/).map(function (t) { return t.trim() ? '<span class="w">' + t + '</span>' : t; }).join('') + '</em>';
    });
    var words = p.querySelectorAll('.w');
    if (!hasGsap || !window.ScrollTrigger || reduceMotion) {
      words.forEach(function (w) { w.classList.add('lit'); });
      return;
    }
    ScrollTrigger.create({
      trigger: p, start: 'top 75%', end: 'bottom 45%', scrub: 0.6,
      onUpdate: function (self) {
        var n = Math.floor(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
      }
    });
  })();

  /* ——— process: pinned crossfade (desktop, motion-safe) ——— */
  (function () {
    var wrap = document.getElementById('pinWrap');
    if (!wrap) return;
    var phases = Array.prototype.slice.call(wrap.querySelectorAll('.phase'));
    var nowEl = document.getElementById('phaseNow');
    var bar = document.getElementById('phaseBar');
    var canPin = hasGsap && window.ScrollTrigger && !reduceMotion && window.innerWidth > 760 && finePointer;
    if (!canPin) {
      phases.forEach(function (ph) { ph.style.opacity = 1; ph.style.visibility = 'visible'; });
      var meta = wrap.querySelector('.process-meta'); if (meta) meta.style.display = 'none';
      return;
    }
    wrap.parentElement.classList.add('is-pinned');
    var tl = gsap.timeline({
      scrollTrigger: { trigger: '#process', start: 'top top', end: '+=350%', pin: true, scrub: 0.8,
        onUpdate: function (self) {
          var idx = Math.min(phases.length - 1, Math.floor(self.progress * phases.length));
          if (nowEl) nowEl.textContent = ('0' + (idx + 1)).slice(-2);
          if (bar) bar.style.transform = 'scaleX(' + self.progress + ')';
        } }
    });
    phases.forEach(function (ph, i) {
      tl.to(ph, { opacity: 1, visibility: 'visible', duration: 0.4 }, i);
      if (i < phases.length - 1) tl.to(ph, { opacity: 0, visibility: 'hidden', duration: 0.4 }, i + 0.6);
    });
  })();

  /* ——— cursor ——— */
  if (finePointer && hasGsap && !reduceMotion) {
    var cur = document.getElementById('cur'), ring = document.getElementById('curR');
    var cx = gsap.quickTo(cur, 'x', { duration: 0.12, ease: 'power2' }),
        cy = gsap.quickTo(cur, 'y', { duration: 0.12, ease: 'power2' }),
        rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power2' }),
        ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power2' });
    window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.querySelectorAll('a, button, .idx-row, .faq-q, .file-pill').forEach(function (el) {
      el.addEventListener('pointerenter', function () { ring.classList.add('big'); });
      el.addEventListener('pointerleave', function () { ring.classList.remove('big'); });
    });
  }

  /* ——— magnetic ——— */
  if (finePointer && hasGsap && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' }),
          yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ——— faq accordion ——— */
  document.querySelectorAll('.faq-row').forEach(function (row) {
    var q = row.querySelector('.faq-q'), a = row.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var open = row.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });

  /* ——— intake form ——— */
  (function () {
    var form = document.getElementById('intakeForm');
    if (!form) return;
    var status = document.getElementById('fStatus');
    var btn = document.getElementById('sendBtn');
    var fileInput = document.getElementById('fFiles');
    var fileName = document.getElementById('fileName');
    var MAX = 10 * 1024 * 1024;
    var INBOX = 'daftrify.services@gmail.com'; /* fallback only — never displayed */

    fileInput.addEventListener('change', function () {
      var names = Array.prototype.map.call(fileInput.files, function (f) { return f.name; });
      fileName.textContent = names.join(', ');
      var total = Array.prototype.reduce.call(fileInput.files, function (s, f) { return s + f.size; }, 0);
      if (total > MAX) {
        setStatus('Those files are over 10 MB in total — try fewer, or email them to the address below.', 'err');
        fileInput.value = ''; fileName.textContent = '';
      }
    });
    function setStatus(msg, cls) { status.textContent = msg; status.className = 'f-status' + (cls ? ' ' + cls : ''); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      if (!name || !email) { setStatus('Please add your name and email so the desk can reply.', 'err'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('That email doesn\'t look right — mind checking it?', 'err'); return; }
      var total = Array.prototype.reduce.call(fileInput.files, function (s, f) { return s + f.size; }, 0);
      if (total > MAX) { setStatus('Those files are over 10 MB in total — try fewer, or email them to the address below.', 'err'); return; }

      btn.disabled = true;
      var original = btn.innerHTML;
      btn.innerHTML = 'Sending…';
      setStatus('Sending to the desk…');

      var fd = new FormData();
      fd.append('name', name); fd.append('email', email); fd.append('message', message);
      Array.prototype.forEach.call(fileInput.files, function (f) { fd.append('files', f, f.name); });

      fetch('/api/intake', { method: 'POST', body: fd })
        .then(function (r) { if (!r.ok) throw new Error('intake ' + r.status); return r.json().catch(function () { return {}; }); })
        .then(function () {
          setStatus('Received. Your file is on the desk — expect a reply at ' + email + ' shortly.', 'ok');
          form.reset(); fileName.textContent = '';
        })
        .catch(function () {
          /* fallback: FormSubmit ajax to hidden inbox */
          var f2 = new FormData();
          f2.append('name', name); f2.append('email', email); f2.append('message', message);
          f2.append('_subject', 'Daftrify intake (fallback): ' + name);
          fetch('https://formsubmit.co/ajax/' + INBOX, { method: 'POST', body: f2, headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('fallback ' + r.status); return r.json(); })
            .then(function () {
              setStatus('Received via backup route. Your file is on the desk — expect a reply at ' + email + ' shortly.', 'ok');
              form.reset(); fileName.textContent = '';
            })
            .catch(function () {
              setStatus('Couldn\'t send just now — nothing was lost. Please email your file directly to contact@daftrify.info and it will be picked up from there.', 'err');
            });
        })
        .finally(function () { btn.disabled = false; btn.innerHTML = original; });
    });
  })();
})();
