# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Ahmed Dlshad Mohammed. The site has a deep-space animated canvas background, an immersive hero section with letter-by-letter assembly animations, and an AI chatbot (OpenRouter-backed, via a server-side proxy) that answers questions about his resume. The Next.js code lives in `portifolio-website-azure-ai/` (yes, the directory name is a typo of "portfolio" — it predates this work).

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
- Two parallel chat states: `messages`/`setMessages` for the inline contact-section chatbot, and `floatMessages`/`setFloatMessages` for the floating chat panel — both POST to the server-side `/api/chat/` route (the resume context no longer lives here; see Chatbot below)
- Multiple `useEffect` hooks that wire up: space engine boot, hero animation sequence, magnetic buttons, IntersectionObserver scroll reveals + section warp jumps, skill tag stagger, header scroll state, floating chat open/close

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

### Chatbot (Server-Side OpenRouter Proxy)

Both chatbots POST to a server-side route handler at `app/api/chat/route.ts`, which proxies to OpenRouter. The secret `OPENROUTER_API_KEY` stays on the server and never ships in the client bundle, and the request is same-origin so there is no CORS. This is what required dropping static export — the site now needs a Node.js runtime host (Vercel), and `output: 'export'` has been removed from `next.config.js`.

Key details:
- **Model**: defaults to `anthropic/claude-haiku-4.5` (~$0.002/chat, reliable). Override at runtime via the `OPENROUTER_MODEL` env var — no code change needed (e.g. `google/gemini-2.5-flash` for lower cost). `max_tokens: 350`, `temperature: 0.7`. Avoid `:free` model slugs: their providers frequently return 402/429 regardless of your account balance.
- **Resume context**: the full `resumeContent` / `SYSTEM_PROMPT` lives in `route.ts` as the single source of truth. It no longer ships to the browser and can't drift across copies. The old client-side `resumeContent` in `page.tsx` and the unused `app/api/route.ts` were both removed.
- **Trailing slash**: because of `trailingSlash: true` in `next.config.js`, the client must fetch `/api/chat/` (with the trailing slash). A POST to `/api/chat` gets a 308 redirect that drops the body.
- **Failure modes**: route returns 500 if `OPENROUTER_API_KEY` is unset, 502 if OpenRouter itself errors (logged server-side as `OpenRouter request failed:` with status + detail).

Both inline (`messages`) and floating (`floatMessages`) chats use identical fetch logic with separate state. The floating chat panel (`#float-chat-panel`) has its own slide-up animation and a pulsing button (`#float-chat-btn`).

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

- `OPENROUTER_API_KEY` — **required** for the chatbot. Server-side only (read in `app/api/chat/route.ts`); never exposed to the client.
- `OPENROUTER_MODEL` — optional override for the chat model (defaults to `anthropic/claude-haiku-4.5`).
- Dev: `.env.local` | Prod: Vercel project settings.
- The legacy `NEXT_PUBLIC_OPENAI_API_KEY` / `OPENAI_API_KEY` are no longer used by any code and can be deleted from the host.

## Known Half-Implemented Features

These exist in the code but aren't visually dramatic — touch them only with intent:

- **Scroll-driven 3D depth flight**: Stars carry `z`/`baseZ` coordinates and a perspective multiplier. Scroll position modifies `z` via `scrollDepth`. But the perspective only scales star size/alpha — it doesn't warp position. Earlier iterations did warp position and stars looked like a vortex; that was pulled back. To make scrolling feel like flying through space, apply perspective to `screenX`/`screenY` too, but cap aggressively to avoid the vortex.
- **Tech marquee**: Renders at `opacity: 0.45` on near-black. The original design reviewer flagged this as invisible. Currently unchanged — either commit to making it legible or remove.

## Key Constraints

- The site is server-rendered on Vercel (no longer a static export). Server-side route handlers like `app/api/chat/route.ts` work; the chat route sets `runtime = "nodejs"` and `dynamic = "force-dynamic"` so it always runs fresh on the server.
- Images use `<img>` tags or `unoptimized: true` on `next/image` (set in `next.config.js`) — kept from the static-export era, still fine.
- The chatbot uses OpenRouter (`anthropic/claude-haiku-4.5` by default) with `max_tokens: 350` to control costs. See the Chatbot section.
- The space engine starts `requestAnimationFrame` at boot. There is a cleanup path via `window.stopSpace()` — call it on unmount if you remount the engine. `window.warpBurst(intensity)` triggers a forward "jump" surge (used on section changes).
