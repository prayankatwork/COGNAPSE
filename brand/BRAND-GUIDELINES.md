# COGNAPSE Brand Guidelines

**Product:** Strategic intelligence and research synthesis platform  
**Promise:** Turn noisy information into structured, verifiable intelligence.

## 1. Brand essence

Communicate: disciplined analysis, evidence, synthesis, private ownership, analyst confidence.

Avoid: social network, casual chatbot, playful productivity, generic SaaS gradients, purple AI slop.

## 2. Visual identity

### Logo

Use `BrandLogo` only. Do not replace with plain text in core chrome. Research mode may show the neural companion variant.

### Color roles

| Role | Token | Light | Dark | Use |
|------|-------|-------|------|-----|
| UI accent | `my-accent` | `#2A4365` navy | `#FACC15` yellow | Buttons, tabs, active nav, links |
| Signal | `my-signal` | `#F27D26` orange | `#F27D26` orange | Maps, pulses, premium stripe, graph roots |
| Surface | `my-bg`, `my-sidebar`, `my-callout` | — | — | Backgrounds |
| Text | `my-ink`, `my-muted`, `my-syn` | — | — | Body vs labels vs synthesis |
| Semantic | `my-conflict-*`, `my-success` | — | — | Risk / success only |

**Rule:** No raw hex in TSX except charts reading `getComputedStyle` / `tokens.json`. No `orange-500`, `amber-500` for brand UI—use tokens.

### Typography

| Role | Classes |
|------|---------|
| Display / hero | `font-serif font-bold italic tracking-tight` |
| Report title | `font-serif text-[32px] leading-[1.1] text-my-ink` |
| Section label | `text-[10px] font-black uppercase tracking-[0.3em] text-my-muted` |
| Control label | `text-[9px] font-black uppercase tracking-widest` |
| Synthesis body | `text-sm leading-relaxed text-my-syn` |
| Technical | `font-mono text-[10px]` |

### Layout

- Hard edges: `rounded-[2px]`, `rounded-[4px]`, or square.
- Borders and grids over floating soft cards.
- Max content width: research `max-w-4xl`, shared `max-w-5xl`.
- Nav height: 56px.

### Motion

Allowed: slow spin (logo ring), pulse (status), progress, fade/slide enter, scanline overlay (global).

Forbidden: decorative bounce on dense text, layout-shifting loops, gratuitous gradient motion.

## 3. Components

Use primitives from `src/components/ui/`:

- `Panel` — bordered callout surfaces
- `SectionLabel` — uppercase section headers
- `MetaLabel` — metadata chips
- `Button` — primary / secondary / ghost / signal
- `PageHeader` — Knowledge Hub–style titles with optional sync line
- `StatusDot` — live / idle / error

See [COMPONENT-KIT.md](./COMPONENT-KIT.md).

## 4. Feature rules

**Shared research:** Read-only. No investigate, replay, fork, or edit controls.

**Premium:** Razorpay live on production URL only. Use `my-signal` for premium accent bar, not arbitrary amber.

**Knowledge Hub:** “Global Event Tracking” + Last Sync must update on successful fetch.

## 5. Accessibility

- Primary buttons: `bg-my-ink text-white` (light) / `bg-my-accent text-black` (dark)—global CSS enforces contrast.
- Minimum touch target ~40px on mobile for primary actions.
- Tiny type only for labels, not long prose.

## 6. Implementation checklist

```tsx
import { Panel, SectionLabel, Button } from '@/components/ui';
import { brandClasses } from '@/styles/brand';
```

- [ ] Theme tokens only  
- [ ] Light + dark verified  
- [ ] Lucide icons for actions  
- [ ] Copy from [COPY-VOICE.md](./COPY-VOICE.md)  
- [ ] Matches intelligence OS tone  

## 7. Final rule

If it does not feel like a focused analyst workstation, it does not ship.
