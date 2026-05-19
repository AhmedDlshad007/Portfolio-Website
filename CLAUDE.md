# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Ahmed Dlshad Mohammed. The site has a deep-space animated canvas background, an immersive hero section with letter-by-letter assembly animations, and an OpenAI-powered chatbot that answers questions about his resume. Live at https://ahmed-dlshad-site.netlify.app. The Next.js code lives in `portifolio-website-azure-ai/` (yes, the directory name is a typo of "portfolio" — it predates this work).

## Commands

All commands run from `portifolio-website-azure-ai/`:

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build (static export to out/)
npm run lint         # ESLint via Next.js
```

No test suite exists. Verification is visual — open the dev server and check behavior in a browser.

## Architecture

### Single Page Component (page.tsx, ~1750 lines)

Everything lives in `app/page.tsx` — a single `"use client"` component containing:
- All section JSX (hero, marquee, about, skills, experience, projects, contact, footer)
- Two parallel OpenAI chat states: `messages`/`setMessages` for the inline contact-section chatbot, and `floatMessages`/`setFloatMessages` for the floating chat panel
- The full `resumeContent` string passed to OpenAI as system context
- Multiple `useEffect` hooks that wire up: space engine boot, hero animation sequence, magnetic buttons, IntersectionObserver scroll reveals, skill tag stagger, header scroll state, floating chat open/close

There are no child components. Animations are coordinated through `useRef` handles on elements like `heroNameInnerRef`, `heroSubtitleRef`, etc.

### Space Engine (public/space-engine.js, ~1060 lines)

Standalone vanilla-JS Canvas2D renderer loaded dynamically from `page.tsx` via a `<script>` tag. Renders 17 layered effects: dark base + indigo ambience, deep field (4000 sub-pixel stars), dark nebulae, layered stars (3 depth tiers, ~3000 total), nebula gas wisps, nebula blobs, star clusters, spiral galaxies, cosmic dust lanes, warp pulses, shooting stars, mouse trail, cursor glow, click bursts (currently disabled — listener removed), micro-event flashes, edge vignette.

Public API (must not break — page.tsx depends on these):
- `window.bootSpace(cfg)` — initialize and start the render loop
- `window.updateSpaceCfg(partialCfg)` — live tweaks

Internal performance architecture:
- Delta-time animation (frame-rate independent)
- Star arrays partitioned by layer (no per-frame filtering)
- Color strings pre-computed as LUTs (no per-frame template-literal allocation)
- Blurred layers (nebula, dust, cursor glow) rendered to offscreen canvases at 1/4 resolution, updated every 4 frames
- Stars have `z`/`baseZ` coordinates for a 3D depth system — but currently the perspective only affects star size and alpha, not position. The infrastructure is partially wired up but the dramatic "flying through space on scroll" effect is muted (see "Known half-implemented features" below)

Embedded 2D simplex noise (IIFE at top of file) drives nebula and dark-nebulae drift.

### Hero Animation Sequence (orchestrated in page.tsx)

Plays once on mount, runs ~4-5 seconds:
1. "Ahmed Dlshad" name letters fly in from random scatter positions (60ms stagger), gradient applied from frame 1
2. Subtitle typewriter at 38ms/char with blinking fuchsia cursor
3. Description words reveal with blur-to-clear (40ms stagger)
4. CTA buttons + social icons fade in

Letters get inline CSS custom properties (`--lx`, `--ly`, `--lr`) for random scatter positions. `name-shimmer` keyframe animates the gradient indefinitely once letters land.

### Per-Section Color Tints (globals.css)

The unified purple identity breaks intentionally between sections:
- Hero, About, Skills, Contact, Footer: purple (`#9333ea` accent)
- Experience: blue/indigo (`#3b82f6` / `#60a5fa`)
- Projects: teal/emerald (`#14b8a6` / `#5eead4`)

Implemented as `.experience-section .*` and `.projects-section .*` overrides in globals.css after the base purple styles. The space canvas behind stays the same — only the foreground UI shifts color.

### Chatbot (Client-Side OpenAI)

Site is statically exported, so both chatbots call OpenAI directly from the browser using `NEXT_PUBLIC_OPENAI_API_KEY`. The `app/api/route.ts` file is **not used at runtime** — it was the original server-side route before the static export migration. It contains an older copy of the resume that can drift from the one in `page.tsx`.

Both inline and floating chats use identical OpenAI logic with separate state. The floating chat panel (`#float-chat-panel`) has its own slide-up animation and a pulsing button (`#float-chat-btn`).

### Styling

Pure CSS in `app/globals.css` (~830 lines). No Tailwind classes in markup despite Tailwind being installed. Design system uses CSS custom properties (`--purple-*`, `--dark-*`, `--gradient-*`).

`app/globals-old.css` is the pre-Claude-Design stylesheet. Not imported anywhere — kept for reference but safe to delete.

### Dual Config Files

`next.config.js` is the active one (sets `output: 'export'` for static hosting). `next.config.ts` is the default scaffold and is effectively unused.

## TypeScript Conventions

- Explicit types for event handlers (e.g., `React.FormEvent<HTMLFormElement>`)
- camelCase for SVG attributes in JSX (`strokeLinecap`, not `stroke-linecap`)
- The `Window` interface is augmented for `bootSpace` and `updateSpaceCfg` at the top of `page.tsx`

## Environment Variables

- `NEXT_PUBLIC_OPENAI_API_KEY` — required for chatbots (client-side, exposed in bundle)
- `OPENAI_API_KEY` — used by the unused server-side API route
- Dev: `.env.local` | Prod: Netlify dashboard

## Known Half-Implemented Features

These exist in the code but aren't visually dramatic — touch them only with intent:

- **Scroll-driven 3D depth flight**: Stars carry `z`/`baseZ` coordinates and a perspective multiplier. Scroll position modifies `z` via `scrollDepth`. But the perspective only scales star size/alpha — it doesn't warp position. Earlier iterations did warp position and stars looked like a vortex; that was pulled back. To make scrolling feel like flying through space, apply perspective to `screenX`/`screenY` too, but cap aggressively to avoid the vortex.
- **Tech marquee**: Renders at `opacity: 0.45` on near-black. The original design reviewer flagged this as invisible. Currently unchanged — either commit to making it legible or remove.

## Key Constraints

- Static export means no server-side API routes, middleware, or `getServerSideProps`
- Images must use `<img>` tags or `unoptimized: true` on `next/image` — no Next.js image optimization in static export
- The OpenAI chatbots use GPT-3.5 Turbo with `max_tokens: 150` to control costs
- The space engine starts `requestAnimationFrame` at boot. There is a cleanup path via `window.stopSpace()` — call it on unmount if you remount the engine
