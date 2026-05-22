# COGNAPSE Brand Guidelines

COGNAPSE is a strategic intelligence analyst OS. It should feel like a professional research command center: precise, restrained, high-signal, and quietly cinematic. The interface is not a social app, not a generic SaaS dashboard, and not a playful productivity tool. Every design choice should reinforce focused research, source verification, synthesis, and analyst confidence.

These guidelines are based on the current app implementation and must be followed for all future Cognapse UI, UX, copy, and feature work.

## Brand Essence

**Name:** COGNAPSE  
**Product category:** Strategic intelligence and research synthesis platform  
**Core promise:** Turn noisy information into structured, verifiable intelligence.

COGNAPSE should communicate:

- disciplined analysis
- intelligence gathering
- cognitive mapping
- evidence verification
- professional-grade synthesis
- private research ownership

Avoid positioning Cognapse as:

- a social network
- a casual chatbot
- a generic notes app
- a marketing-heavy AI wrapper
- a playful consumer assistant

## Product Personality

The app voice is serious, exact, and slightly cinematic. It uses intelligence-system language, but should remain understandable to normal users.

Good personality cues:

- "Authorized Analyst"
- "Research Protocol"
- "Intelligence Synthesis"
- "Secure Archive"
- "Analysis Thread"
- "Public read-only research view"
- "Processing Framework Active"
- "Shared Research"
- "Premium Analyst Dossier"

Avoid:

- social-media language such as likes, followers, feeds, reactions
- overly cute empty states
- casual hype like "supercharge your workflow"
- vague AI language like "magical answers"
- collaboration-first language unless collaboration is actually rebuilt

## Theme System

COGNAPSE uses CSS variables in `src/index.css`. New UI must use the existing theme tokens instead of hardcoding brand colors, except for narrow semantic states like success, conflict, or third-party brand colors.

### Light Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#FDFCFB` | Main app background |
| `--sidebar` | `#F8F9FA` | Sidebar and secondary app surfaces |
| `--ink` | `#1A1A1A` | Primary text and dark buttons |
| `--accent` | `#2A4365` | Primary brand accent in light mode |
| `--border` | `#E2E8F0` | Hairline dividers and grid borders |
| `--muted` | `#718096` | Metadata, labels, inactive controls |
| `--callout` | `#F1F5F9` | Panels, report blocks, secondary surfaces |
| `--syn` | `#334155` | Long-form synthesis text |
| `--score` | `#EBF8FF` | Score badges and analytical highlights |
| `--conflict-bg` | `#FFF5F5` | Conflict and risk background |
| `--conflict-border` | `#FEB2B2` | Conflict borders |
| `--conflict-text` | `#C53030` | Conflict text |

### Dark Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#000000` | Main app background |
| `--sidebar` | `#0A0A0A` | Sidebar and nav surfaces |
| `--ink` | `#FFFFFF` | Primary text |
| `--accent` | `#FACC15` | Cyber-yellow brand accent |
| `--border` | `#222222` | Quiet dividers |
| `--muted` | `#888888` | Muted labels and metadata |
| `--callout` | `#111111` | Panels and report blocks |
| `--syn` | `#CCCCCC` | Long-form synthesis text |
| `--score` | `#332B00` | Score backgrounds |
| `--conflict-bg` | `#1A0505` | Conflict background |
| `--conflict-border` | `#4A1212` | Conflict border |
| `--conflict-text` | `#FC8181` | Conflict text |

### Token Rules

- Use `bg-my-bg`, `bg-my-sidebar`, `bg-my-callout`, `text-my-ink`, `text-my-muted`, `text-my-accent`, `border-my-border`, and related theme utilities.
- Do not create a separate color system for a new feature.
- Keep dark mode as a first-class experience. Dark mode should feel black, sharp, and cyber-yellow, not blue-purple or gray-heavy.
- Light mode should feel editorial, clean, and analytical, not beige, warm marketing, or playful.
- Accent color is functional. Use it for active state, progress, highlights, primary CTAs, and important system signals.
- Avoid large decorative gradients except where already established in hero/editorial surfaces.

## Typography

COGNAPSE uses three type families from `src/index.css`:

- Serif: `Lora`, fallback `Georgia`, for editorial titles and archive/report names.
- Sans: `Inter`, fallback system sans, for UI controls and normal product text.
- Mono: `JetBrains Mono`, for technical metadata, replay, diagnostics, and processing details.

### Type Roles

**Hero/editorial titles**

- Use `font-serif`, bold, italic when appropriate.
- Use large, tight, dramatic titles only on hero or major empty states.
- Examples: "Total Awareness.", "The Research Ecosystem.", "COGNAPSE CORE."

**Report titles**

- Use serif.
- Keep line-height tight.
- Current pattern: `font-serif text-[32px] leading-[1.1] text-my-ink`.

**Control labels**

- Use small uppercase Inter.
- Use high weight and wide tracking.
- Current pattern: `text-[9px] font-black uppercase tracking-widest`.

**Section labels**

- Small, uppercase, muted, with a bottom border.
- Current pattern: `text-[10px] uppercase tracking-[0.1em] font-bold text-my-muted border-b border-my-border pb-1`.

**Body synthesis**

- Use `text-my-syn`, small but readable, line-height around `1.6`.
- Keep report prose calm and information-dense.

## Layout Principles

COGNAPSE layouts should be dense, structured, and readable.

- Use hard edges and low-radius panels: `rounded-[2px]`, `rounded-[4px]`, or no radius.
- Prefer borders, dividers, grids, and thin lines over soft card stacks.
- Use panels for actual tools, reports, archive items, and modals.
- Avoid nested decorative cards.
- Maintain strong hierarchy: nav, archive/sidebar, research canvas, report, metadata.
- Keep controls close to the content they affect.
- Shared/public views must feel read-only and professional, not like an editable workspace.

Common layout patterns:

- Top fixed nav: compact, translucent on scroll, 56px height.
- Left archive sidebar: persistent research history and user score.
- Main research canvas: centered content, max width around `max-w-4xl`.
- Report pages: two-column desktop layout with synthesis left and metrics/map/sources right.
- Shared research: `max-w-5xl`, read-only status banner, report content, no exploration controls.

## Components

### Brand Logo

Use `BrandLogo` for the product mark. It contains:

- rotating hexagon
- pulsing accent core
- dashed data ring
- research-mode neural companion variant

Do not replace it with plain text or a new logo style in core UI. The logo represents active intelligence processing.

### Buttons

Primary buttons:

- dark ink background in light mode
- accent yellow background in dark mode
- uppercase, small, bold, tracked text
- icon + label when the action benefits from recognition
- subtle scale or opacity transitions

Use lucide icons for actions whenever possible.

Examples:

- `Share2` for Share
- `Download` for report export
- `Lock` for locked premium actions
- `Search` for search
- `BookOpen` for notebook/manual
- `Activity` for research
- `ShieldCheck` for authorized status

Avoid pill-heavy UI unless the control is intentionally compact, like the command bar or navbar utility group.

### Panels

Panels should use:

- `bg-my-callout`
- `border border-my-border`
- compact padding
- small uppercase headings
- low radius or square edges

Panels should never look like marketing cards unless they are on the landing page feature grid.

### Archive Items

Archive items use:

- serif italic titles
- muted italic summaries
- tiny uppercase metadata
- accent active indicator
- no oversized thumbnails

The archive is a research memory system, not a content feed.

### Reports

Reports should prioritize:

- bottom-line summary
- synthesis
- metrics
- map visualization
- sources
- conflicts and bias alerts
- follow-up exploration only in editable owner views

Shared reports must not show:

- Investigate Further
- Cognition Replay
- editing or branching controls

## Motion And Atmosphere

Motion is part of the Cognapse identity, but it must feel analytical and purposeful.

Approved motion patterns:

- slow rotating rings
- subtle scan lines
- pulsing status dots
- progress bars
- fade/slide report entrance
- command menu reveal
- loading phases
- neural map motion

Avoid:

- playful bouncing outside status/reward moments
- large decorative motion that distracts from research
- random animations on dense report text
- motion that causes layout shift

The global scanline and vignette effect are part of the intelligence-terminal atmosphere. Preserve them unless there is a clear performance reason.

## Voice And Copy

COGNAPSE copy should be concise, authoritative, and operational.

Use:

- "Research"
- "Analysis"
- "Synthesis"
- "Archive"
- "Source"
- "Verify"
- "Shared Research"
- "Read-only"
- "Dossier"
- "Protocol"
- "Authorized"

Avoid:

- "post"
- "feed" for user-generated social content
- "like"
- "comment"
- "follow"
- "viral"
- "community"
- "collab" unless a real collaboration system exists

### Preview Feature Message

Current approved style:

> Research sharing is a preview feature. Public links are read-only and may receive UX refinements before final release.

Use calm professional wording. Do not over-apologize, and do not imply broken functionality.

## Feature-Specific Rules

### Shared Research

Shared Research must remain read-only for visitors.

Shared pages should show:

- title
- bottom-line summary
- report synthesis
- intelligence map / graph visualization
- metrics
- sources
- timestamps
- visibility metadata
- detailed report view when available

Shared pages should not show:

- Investigate Further
- Cognition Replay
- fork controls
- edit controls
- collaboration controls
- chat-style interaction

### Intelligence Boards, Collaboration, Forks

These features were removed from the active product. Do not reference them in UI, copy, routes, Firestore rules, or new product surfaces unless they are intentionally reintroduced with a complete product flow.

Do not add:

- board links
- collaborator invitations
- fork lineage
- fork buttons
- social activity feeds

## Accessibility And Contrast

The app includes global contrast corrections:

- In light mode, dark/accent buttons force white text.
- In dark mode, ink/accent buttons force black text.

When adding controls:

- Preserve readable contrast in both themes.
- Do not put muted text on low-opacity surfaces if it becomes unreadable.
- Keep click targets usable on mobile.
- Avoid tiny text for important body content. Tiny uppercase is for labels, metadata, and controls only.

## Implementation Standards

Use existing patterns before creating new abstractions.

Required for new UI:

- Use theme tokens from `src/index.css`.
- Use lucide icons when an icon exists.
- Use existing spacing and border language.
- Support both light and dark mode.
- Keep mobile layouts from overlapping.
- Keep read-only pages genuinely non-interactive where required.

Do not:

- introduce a separate Tailwind config color palette for brand UI
- add large rounded SaaS cards to operational screens
- add social media mechanics
- use purple/blue gradient SaaS styling
- make a new landing page when the user asks for a usable feature
- add collaboration architecture without a full invite, accept, permissions, notification, and ownership flow

## Quick Reference

Best default UI recipe:

```tsx
<section className="border border-my-border bg-my-callout p-4 rounded-[4px]">
  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-3">
    Section Label
  </h2>
  <p className="text-sm leading-relaxed text-my-syn">
    Dense, useful research-facing content.
  </p>
</section>
```

Best default action button:

```tsx
<button className="px-4 py-2 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
  Action
</button>
```

Best default metadata:

```tsx
<span className="text-[9px] text-my-muted font-bold uppercase tracking-widest">
  Metadata
</span>
```

## Final Rule

If a new design does not feel like it belongs inside a focused intelligence analyst OS, it does not belong in Cognapse.
