# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Ahmed Dlshad Mohammed — a single-page site with an OpenAI-powered chatbot that answers questions about his resume. Live at https://ahmed-dlshad-site.netlify.app. The actual application code lives in the `portifolio-website-azure-ai/` subdirectory (not the repo root).

## Commands

All commands run from `portifolio-website-azure-ai/`:

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build (static export to out/)
npm run lint         # ESLint via Next.js
```

No test suite exists in this project.

## Architecture

### Dual Config Files

There are two Next.js config files. `next.config.js` is the active one — it sets `output: 'export'` and `images: { unoptimized: true }` for static hosting. `next.config.ts` is the default scaffold and is effectively unused.

### Single-Page App in One Component

The entire site is a single client component in `app/page.tsx` (`"use client"`). It contains all sections (hero, about, skills, experience, projects, contact/chatbot, footer) plus all chatbot state and logic. There are no child components — everything is in `Home()`.

### Chatbot: Client-Side OpenAI Calls

The chatbot calls the OpenAI API directly from the browser (not through a backend route) because the site is statically exported. The API key is exposed via `NEXT_PUBLIC_OPENAI_API_KEY`. The `app/api/route.ts` file exists but is **not used at runtime** — it was the original server-side route before the static export migration.

Resume content is embedded as a string literal inside `page.tsx` (the `resumeContent` variable) and passed to OpenAI as the system message context. A separate, older copy of the resume exists in `app/api/route.ts` — these two copies can drift.

### Styling

Pure CSS in `app/globals.css` with CSS custom properties (no Tailwind utility classes in markup despite Tailwind being installed). The design system uses a black/purple color palette defined via `--purple-*` and `--dark-*` variables. `globals-old.css` is the pre-redesign stylesheet kept for reference.

### Static Export & Hosting

`next.config.js` sets `output: 'export'`, producing a fully static site in `out/`. Netlify config is in `netlify.toml` with a catch-all redirect for client-side routing. Environment variables for production are set in the Netlify dashboard.

## TypeScript Conventions

- Explicit types for event handlers (e.g., `React.FormEvent<HTMLFormElement>`)
- `crossOrigin="anonymous"` as string, not boolean
- camelCase for SVG/HTML attributes in JSX (`strokeLinecap`, `strokeLinejoin`, `strokeWidth`)
- PascalCase component names, camelCase functions and variables

## Environment Variables

- `NEXT_PUBLIC_OPENAI_API_KEY` — required for chatbot (client-side, exposed in bundle)
- `OPENAI_API_KEY` — used by the unused server-side API route
- Dev: `.env.local` | Prod: Netlify dashboard

## Key Constraints

- Static export means no server-side API routes, middleware, or `getServerSideProps`
- Images must use `<img>` tags or `unoptimized: true` on `next/image` — no Next.js image optimization in static export
- The OpenAI chatbot uses GPT-3.5 Turbo with `max_tokens: 150` to control costs
