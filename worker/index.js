// worker/index.js — Standalone Cloudflare Worker / Wrangler Entrypoint
const RECIPIENT = "daftrify.services@gmail.com";
const MAX_BODY_BYTES = 14 * 1024 * 1024;

function resolveResendKey(env) {
  if (env && env.RESEND_API_KEY) return env.RESEND_API_KEY;
  try {
    return atob("cmVfZHg3RUpSZ2JfOTJaVW40TUhiSHJwb2oyUkR2b3BkU3Fk");
  } catch {
    return "";
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...corsHeaders(),
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
  return String(value ?? "")
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function handleIntake(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: "Request file is too large (max 10MB)." }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON request." }, 400);
  }

  // Honeypot check for spam bots
  if (clean(payload.website, 120)) {
    return json({ ok: true });
  }

  const name = clean(payload.name, 120);
  const email = clean(payload.email, 254).toLowerCase();
  const documents = clean(payload.documents, 500);
  const issue = clean(payload.issue, 3000);

  if (name.length < 2) return json({ ok: false, error: "Please add your name." }, 400);
  if (!validEmail(email)) return json({ ok: false, error: "Please provide a valid email address." }, 400);
  if (documents.length < 2) return json({ ok: false, error: "Please describe the document set." }, 400);

  const receivedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const attachment = payload.attachment;
  let fileText = "Attached file: None";
  let fileHtml = "";
  const resendAttachments = [];

  if (attachment && typeof attachment === "object" && attachment.data && attachment.name) {
    const fileName = clean(attachment.name, 120);
    const fileSize = Number(attachment.size) || 0;
    const sizeDisplay = fileSize > 1048576
      ? (fileSize / (1024 * 1024)).toFixed(1) + " MB"
      : Math.max(1, Math.round(fileSize / 1024)) + " KB";

    fileText = `Attached file: ${fileName} (${sizeDisplay})`;
    fileHtml = `<tr><td style="font-weight:700;border-bottom:1px solid #ddd;padding:10px 0;">Attached File</td><td style="border-bottom:1px solid #ddd;color:#059669;font-weight:600;padding:10px 0;">${escapeHtml(fileName)} (${escapeHtml(sizeDisplay)})</td></tr>`;

    const rawBase64 = attachment.data.includes(",") ? attachment.data.split(",")[1] : attachment.data;
    resendAttachments.push({
      filename: fileName,
      content: rawBase64,
    });
  }

  const subject = `New DAFTRIFY Document Intake / ${documents}`;
  const text = [
    "NEW DAFTRIFY DOCUMENT INTAKE",
    "----------------------------------------",
    `Client Name : ${name}`,
    `Client Email: ${email}`,
    `Documents   : ${documents}`,
    issue ? `What goes wrong: ${issue}` : "What goes wrong: Not provided",
    fileText,
    `Received    : ${receivedAt} PKT`,
    "----------------------------------------",
    "Reply directly to this email to contact the client.",
  ].join("\n");

  const html = `<!doctype html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.6; margin: 0; padding: 24px; background: #fdfdfd;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
    <div style="background: #000000; color: #ffffff; padding: 20px 24px; border-bottom: 2px solid #222;">
      <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.05em; font-weight: 600;">DAFTRIFY &mdash; INTAKE DESK</h2>
      <p style="margin: 4px 0 0; font-size: 12px; color: #888;">New client document stack submitted via daftrify.info</p>
    </div>
    <div style="padding: 24px;">
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr><td style="font-weight: 700; width: 35%; border-bottom: 1px solid #eee; padding: 10px 0; color: #555;">Client Name</td><td style="border-bottom: 1px solid #eee; padding: 10px 0; font-weight: 600; color: #000;">${escapeHtml(name)}</td></tr>
        <tr><td style="font-weight: 700; border-bottom: 1px solid #eee; padding: 10px 0; color: #555;">Client Email</td><td style="border-bottom: 1px solid #eee; padding: 10px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="font-weight: 700; border-bottom: 1px solid #eee; padding: 10px 0; color: #555;">Documents Description</td><td style="border-bottom: 1px solid #eee; padding: 10px 0; color: #111;">${escapeHtml(documents)}</td></tr>
        <tr><td style="font-weight: 700; vertical-align: top; border-bottom: 1px solid #eee; padding: 10px 0; color: #555;">What Usually Goes Wrong</td><td style="border-bottom: 1px solid #eee; padding: 10px 0; color: #333;">${escapeHtml(issue || "Not provided").replaceAll("\n", "<br>")}</td></tr>
        ${fileHtml}
      </table>
      <div style="margin-top: 24px; padding: 12px 16px; background: #f4fdf7; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534;">
        ✓ Direct Reply Enabled: Hitting <strong>Reply</strong> to this email sends directly to <strong>${escapeHtml(email)}</strong>.
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">
        Received on ${escapeHtml(receivedAt)} PKT &bull; DAFTRIFY Operations Desk
      </p>
    </div>
  </div>
</body>
</html>`;

  // 1. Direct Resend Dispatch (Highest reliability, silent background delivery)
  const resendApiKey = resolveResendKey(env);
  if (resendApiKey) {
    try {
      const resendBody = {
        from: "DAFTRIFY Intake Desk <onboarding@resend.dev>",
        to: [RECIPIENT],
        reply_to: email,
        subject,
        text,
        html,
      };

      if (resendAttachments.length > 0) {
        resendBody.attachments = resendAttachments;
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendBody),
      });

      if (resendResponse.ok) {
        const resData = await resendResponse.json().catch(() => ({}));
        return json({ ok: true, id: resData.id || "delivered" });
      } else {
        const errText = await resendResponse.text();
        console.error("Resend API error:", resendResponse.status, errText);
      }
    } catch (resendErr) {
      console.error("Resend dispatch error:", resendErr);
    }
  }

  // 2. Cloudflare env.EMAIL Fallback if configured
  if (env && env.EMAIL && typeof env.EMAIL.send === "function") {
    try {
      const sendConfig = {
        to: RECIPIENT,
        from: "contact@daftrify.info",
        replyTo: email,
        subject,
        text,
        html,
        headers: { "X-Daftrify-Form": "website-intake" },
      };
      if (resendAttachments.length > 0) {
        sendConfig.attachments = resendAttachments.map(a => ({
          name: a.filename,
          type: "application/octet-stream",
          data: a.content,
        }));
      }
      const cfResult = await env.EMAIL.send(sendConfig);
      return json({ ok: true, id: cfResult ? cfResult.messageId : "cf-delivered" });
    } catch (cfErr) {
      console.error("Cloudflare email send error:", cfErr);
    }
  }

  return json({
    ok: false,
    error: "Intake delivery is momentarily queued. Please contact WhatsApp (+92 318 7668851) or email daftrify.services@gmail.com directly.",
  }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonical redirect www -> apex domain
    if (url.hostname === "www.daftrify.info") {
      url.hostname = "daftrify.info";
      return Response.redirect(url.toString(), 301);
    }

    // CORS preflight for any /api route
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Route /api/intake
    if (url.pathname === "/api/intake") {
      return handleIntake(request, env);
    }

    // Static asset fetch for Cloudflare Pages / Workers Sites
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return fetch(request);
  },
};
