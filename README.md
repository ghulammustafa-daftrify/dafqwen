# Daftrify — Document Operations & Pre-Submission Auditing

The public experience site for **Daftrify**, an outsourced document-operations desk operated by **Ghulam Mustafa** from **Faisalabad, Pakistan**.

The site does not describe the service in the abstract. It performs it. The centrepiece is the **Exploded Forensic Dossier**: a scroll-driven sequence that walks a synthetic document set through all seven states of the desk, from a sealed intake to a packaged, source-verified file.

---

## Run it

There is **no build step**. `index.html` is the deployable artefact.

```bash
# open directly
open index.html

# or serve it locally (any static server works)
npm run dev          # → http://localhost:5173
# or
python3 -m http.server 5173
npx serve .
```

```bash
npm run build        # no-op, prints a note and exits 0
```

## Deploy

Drag the folder onto any static host. No server, no environment variables, no runtime.

| Platform | Setting |
|---|---|
| **Netlify** | Build command: *(empty)* · Publish directory: `.` |
| **Vercel** | Framework preset: **Other** · Build command: *(empty)* · Output directory: `.` |
| **Cloudflare Pages** | Build command: *(empty)* · Build output directory: `/` |
| **GitHub Pages** | Push to `main`, serve from root |

```bash
npx netlify deploy --prod --dir .
npx vercel --prod
npx wrangler pages deploy .
```

---

## Why no framework

The stated development machine is an **HP EliteBook 840 G3, Core i5 6th generation, 8 GB RAM**. Every technical decision follows from that constraint.

| Decision | Reason |
|---|---|
| **CSS 3D, not WebGL** | The dossier reaches the same depth for a fraction of the cost, and it degrades to a static storyboard for free. No Three.js, no shader compilation, no GPU context. |
| **No smooth-scroll library** | Lenis and friends run a permanent `requestAnimationFrame` loop even when the page is idle. Native scroll plus scrubbed ScrollTrigger means **nothing runs when nothing is happening**. |
| **No bundler, no `node_modules`** | Nothing to install, nothing to compile, nothing to keep patched. Edit and refresh. |
| **Two CDN scripts, both `defer`** | GSAP + ScrollTrigger. That is the entire dependency list. |
| **Transform and opacity only** | Nothing animates layout, so there is no reflow thrash. |
| **`IntersectionObserver` for everything cheap** | Reveals, the sticky header, and the scrollspy cost nothing per frame. |

---

## Macrostructure

Nine sections, **nine different geometries**. No section repeats another section's shape, which is the anti-slop discipline applied structurally rather than cosmetically.

| # | Section | Shape |
|---|---|---|
| 01 | Arrival | Asymmetric editorial grid; a pointer-reactive paper stack participates in the hero |
| 02 | The condition | Pinned specimen board of scattered document fragments |
| 03 | The dossier | Full-bleed pinned 7-state scroll scene, inverted to ink |
| 04 | Capabilities | Ledger rows, not cards |
| 05 | Verification | Two-column source/extracted comparison the visitor operates |
| 06 | Demonstrations | Tabbed exhibit file with three structurally different interiors |
| 07 | Principles | Inverted typographic broadside, alternating indentation |
| 08 | Where it fits | Two-column index list with a scope note |
| 09 | Contact | Perforated intake slip |

There is deliberately **no** hero → features → testimonials → CTA sequence, no repeated card grid, no pill soup, no decorative gradient, no glass.

---

## The signature: Exploded Forensic Dossier

A 620vh pinned scene driving one scrubbed timeline through seven states.

| State | What happens |
|---|---|
| **01 Received** | Closed folder, metadata reads `07 FILES / RECEIVED` |
| **02 Open** | The folder swings on its spine, seven sheets rise out |
| **03 Explosion** | Sheets move into separate spatial layers with depth and rotation |
| **04 Discrepancy** | Redlines draw across three sheets; exception flags land one beat apart |
| **05 Reconcile** | Connectors trace between related fields; the `SOURCE → COMPARE → REVIEW → RECONCILE` key advances |
| **06 Human verify** | The stack recedes and the verification card takes the screen: `EXTRACTED` against `SOURCE`, then `VERIFIED AGAINST SOURCE` |
| **07 Package** | Sheets restack into one ordered file, each earns a verified chip, the file lands, the mark stamps |

A live rail, a metadata readout (`fields read / exceptions / resolved`), and a caption track the state throughout. The stack also leans with the pointer, like a real pile of paper.

**Reduced motion** replaces the entire scene with an eight-cell storyboard that teaches the identical seven states in text. Nothing is lost.

---

## Design system

```
Paper              #F9F8F5
Secondary paper    #F4F1EA
Sheet              #FDFCFA
Ink                #171717
Muted slate        #66707A
Verification green #315C4A
Verification red   #9B2F2F
```

Green and red are **status colours only**. Red means discrepancy, exception, review required. Green means verified, reconciled, resolved. The majority of the visual field stays restrained paper and ink.

**Three typographic roles, three families:**

| Role | Family | Used for |
|---|---|---|
| Editorial serif | Instrument Serif | Display headlines, key statements, section titles |
| Technical sans | Inter | Body, navigation, buttons, interface |
| Monospace | JetBrains Mono | Document IDs, dates, amounts, status, metadata, audit information |

Body text is 16px minimum. Tabular figures are on globally so numerical comparison lines up.

---

## Interaction that proves the business

The verification section is not a description. **Press "Run verification pass"** and four extracted fields resolve against their source records one at a time, the status pill flips from `4 fields require review` to `4 fields verified against source`, and the highlight colour moves from red to green. Press it again to reset.

That interaction is the product argument: extraction proposes, the record disposes.

---

## Content integrity

Verified in the source, not just claimed:

- The word **"AI" appears nowhere** in public copy, headings, labels, metadata, or accessibility text
- **No invented clients, testimonials, logos, statistics, approval rates, awards, certifications, or partnerships**
- No **Hassan Ali** case anywhere
- Every demonstration is labelled **SIMULATED DEMONSTRATION**; every sheet in the dossier carries a `Synthetic` tag
- The final state reads **VERIFIED / READY FOR REVIEW**, never "approved" or "guaranteed"
- One real contact address: `daftrify.services@gmail.com`
- A scope note states plainly that Daftrify provides document operations, **not** legal, financial, medical, or immigration advice, and makes no claim about the outcome of any submission

---

## Accessibility

- Semantic landmarks, one `h1`, sequential heading levels
- Skip link, visible focus rings on every interactive element
- Keyboard-operable tablist with arrow, Home, and End keys
- Escape closes the overlay index
- Decorative scenes marked `aria-hidden`; the storyboard carries the meaning without motion
- Full `prefers-reduced-motion` path: the pin unpins, the scene is replaced, all transitions are disabled
- 44px minimum touch targets, no hover-only information

---

## Files

```
index.html      the entire site, inline CSS and one deferred script
package.json    convenience scripts only, no dependencies
README.md       this file
```

---

© 2026 Daftrify · Document operations, not regulated advice · All case values on this site are simulated
