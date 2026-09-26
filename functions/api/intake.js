const SITE_ORIGINS = new Set([
  "https://daftrify.info",
  "https://www.daftrify.info",
]);

const RECIPIENT = "daftrify.services@gmail.com";
const SENDER = "contact@daftrify.info";
const MAX_BODY_BYTES = 14 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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
  return String(value ?? "")
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

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

  // Honeypot check for bots
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
  const emailAttachments = [];

  if (attachment && typeof attachment === "object" && attachment.data && attachment.name) {
    const fileName = clean(attachment.name, 120);
    const fileType = clean(attachment.type, 80) || "application/octet-stream";
    const fileSize = Number(attachment.size) || 0;
    const sizeDisplay = fileSize > 1048576
      ? (fileSize / (1024 * 1024)).toFixed(1) + " MB"
      : Math.max(1, Math.round(fileSize / 1024)) + " KB";

    fileText = `Attached file: ${fileName} (${sizeDisplay})`;
    fileHtml = `<tr><td style="font-weight:700;border-bottom:1px solid #ddd">Attached File</td><td style="border-bottom:1px solid #ddd;color:#059669;font-weight:600">${escapeHtml(fileName)} (${escapeHtml(sizeDisplay)})</td></tr>`;

    const rawBase64 = attachment.data.includes(",") ? attachment.data.split(",")[1] : attachment.data;
    emailAttachments.push({
      name: fileName,
      type: fileType,
      data: rawBase64,
    });
  }

  const subject = `New DAFTRIFY document intake / ${documents}`;
  const text = [
    "NEW DAFTRIFY DOCUMENT INTAKE",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Documents: ${documents}`,
    issue ? `What usually goes wrong: ${issue}` : "What usually goes wrong: Not provided",
    fileText,
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
<tr><td style="font-weight:700;vertical-align:top;border-bottom:1px solid #ddd">What usually goes wrong</td><td style="border-bottom:1px solid #ddd">${escapeHtml(issue || "Not provided").replaceAll("\n", "<br>")}</td></tr>
${fileHtml}
</table>
<p style="color:#666;font-size:13px;margin-top:24px">Received ${escapeHtml(receivedAt)} PKT. Reply directly to this email to contact the requester.</p>
</body></html>`;

  // Check if Cloudflare EMAIL binding is present
  if (env && env.EMAIL && typeof env.EMAIL.send === "function") {
    try {
      const sendConfig = {
        to: RECIPIENT,
        from: SENDER,
        replyTo: email,
        subject,
        text,
        html,
        headers: {
          "X-Daftrify-Form": "website-intake",
        },
      };

      if (emailAttachments.length > 0) {
        sendConfig.attachments = emailAttachments;
      }

      const result = await env.EMAIL.send(sendConfig);
      return json({ ok: true, messageId: result ? result.messageId : "sent" });
    } catch (sendError) {
      console.error("Cloudflare env.EMAIL.send failed:", sendError);
      return json({
        ok: false,
        error: "Email delivery failed on desk server. Please contact us via WhatsApp (+92 318 7668851) or email contact@daftrify.info directly.",
        details: String(sendError && sendError.message ? sendError.message : sendError)
      }, 502);
    }
  }

  // If EMAIL binding is not yet attached in Pages settings, return informative status
  console.warn("env.EMAIL binding not found in Pages context.env");
  return json({
    ok: false,
    needsConfig: true,
    error: "The desk intake service is connecting. Please email contact@daftrify.info or message WhatsApp at +92 318 7668851."
  }, 503);
}
