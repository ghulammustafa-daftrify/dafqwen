# Daftrify — Documents In. Clarity Out.

The public website for **Daftrify**, a document-operations desk run by **Ghulam Mustafa** from **Faisalabad, Pakistan**.

Live: **https://www.daftrify.info**

Daftrify intakes complex document stacks — multi-page PDFs, technical drawings, dense financial ledgers — and returns them structured, reconciled, and ready to submit.

---

## Tech stack

| Choice | Reason |
|---|---|
| Single `index.html` | No build step. Edit and deploy. |
| Tailwind CSS (CDN) | Utility styling without a toolchain |
| Vanilla JS + CSS | All animation is hand-rolled spring/magnetic/tilt physics — no animation library |
| Lucide icons (CDN) | Consistent icon set |
| Cloudflare Pages | Hosting + auto-deploy from `main` |
| Cloudflare Pages Functions | `functions/api/intake.js` receives the contact form |
| Resend | Transactional email for intake submissions |

There is **no framework, no bundler, no `node_modules` required** to view or deploy the site. `express` in `package.json` exists only for the optional local dev server.

---

## Project structure

```
index.html              the entire site — markup, styles, behaviour
public/
  og-image.png          social preview card (1200×630)
  logo.svg              Daftrify wordmark
  logos/                partner tool logos (Alteryx, Bluebeam, Gemini, n8n, Zapier)
  instagram.svg / linkedin.svg / tiktok.svg   brand assets (reserved)
functions/
  api/intake.js         contact-form endpoint (Cloudflare Pages Function)
server.js               optional local dev server (mirrors /api/intake)
design-system/          reference notes from the design phase
BACKEND_SETUP.md        intake email backend setup guide
.env.example            documented environment variables (copy to .env, never commit)
```

The favicon is an inline SVG data-URI in `index.html` — no separate file needed.

---

## Run it locally

```bash
# fastest — any static server (form posts to /api/intake won't work, the rest will)
python3 -m http.server 5173
npx serve .

# full local stack — serves the site AND a working /api/intake (logs + optional Resend)
npm install
npm run dev            # → http://localhost:3000
```

---

## Deploy

Push to `main` — Cloudflare Pages builds and deploys automatically.

- Build command: `exit 0` (nothing to build)
- The `functions/` directory is picked up automatically as Pages Functions
- Custom domain `www.daftrify.info` is attached in the Cloudflare dashboard (do not touch unless you know what you're doing)

---

## Contact form — how intake works

```
Browser form → POST /api/intake → Resend → desk inbox
```

1. **Primary:** `functions/api/intake.js` validates the submission (honeypot, field
   validation, HTML-escaping, 14 MB body cap) and sends it via the **Resend API**
   using the `RESEND_API_KEY` environment variable.
2. **Fallback:** if the Pages Function is unreachable, the form tries **FormSubmit**
   (AJAX) as a second channel.
3. **Honest failure:** if both channels fail, the visitor sees a clear error with
   direct **WhatsApp** and **email** options — never a fake success message.

Details: [`BACKEND_SETUP.md`](BACKEND_SETUP.md)

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Cloudflare Pages → Settings → Environment variables | Sends intake emails via Resend |
| `PORT` | local only | `server.js` listen port (default `3000`) |
| `INTAKE_RECIPIENT` | local only | overrides the dev inbox (default `daftrify.services@gmail.com`) |

---

## Conventions

- **Motion:** every animation respects `prefers-reduced-motion`; touch devices skip
  pointer-only effects (magnetic buttons, card tilt).
- **No fake proof:** no invented testimonials, client logos, statistics, or outcome
  claims anywhere on the site. Demos are labelled simulated.
- **Commits:** small, conventional (`feat:`, `fix:`, `docs:` …), one concern per commit.
- **Never commit** `.env`, API keys, or tokens. See [`.gitignore`](.gitignore).

---

© 2026 Daftrify · Document operations, not legal/financial/medical/immigration advice
