/* ═══════════ LIVING DESK — dossier assembly chapter ═══════════
   Procedural canvas animation for "How a file moves".
   Scroll progress p ∈ [0,1] drives three phases:
     0.00–0.45  scattered sheets fly in and stack neatly
     0.45–0.70  a REVIEWED stamp slams onto the stack
     0.70–1.00  the dossier cover slides over
   Deterministic — the same p always draws the same frame. */
(function () {
  'use strict';
  var canvas = document.getElementById('dossierCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var SHEETS = 6;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOutBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  /* deterministic pseudo-random from index */
  function rnd(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    var r = canvas.getBoundingClientRect();
    W = Math.max(50, r.width); H = Math.max(50, W * 0.85);
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function sheetGeom(i) {
    var cx = W / 2, cy = H * 0.52;
    var sw = W * 0.30, sh = sw * 1.32;
    return {
      w: sw, h: sh,
      sx: W * (0.08 + rnd(i, 1) * 0.84), sy: H * (0.06 + rnd(i, 2) * 0.88),
      srot: (rnd(i, 3) - 0.5) * 1.6,
      ex: cx + (rnd(i, 4) - 0.5) * 26 - 13 + (i - (SHEETS - 1) / 2) * 7,
      ey: cy - i * 7,
      erot: (rnd(i, 5) - 0.5) * 0.10
    };
  }
  function drawSheet(g, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(g.x, g.y); ctx.rotate(g.rot);
    ctx.fillStyle = '#e9e4d6';
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 5); ctx.fill();
    ctx.shadowColor = 'transparent';
    /* faint text lines */
    ctx.fillStyle = 'rgba(40,48,44,0.5)';
    var top = -g.h / 2 + 16;
    for (var l = 0; l < 7; l++) {
      var lw = g.w * (0.72 - rnd(l, 9) * 0.25);
      ctx.fillRect(-g.w / 2 + 12, top + l * 13, lw, 3);
    }
    /* red flag line on one sheet */
    ctx.fillStyle = 'rgba(180,60,50,0.55)';
    ctx.fillRect(-g.w / 2 + 12, top + 3 * 13, g.w * 0.4, 3);
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStamp(t) {
    if (t <= 0) return;
    var cx = W / 2, cy = H * 0.52 - 10;
    var s = easeOutBack(clamp01(t * 1.35));
    var a = clamp01(t * 4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(cx, cy); ctx.rotate(-0.21); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(52,211,153,0.95)'; ctx.lineWidth = 5;
    var w = W * 0.34, h = 54;
    roundRect(-w / 2, -h / 2, w, h, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(52,211,153,0.95)';
    ctx.font = '700 26px Archivo, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('REVIEWED', 0, 2);
    ctx.restore();
  }
  function drawCover(t) {
    if (t <= 0) return;
    var e = easeInOut(clamp01(t));
    var cx = W / 2, cy = H * 0.52;
    var sw = W * 0.34, sh = sw * 1.38;
    var y = lerp(-sh, cy - (SHEETS - 1) * 3.5, e);
    ctx.save();
    ctx.translate(cx, y);
    ctx.fillStyle = '#0d3b2d';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    roundRect(-sw / 2, -sh / 2, sw, sh, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(52,211,153,0.35)'; ctx.lineWidth = 1.5;
    roundRect(-sw / 2 + 8, -sh / 2 + 8, sw - 16, sh - 16, 4); ctx.stroke();
    ctx.fillStyle = '#e9edea';
    ctx.font = '700 20px Archivo, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('DOSSIER', 0, -sh / 2 + 44);
    ctx.fillStyle = 'rgba(233,237,234,0.4)';
    for (var l = 0; l < 4; l++) ctx.fillRect(-sw / 2 + 22, -sh / 2 + 74 + l * 16, sw - 44 - l * 14, 3);
    /* fold-D mark hint */
    ctx.fillStyle = 'rgba(52,211,153,0.9)';
    ctx.font = '800 30px Archivo, sans-serif';
    ctx.fillText('D', 0, sh / 2 - 34);
    ctx.restore();
  }

  function draw(p) {
    ctx.clearRect(0, 0, W, H);
    var pStack = easeInOut(clamp01(p / 0.45));
    var pStamp = clamp01((p - 0.45) / 0.25);
    var pCover = clamp01((p - 0.70) / 0.30);
    for (var i = 0; i < SHEETS; i++) {
      var g = sheetGeom(i);
      var local = easeInOut(clamp01((pStack - i * 0.06) / 0.7));
      drawSheet({
        x: lerp(g.sx, g.ex, local), y: lerp(g.sy, g.ey, local),
        rot: lerp(g.srot, g.erot, local), w: g.w, h: g.h
      }, 0.25 + 0.75 * clamp01(local * 1.5));
    }
    drawStamp(pStamp);
    drawCover(pCover);
  }

  var lastP = 0;
  window.DossierChapter = {
    setProgress: function (p) { lastP = clamp01(p); draw(lastP); },
    renderFinal: function () { lastP = 1; draw(1); },
    renderEmpty: function () { lastP = 0; draw(0); },
    resize: resize
  };

  resize();
  window.addEventListener('resize', function () { resize(); draw(lastP); });
  draw(0);
})();
