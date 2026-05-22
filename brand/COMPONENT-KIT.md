# COGNAPSE Component Kit

## Import primitives

```tsx
import {
  Panel,
  SectionLabel,
  MetaLabel,
  Button,
  PageHeader,
  StatusDot,
} from '../components/ui';
```

## Panel

Default intelligence surface.

```tsx
<Panel>
  <SectionLabel>Source verification</SectionLabel>
  <p className="text-sm leading-relaxed text-my-syn">Content…</p>
</Panel>
```

## SectionLabel

```tsx
<SectionLabel className="mb-3">Research Activity Map</SectionLabel>
```

## MetaLabel

```tsx
<MetaLabel>Last sync · 22:10</MetaLabel>
```

## Button variants

| Variant | When |
|---------|------|
| `primary` | Main action (dark ink light / yellow dark) |
| `secondary` | Bordered neutral |
| `ghost` | Toolbar icons |
| `signal` | Premium, high-attention CTA |
| `danger` | Purge, destructive |

```tsx
<Button variant="primary" icon={<Search size={14} />}>
  Begin analysis
</Button>
```

## PageHeader

Knowledge Hub, Operative Status, settings pages.

```tsx
<PageHeader
  icon={<Newspaper size={20} />}
  title="Knowledge Hub"
  subtitle="Global Event Tracking"
  status={<StatusDot state="live" label="Last Sync: 22:10" />}
  actions={<Button variant="ghost" … />}
/>
```

## StatusDot

| State | Dot |
|-------|-----|
| `live` | Green, steady |
| `syncing` | Accent pulse |
| `error` | Red |
| `idle` | Muted |

## Layout recipes

### Two-column report (desktop)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
  <div className="space-y-6">{/* synthesis */}</div>
  <aside className="space-y-4">{/* metrics, map */}</aside>
</div>
```

### Archive row

```tsx
<button className="w-full text-left p-4 border border-my-border hover:border-my-accent/40 transition-colors">
  <h3 className="font-serif font-bold italic text-my-ink text-sm">Title</h3>
  <p className="text-[10px] text-my-muted mt-1 line-clamp-2">Snippet</p>
  <MetaLabel className="mt-2">TECH · 2h ago</MetaLabel>
</button>
```

### Modal shell

```tsx
<div className="relative w-full max-w-lg bg-my-bg border border-my-border shadow-2xl">
  <div className="h-1 w-full bg-gradient-to-r from-my-accent via-my-signal to-my-accent" />
  …
</div>
```

## Tailwind recipes (`brandClasses`)

```tsx
import { brandClasses as bc } from '../styles/brand';

<section className={bc.panel}>
  <h2 className={bc.sectionLabel}>Label</h2>
</section>
```

## Do not

- `rounded-2xl shadow-xl` cards on operational screens  
- `bg-orange-500` / `#F27D26` literals  
- Pill buttons everywhere  
- Gradient purple SaaS hero sections inside the app shell  
