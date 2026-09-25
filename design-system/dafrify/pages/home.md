# Page override — `index.html` (home)
Overrides the light-canvas tokens in `../MASTER.md` §3–§4 for a dark editorial direction (reference anatomy: portrait-led hero, stacked headline lines, per-character scroll reveal, statement block, bordered contact form). Where this file and MASTER disagree, **this file wins** for `index.html` only.

## Direction shift
Light "Editorial Kinetic Minimalism" → **Dark Editorial Portfolio** (personal-operator site). Same product, same content inventory, new canvas and type behaviour: near-black canvas, off-white display type, uppercase role lists, one live accent.

## COLOR — dark tokens (contrast verified, WCAG AA)
| Token | Value | Role | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#0A0A0B` | page canvas | — |
| `--bg-alt` | `#101012` | alternating sections | — |
| `--surface` | `#151517` | cards, documents | — |
| `--text` | `#F5F5F3` | body + headings | 18.6:1 AAA on `--bg` |
| `--text-2` | `#B4B4B0` | secondary copy | 9.4:1 AAA |
| `--text-3` | `#8A8A87` | meta / kicker | 5.4:1 AA |
| `--accent-text` | `#9AA4FF` | accent **text** on dark | 8.6:1 AAA |
| `--accent` | `#2B3BFF` | button fill (white label) | 6.6:1 AA |
| `--lime` | `#C1FF00` | highlight text / tick / dot | 16.5:1 AAA (on dark lime **may** carry text — on light it may not) |
| `--pass` / `--pass-text` | `#22C55E` / `#22C55E` | pass mark + text | 8.5:1 AAA |
| `--fail` / `--fail-text` | `#E90000` / `#FF4D4D` | fail mark / fail **text** | 6.0:1 AA |
| `--warn` | `#F59E0B` | lamp dot only, always + label | — |

Rules carried over: status is never colour-only (icon + word); raw hex stays in tokens, components consume semantic names; lime never used for large filled backgrounds.

## STRUCTURE (order of the page)
1. Preloader → 2. Header + overlay menu → 3. **Hero:** portrait block + vertically looping `I'm Mustafa` (surname highlighted) + uppercase role list with rotating highlight → 4. Headline marquee → 5. **"Where I put that to work"** → 4 service rows → 6. **Per-character scroll reveal** (3 parallax copies) → 7. **Statement block** ("Built for applicants who demand more.") → 8. Proof stats + mismatch chips → 9. Pinned demo → 10. Certificate → 11. Rules figures + policy rows → 12. Process → 13. Pricing approach → 14. About → 15. **Contact form CTA** (Name / Email / Who are you? / Timeline incl. "I don't know" / Project / Company) → 16. Footer.

## FORM
Native `<form>`, `novalidate` + scripted validation. Visible labels, `required`, inline error text beside each field, `aria-invalid`, `aria-describedby`, errors summarised through the `role="status"` live region, focus moved to the first invalid field. Success state gives three explicit paths: email the brief, open WhatsApp, copy the brief.

## MOTION (unchanged dials: variance 7 · motion 10 · density 5)
Adds: per-character opacity scrub, vertical line-loop, role highlight rotation, 3-layer parallax. Removes nothing. All of it sits behind `prefers-reduced-motion: reduce` → static states (chars at full opacity, loop parked, demo shown as before/after).

## CHECKLIST DELTA
- [x] Dark-mode text contrast ≥4.5:1 (≥3:1 secondary) — table above
- [x] Dividers/borders visible on dark (`rgba(245,245,243,.14)` / `.28`)
- [x] Focus rings re-tuned for dark (accent-tinted, 2px, 3px offset)
- [x] Form: visible labels, inline errors, success feedback, no colour-only states
- [x] Scroll form none, no prices, all CTAs → `https://wa.link/9d0k3o`
