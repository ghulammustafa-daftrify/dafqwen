# MASTER — DAFTRIFY
Generated with the ui-ux-pro-max pattern: `--design-system "document verification operations service" --variance 7 --motion 10 --density 5 -p "Daftrify"`
Source of truth for every page in this project. Page overrides live in `pages/<page>.md` and take precedence when present.

---

## 1. TARGET

| Field | Value |
| --- | --- |
| Product | DAFTRIFY — document operations & pre-submission auditing desk |
| Product category match | B2B Service (primary) · Legal-adjacent / Verification (secondary) · Invoice & Billing Tool (tertiary) |
| Audience | Applicants, firms and operators with high-stakes paperwork (visa files, contracts, medical records, invoices, grants) |
| Stack (detected) | Single-file HTML + CSS + JS. No framework manifest present → token-driven CSS, no utility framework (`html-tailwind` guidance applied as principles only: mobile-first, 4/8 spacing rhythm, no fixed px containers) |
| Dials | `--variance 7` (bold, asymmetric display type) · `--motion 10` (complex choreography: pin, scrub, seal impact) · `--density 5` (standard→spacious) |

## 2. PATTERN

Hero-centric conversion + proof-led narrative.

1. Hero (kinetic display type + 3D document objects)
2. Velocity marquee (process spine: EXTRACT · VERIFY · FLAG · SEAL)
3. Problem (kinetic counters + sourced stats)
4. Services (sticky stacking tray)
5. Signature demo (pinned scroll transformation)
6. Certificate (verifiable artifact)
7. Rules (verified figures + policy)
8. Process (4 steps, time-stamped)
9. Pricing approach (no rate card → free first audit)
10. About (human operator) → Contact + Footer

CTA strategy: one primary CTA ("Free File Audit" → WhatsApp) repeated as header, hero, per-service, pricing and contact action. Every secondary action is visually subordinate.

## 3. STYLE

**Editorial Kinetic Minimalism** — light canvas, oversized lowercase/uppercase display type, soft layered elevation, document facsimiles as the hero object language, scroll-choreographed storytelling.

- Keywords: light, spacious, precise, kinetic, trustworthy, document-native
- Depth: shadows only (`0 6px 10px rgba(0,0,0,.04), 0 2px 4px rgba(0,0,0,.04)`); no glassmorphism, no neon fills
- Radius: 16 / 20px cards, 10px documents, pill controls
- Performance: transform/opacity only, reserved space for pinned scenes, no luxury of layout-thrash

## 4. COLOR TOKENS

Primitives → semantic. Components never use raw hex; they consume semantic tokens.

| Primitive | Value | Semantic role |
| --- | --- | --- |
| `--paper` | `#FAFAFD` | `--bg` canvas |
| `--paper-alt` | `#F0F1FA` | `--bg-alt` alternating sections |
| `--surface` | `#FFFFFF` | `--surface` cards, documents |
| `--ink-900 … --ink-500` | `#000000` → `#6B6B7B` | `--text`, `--text-2`, `--text-3` |
| `--blue-600` | `#1A2FFB` | `--brand` (primary action, links, data marks) |
| `--blue-700` | `#0E22D3` | `--brand-ink` (hover / pressed) |
| `--lime-400` | `#C1FF00` | `--accent-lime` — **micro only**: dot, tick, hairline. 1.19:1 on white → never carries text or meaning |
| `--green-500` / `--green-700` | `#22C55E` / `#15803D` | `--pass` (mark/fill) / `--pass-ink` (text, 5.01:1) |
| `--red-600` / `--red-700` | `#E90000` / `#C10000` | `--fail` (mark/border) / `--fail-ink` (text, 6.32:1) |
| `--amber-500` | `#F59E0B` | `--warn` (lamp dot only, always paired with a text label) |

**Verified contrast pairs (WCAG AA, ≥4.5:1)**
- `#000` on `#FAFAFD` → 20.4:1 (AAA)
- `#4A4A55` on `#FAFAFD` → 8.5:1 (AAA) — body secondary
- `#6B6B7B` on `#FAFAFD` → 5.1:1 (AA) — meta/kicker
- `#1A2FFB` on `#FFFFFF` → 7.4:1 (AAA)
- `#FFFFFF` on `#1A2FFB` → 7.4:1 (AAA) — primary button
- `#15803D` on `#FFFFFF` → 5.0:1 (AA) — pass text
- `#C10000` on `#FFFFFF` → 6.3:1 (AA) — fail text
- `#C1FF00` on `#FFFFFF` → 1.19:1 → **decorative only, aria-hidden**

Status is never colour-only: every pass/fail/warn state ships an icon + a word.

## 5. TYPOGRAPHY

| Role | Family | Size | Weight | Notes |
| --- | --- | --- | --- | --- |
| Display / headings | General Sans (fallback Inter) | `clamp()` up to 110px | 500 | line-height ≤1.05, tracking −0.03em, `text-wrap: balance` as progressive enhancement |
| Body | Inter | 16px base | 400 | line-height 1.5–1.65, measure ≤68ch |
| Meta / kicker | Inter | 12–14px | 500 | uppercase + 0.12–0.22em tracking |
| Facsimile internals | Inter | 11–13px | 400/500 | decorative, inside `role="img"` documents |
| Numerals | Inter | tabular-nums | 400/500 | kinetic counters |

Anti-pattern: no informational text below 12px; no gray-on-gray.

## 6. SPACING & LAYOUT

4/8 rhythm: `4 8 12 16 24 32 48 64 96 128`. Section padding `clamp(80px, 11vw, 144px)`. One container: `min(1260px, 92vw)` — fluid, never a fixed px width. Mobile-first breakpoints: **375 / 768 / 1024 / 1440**. No horizontal scroll (`overflow-x: clip`). Touch targets ≥44×44px. Safe-area padding for fixed header.

## 7. KEY EFFECTS (motion presets applied)

| Preset | Where used |
| --- | --- |
| Counter + curtain loader (skippable, ≤1.6s, `aria-live`) | Preloader |
| Masked word reveal (`clip-path` / y-mask, stagger) | Hero headline |
| Object idle-float + pointer parallax (transform only) | Hero document cards |
| Magnetic hover (translate ≤32% of delta, elastic return) | All primary CTAs |
| Velocity-linked marquee (`timeScale` from scroll delta) | EXTRACT → SEAL strip |
| Kinetic counter on enter (`once: true`) | Stats |
| Pinned scrub choreography (pin + timeline, scrub 0.55) | DEMO |
| Impact punctuation (scale squash + ≤200ms screen shake) | LODGEMENT READY seal |
| Sticky stacking tray (sticky + scale/settle of previous card) | Services |
| Alternate-axis reveal (rotateX 8° → 0) | Section transitions |
| Micro-interactions 180–240ms, entrances 500–700ms, scrub user-driven | Everywhere |
| Full static fallback | `prefers-reduced-motion: reduce` |

Anti-patterns avoided: decorative-only animation, animating width/height/top/left, single duration for every transition, blocking input (loader is skippable), motion without reduced-motion path.

## 8. ICONS

One inline SVG set, 1.6–1.8px stroke, round caps/joins, `currentColor`, sized via `--icon-sm/md/lg` (16/20/24). No emoji as icons. Decorative SVG gets `aria-hidden="true"`; icon-only controls carry `aria-label`.

## 9. PRE-DELIVERY CHECKLIST

- [x] No emoji used as icons (all inline SVG)
- [x] `cursor: pointer` on every clickable element; press feedback ≤80ms via `:active`
- [x] Interaction timing per component (micro 180–240ms, enter ≤700ms, scrub user-driven)
- [x] Light-mode text contrast ≥4.5:1 (verified pairs above)
- [x] Visible `:focus-visible` rings (2px brand, 3px offset; white on dark overlay) + skip link
- [x] `prefers-reduced-motion` disables every tween and animation, static states shown
- [x] Chips, tags, badges and long emails reflow without clipping (`flex-wrap`, `overflow-wrap: anywhere`)
- [x] Responsive verified at 375 / 768 / 1024 / 1440
- [x] Touch targets ≥44px; `touch-action: manipulation`; 8px+ separation
- [x] Space reserved for pinned scenes (CLS-safe); transform/opacity only; no layout thrash
- [x] Status meaning = icon + text + colour (never colour alone)
- [x] Charts labelled (floor line, old quote) + text summary + legend, not colour-only
- [x] Keyboard nav for overlay menu: focus trap, Escape, focus return, `aria-expanded`
- [x] No prices rendered anywhere; all CTAs point to `https://wa.link/9d0k3o`
