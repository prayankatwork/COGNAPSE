# COGNAPSE Brand Kit

Single source of truth for product UI, copy, and implementation. Agents and contributors should read this before changing interfaces.

## Files

| File | Purpose |
|------|---------|
| [BRAND-GUIDELINES.md](./BRAND-GUIDELINES.md) | Principles, personality, do/don’t |
| [COMPONENT-KIT.md](./COMPONENT-KIT.md) | Layout patterns + React primitives |
| [COPY-VOICE.md](./COPY-VOICE.md) | Terminology and tone |
| [tokens.json](./tokens.json) | Machine-readable colors, type, motion |

## Code integration

| Path | Purpose |
|------|---------|
| `src/index.css` | CSS variables (`--accent`, `--signal`, themes) |
| `src/styles/brand.ts` | Tailwind class recipes |
| `src/components/ui/*` | Reusable branded components |
| `.cursor/rules/cognapse-brand.mdc` | Cursor agent rule for UI work |

## Color system (two roles)

1. **Accent** (`my-accent`) — UI chrome: nav, primary buttons, active tabs, links. Light = navy `#2A4365`, dark = cyber yellow `#FACC15`.
2. **Signal** (`my-signal`) — Intelligence heat: maps, pulses, premium bars, graph roots. Orange `#F27D26` in both themes.

Never hardcode `#F27D26` or `rgba(249,115,22,…)` in components; use `my-signal` / `shadow-signal`.

## Quick check before shipping UI

- [ ] Uses `bg-my-*`, `text-my-*`, `border-my-*` tokens only
- [ ] Works in light and dark mode
- [ ] Labels are uppercase micro-type; body uses `text-my-syn`
- [ ] Panels use `rounded-[4px]` or `rounded-[2px]`, not large SaaS radii
- [ ] Copy matches [COPY-VOICE.md](./COPY-VOICE.md)
