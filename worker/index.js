const SITE_ORIGINS = new Set([
  "https://daftrify.info",
  "https://www.daftrify.info",
]);

const RECIPIENT = "contact@daftrify.com";
// The sender must belong to a domain onboarded for Cloudflare Email Service.
// The message is delivered to contact@daftrify.com; the visitor remains the Reply-To.
const SENDER = "contact@daftrify.info";
const MAX_BODY_BYTES = 32 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(value, max) {
  return String(value ?? "").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function handleIntake(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const origin = request.headers.get("Origin");
  if (origin && !SITE_ORIGINS.has(origin)) {
    return json({ ok: false, error: "Origin not allowed." }, 403);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: "Request is too large." }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot. Bots fill this, real visitors never see it.
  if (clean(payload.website, 120)) return json({ ok: true });

  const name = clean(payload.name, 120);
  const email = clean(payload.email, 254).toLowerCase();
  const documents = clean(payload.documents, 500);
  const issue = clean(payload.issue, 3000);

  if (name.length < 2) return json({ ok: false, error: "Please add your name." }, 400);
  if (!validEmail(email)) return json({ ok: false, error: "Please provide a valid email address." }, 400);
  if (documents.length < 2) return json({ ok: false, error: "Please describe the document set." }, 400);

  if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
    return json({ ok: false, error: "Email service is not configured yet." }, 503);
  }

  const receivedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const subject = `New DAFTRIFY document intake / ${documents}`;
  const text = [
    "NEW DAFTRIFY DOCUMENT INTAKE",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Documents: ${documents}`,
    issue ? `What usually goes wrong: ${issue}` : "What usually goes wrong: Not provided",
    `Received: ${receivedAt} PKT`,
    "",
    "Reply directly to this email to contact the requester.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#171717;line-height:1.55">
<h2 style="margin-bottom:20px">New Daftrify document intake</h2>
<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
<tr><td style="font-weight:700;border-bottom:1px solid #ddd">Name</td><td style="border-bottom:1px solid #ddd">${escapeHtml(name)}</td></tr>
<tr><td style="font-weight:700;border-bottom:1px solid #ddd">Email</td><td style="border-bottom:1px solid #ddd">${escapeHtml(email)}</td></tr>
<tr><td style="font-weight:700;border-bottom:1px solid #ddd">Documents</td><td style="border-bottom:1px solid #ddd">${escapeHtml(documents)}</td></tr>
<tr><td style="font-weight:700;vertical-align:top">What usually goes wrong</td><td>${escapeHtml(issue || "Not provided").replaceAll("\n", "<br>")}</td></tr>
</table>
<p style="color:#666;font-size:13px;margin-top:24px">Received ${escapeHtml(receivedAt)} PKT. Reply directly to this email to contact the requester.</p>
</body></html>`;

  try {
    const result = await env.EMAIL.send({
      to: RECIPIENT,
      from: SENDER,
      replyTo: email,
      subject,
      text,
      html,
      headers: {
        "X-Daftrify-Form": "website-intake",
      },
    });

    return json({ ok: true, messageId: result.messageId });
  } catch (error) {
    console.error("Daftrify intake email failed", error);
    return json({ ok: false, error: "We could not send the intake right now. Please email contact@daftrify.com directly." }, 502);
  }
}

const INJECTED_FORM_SCRIPT = `
<script>
(() => {
  // Make every visible DAFTRIFY contact email open Gmail compose.
  const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=contact%40daftrify.com';
  document.querySelectorAll('a[href^="mailto:contact@daftrify.com"]').forEach((link) => {
    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  const form = document.getElementById('intakeForm');
  if (!form) return;

  const trap = document.createElement('input');
  trap.type = 'text';
  trap.name = 'website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  trap.setAttribute('aria-hidden', 'true');
  trap.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;opacity:0;pointer-events:none';
  form.appendChild(trap);

  const button = form.querySelector('button[type="submit"]');
  if (button) button.textContent = 'Send';

  const status = document.getElementById('ok');
  if (status) status.textContent = 'Your details will be sent securely to contact@daftrify.com.';

  document.addEventListener('submit', async (event) => {
    if (event.target !== form) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const name = document.getElementById('fn');
    const email = document.getElementById('fe');
    const documents = document.getElementById('fd');
    const issue = document.getElementById('fm');

    const valid = name && email && documents &&
      name.value.trim().length > 1 &&
      /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email.value.trim()) &&
      documents.value.trim().length > 1;

    if (!valid) return;

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
      button.classList.add('opacity-60', 'cursor-not-allowed');
    }
    if (status) {
      status.classList.remove('hidden');
      status.textContent = 'Sending…';
      status.className = 'text-white/60 text-[11px] tracking-wide mt-4 text-center leading-relaxed';
    }

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          documents: documents.value,
          issue: issue ? issue.value : '',
          website: trap.value
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to send.');

      if (status) {
        status.textContent = 'Sent. We’ll review your details and reply within twenty-four hours.';
        status.className = 'text-emerald-300/90 text-[11px] tracking-wide mt-4 text-center leading-relaxed';
      }
      form.reset();
      if (button) {
        button.disabled = false;
        button.textContent = 'Send';
        button.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    } catch (error) {
      if (status) {
        status.textContent = error && error.message ? error.message : 'Something went wrong. Please email contact@daftrify.com directly.';
        status.className = 'text-red-200/90 text-[11px] tracking-wide mt-4 text-center leading-relaxed';
      }
      if (button) {
        button.disabled = false;
        button.textContent = 'Try Again';
        button.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    }
  }, true);
})();
</script>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/intake") {
      return handleIntake(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";

    if (contentType.includes("text/html") && assetResponse.ok) {
      return new HTMLRewriter()
        .on("body", {
          element(element) {
            element.append(INJECTED_FORM_SCRIPT, { html: true });
          },
        })
        .transform(assetResponse);
    }

    return assetResponse;
  },
};
