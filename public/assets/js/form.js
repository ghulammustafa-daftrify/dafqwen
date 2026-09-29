/* ═══════════ LIVING DESK — intake form ═══════════
   Behavior preserved from the previous site:
   primary POST /api/intake → FormSubmit fallback (daftrify.services@gmail.com)
   10MB attachment guard, honest failure state that keeps user input. */
(function () {
  'use strict';
  var dropZone = document.getElementById('dropZone');
  var fattach = document.getElementById('fattach');
  var uploadPrompt = document.getElementById('uploadPrompt');
  var filePreview = document.getElementById('filePreview');
  var fileNameEl = document.getElementById('fileName');
  var fileSizeEl = document.getElementById('fileSize');
  var fileWarnEl = document.getElementById('fileWarn');
  var removeFileBtn = document.getElementById('removeFile');
  var selectedFile = null;

  var WA = 'https://wa.me/923187668851?text=';

  function formatSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  function updateFileState(file) {
    selectedFile = file;
    if (file) {
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
      if (uploadPrompt) uploadPrompt.style.display = 'none';
      if (filePreview) filePreview.classList.add('show');
      if (fileWarnEl) fileWarnEl.classList.toggle('show', file.size > 10 * 1024 * 1024);
    } else {
      if (fattach) fattach.value = '';
      if (uploadPrompt) uploadPrompt.style.display = '';
      if (filePreview) filePreview.classList.remove('show');
      if (fileWarnEl) fileWarnEl.classList.remove('show');
    }
  }
  if (dropZone && fattach) {
    dropZone.addEventListener('click', function (e) {
      if (e.target.closest('#removeFile')) return;
      fattach.click();
    });
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fattach.click(); }
    });
    fattach.addEventListener('change', function () {
      if (fattach.files && fattach.files[0]) updateFileState(fattach.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('over'); });
    });
    dropZone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) updateFileState(e.dataTransfer.files[0]);
    });
    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', function (e) { e.stopPropagation(); updateFileState(null); });
    }
  }

  var form = document.getElementById('intakeForm');
  if (!form) return;

  function check(input, valid) {
    var field = input.closest('.field');
    var err = field ? field.querySelector('.ferr') : null;
    input.classList.toggle('bad', !valid);
    if (err) err.classList.toggle('show', !valid);
    return valid;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var n = document.getElementById('fn'),
        em = document.getElementById('fe'),
        d = document.getElementById('fd'),
        m = document.getElementById('fm');
    var btn = form.querySelector('button[type="submit"]');
    var statusBox = document.getElementById('statusBox');
    var btnText = document.getElementById('btnText');

    var ok = true;
    ok = check(n, n.value.trim().length > 1) && ok;
    ok = check(em, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) && ok;
    ok = check(d, d.value.trim().length > 1) && ok;
    if (!ok) { var bad = form.querySelector('input.bad'); if (bad) bad.focus(); return; }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      if (statusBox) {
        statusBox.innerHTML = '<div class="warn-box">File exceeds the 10MB limit. Please share a Google Drive/Dropbox link in the message box, or send it directly via <a href="' + WA + encodeURIComponent('Hi Daftrify, I have a file larger than 10MB for review.') + '" target="_blank" rel="noopener">WhatsApp</a>.</div>';
      }
      return;
    }

    if (btn) { btn.disabled = true; if (btnText) btnText.textContent = 'Sending…'; btn.classList.add('opacity-70'); }
    if (statusBox) statusBox.innerHTML = '<div class="send-box">Sending to the desk…</div>';

    var attachmentPayload = null;
    if (selectedFile) {
      attachmentPayload = await new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve({ name: selectedFile.name, type: selectedFile.type || 'application/octet-stream', size: selectedFile.size, data: reader.result });
        };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(selectedFile);
      });
    }

    var sent = false;
    try {
      var res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n.value.trim(), email: em.value.trim(),
          documents: d.value.trim(), issue: m ? m.value.trim() : '',
          attachment: attachmentPayload
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.ok) sent = true;
    } catch (err) { sent = false; }

    if (!sent) {
      try {
        var fd = new FormData();
        fd.append('name', n.value.trim());
        fd.append('email', em.value.trim());
        fd.append('_replyto', em.value.trim());
        fd.append('_subject', 'DAFTRIFY Intake (contact@daftrify.info) / ' + d.value.trim());
        fd.append('intake_desk', 'contact@daftrify.info');
        fd.append('documents', d.value.trim());
        fd.append('what_goes_wrong', m && m.value.trim() ? m.value.trim() : 'Not provided');
        fd.append('_template', 'table');
        fd.append('_captcha', 'false');
        if (selectedFile) fd.append('attachment', selectedFile);
        var fsRes = await fetch('https://formsubmit.co/ajax/daftrify.services@gmail.com', {
          method: 'POST', headers: { 'Accept': 'application/json' }, body: fd
        });
        var fsData = await fsRes.json().catch(function () { return {}; });
        if (fsRes.ok || fsData.success === 'true') sent = true;
      } catch (err2) { sent = false; }
    }

    if (sent) {
      if (statusBox) {
        statusBox.innerHTML = '<div class="ok-box"><b>✓ Sent to the desk.</b><br />Your details are with us at <b>contact@daftrify.info</b>. We will review and reply to <b>' +
          em.value.trim().replace(/</g, '&lt;') + '</b> once your file is reviewed.</div>';
      }
      form.reset();
      updateFileState(null);
    } else {
      if (statusBox) {
        statusBox.innerHTML = '<div class="warn-box"><b>Couldn&rsquo;t send just now.</b><br />The form couldn&rsquo;t reach the desk. Your details are still here — please try again, or send directly via <a href="' + WA + encodeURIComponent('Hi Daftrify, I would like to start a file.') + '" target="_blank" rel="noopener">WhatsApp</a> or <a href="mailto:contact@daftrify.info">contact@daftrify.info</a>.</div>';
      }
    }
    if (btn) { btn.disabled = false; if (btnText) btnText.textContent = 'Start a file'; btn.classList.remove('opacity-70'); }
  });
})();
