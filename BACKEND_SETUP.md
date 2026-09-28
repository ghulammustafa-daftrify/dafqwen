# Daftrify intake email backend

The website contact form posts to **`/api/intake`**, a [Cloudflare Pages Function](https://developers.cloudflare.com/pages/functions/) (`functions/api/intake.js`) deployed automatically with the site. No Worker, no `wrangler.jsonc` needed.

## How delivery works

```
Browser form → POST /api/intake → Resend API → desk inbox (daftrify.services@gmail.com)
```

1. **Primary channel — Resend.** The Function validates the submission, then sends it
   through the Resend API using the `RESEND_API_KEY` environment variable.
   The visitor's address is set as `Reply-To`, so hitting reply answers the client directly.
2. **Fallback — Cloudflare Email.** If no Resend key is configured but an `EMAIL`
   binding exists, the Function uses Cloudflare's email sending instead.
3. **Browser fallback — FormSubmit.** If `/api/intake` itself is unreachable, the form
   retries via FormSubmit (AJAX) as a second channel.
4. **Honest failure.** If every channel fails, the visitor sees a clear error with
   direct WhatsApp (`+92 318 7668851`) and email (`contact@daftrify.info`) options —
   never a fake success message.

### What the Function validates

- Honeypot field (`website`) — bots fill it, humans don't; bots get a fake `ok: true`
- Name ≥ 2 chars, valid email format, document description ≥ 2 chars
- Control characters stripped, fields length-capped, HTML-escaped in the email body
- Request body capped at 14 MB (a 10 MB file becomes ~13.3 MB as base64 JSON)

## One-time setup (Resend)

1. Create a free account at [resend.com](https://resend.com) and generate an API key.
2. In the Cloudflare dashboard, open **Pages → dafqwen → Settings → Environment variables**.
3. Add `RESEND_API_KEY` = your key (production environment). Redeploy or wait for the next push.
4. Done — new submissions will arrive at `daftrify.services@gmail.com`.

### Sender address note

Out of the box the Function sends from Resend's test identity
(`DAFTRIFY Intake Desk <onboarding@resend.dev>`). That works, but for a fully
professional setup, verify `daftrify.info` in **Resend → Domains** (add the DNS
records Resend shows you) and change the `from` address in `functions/api/intake.js`
to something like `DAFTRIFY Intake Desk <intake@daftrify.info>`.

> On Resend's free tier, the test sender can only deliver to the account owner's own
> address. If intake emails aren't arriving, verify the domain first.

## Local development

`server.js` mirrors `/api/intake` for local testing:

```bash
cp .env.example .env   # then fill in RESEND_API_KEY
npm install
npm run dev            # → http://localhost:3000
```

Without a key it logs the submission to the console and returns success — useful for
testing the form UI without sending real email. Set `INTAKE_RECIPIENT` in `.env` to
redirect local test emails elsewhere.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Form shows the WhatsApp/email fallback error | `RESEND_API_KEY` missing or invalid on the Pages project, and no `EMAIL` binding configured |
| Resend dashboard shows sends but nothing arrives | free-tier test sender restriction — verify `daftrify.info` in Resend |
| 413 "too large" | attachment over ~10 MB — the form warns about this at file-select time too |
