# Portfolio Redesign — Option A ("Restraint Mode") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform a visually-overloaded portfolio into a calm, focused, type-led design that lets the space engine and the content carry the impression — by stripping concurrent motion, unifying color identity, consolidating duplicate sections, removing the duplicate chat surface, and upgrading typography.

**Architecture:** Single-page Next.js client component (`portifolio-website-azure-ai/app/page.tsx`, ~1910 lines) with `app/globals.css` (~918 lines) + canvas-driven background (`public/space-engine.js`) + server-side chat proxy (`app/api/chat/route.ts`). This plan touches only presentation layers — `page.tsx`, `globals.css`, font loading in `app/layout.tsx`, and minor repo hygiene. No backend / chat API changes.

**Tech Stack:** Next.js 15, React 19, vanilla CSS (no Tailwind in markup), Canvas2D engine.

**Verification model:** No test suite exists in this project (per CLAUDE.md: "Verification is visual"). Each task ends with a manual verification step describing exactly what to see (or not see) at `http://localhost:3000` after `npm run dev`. Run the dev server once at the start of execution and keep it open — Turbopack hot-reload picks up edits.

**Branch:** Suggest a single branch `redesign/option-a` rather than ten micro-PRs — visual diffs need to be reviewed holistically.

---

## Phase ordering (biggest impact → smallest polish)

| # | Phase | Why first / last | Risk |
|---|---|---|---|
| 1 | Section consolidation (kill Skills + Marquee, fold into About) | Removes two whole sections — biggest visual delta | Med |
| 2 | Type-led hero redesign | Reshapes the most-viewed screen | Med |
| 3 | One chatbot (floating only) | Architectural simplification; removes ~200 lines of duplicate state | Low |
| 4 | Color identity unification (commit to purple) | Removes three palettes → one; tightens brand | Low |
| 5 | Motion strip (kill concurrent infinite animations) | Calms the page; ~10 animations → 2-3 | Low |
| 6 | Projects bento layout (varied tile sizes) | Real bento, not banner+grid | Med |
| 7 | Typography upgrade (Archivo + Space Grotesk) | Disproportionate aesthetic lift | Low |
| 8 | Quality polish (image, badge, glass, focus) | Small fixes from the audit | Low |
| 9 | Repo hygiene (delete tar.gz, old.css, unused files) | Cleanup | None |
| 10 | Verification pass (reduced-motion, breakpoints, focus, perf) | Catch regressions | — |

---

## File map

**Modify:**
- `portifolio-website-azure-ai/app/page.tsx` — every phase touches this; biggest deltas in phases 1, 2, 3, 6
- `portifolio-website-azure-ai/app/globals.css` — every phase except 3 (chat) touches this
- `portifolio-website-azure-ai/app/layout.tsx` — phase 7 only (font loading)

**Delete:**
- `design-file.tar.gz`, `design-file-2.tar.gz` (root)
- `portifolio-website-azure-ai/app/globals-old.css` (per CLAUDE.md: "safe to delete")
- `portifolio-website-azure-ai/app/api/route.ts` if still present (per CLAUDE.md: "removed" — verify)

**Keep untouched:**
- `public/space-engine.js` — its public API (`bootSpace`, `updateSpaceCfg`, `warpBurst`, `setSpaceAccent`, `stopSpace`) stays unchanged. We change only the *config* passed in `bootSpace`.
- `app/api/chat/route.ts` — server logic and SYSTEM_PROMPT untouched.

---

# Phase 1 — Section consolidation

**Why first:** This deletes ~150 lines of JSX and ~100 lines of CSS. Doing it before the hero rewrite keeps the diff for phase 2 focused. The skill recommendation ("monochrome + a single accent, let the work shine") justifies fewer sections.

### Task 1.1: Delete the Tech Marquee section

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1110-1128` (JSX block)
- Modify: `portifolio-website-azure-ai/app/page.tsx:20-31` (MARQUEE_TECHS const + marqueeSpanStyle)
- Modify: `portifolio-website-azure-ai/app/globals.css:350-370` (`.tech-marquee`, `.marquee`, `.track`, `@keyframes marquee`)

- [ ] **Step 1: Delete the JSX block**

In `page.tsx`, remove the entire block from `{/* ══════════ Tech Marquee ══════════ */}` (line ~1110) through the closing `</section>` (line ~1128).

- [ ] **Step 2: Delete the constants**

In `page.tsx`, remove lines 20–31:

```ts
const MARQUEE_TECHS = [ ... ];
const marqueeSpanStyle: React.CSSProperties = { ... };
```

- [ ] **Step 3: Delete the CSS rules**

In `globals.css`, remove lines 350–370 (`.tech-marquee`, `.tech-marquee::before/::after`, `.marquee`, `.track`, `.track span`, `@keyframes marquee`).

- [ ] **Step 4: Delete the reduced-motion override for `.track`**

In `globals.css`, inside the `@media (prefers-reduced-motion: reduce)` block at the bottom, remove these two lines:

```css
.track { animation: none !important; }
.track span { opacity: 0.78; }
```

- [ ] **Step 5: Verify in browser**

Hard-refresh `http://localhost:3000`. Scroll past the hero. The strip of repeating tech words (Python, TypeScript, …) between the hero and About is gone. About starts directly after the hero.

- [ ] **Step 6: Commit**

```bash
git add portifolio-website-azure-ai/app/page.tsx portifolio-website-azure-ai/app/globals.css
git commit -m "remove(marquee): drop tech marquee section (consolidating into About)"
```

### Task 1.2: Delete the Skills card grid

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1185-1342` (skills-grid container + 4 skill-category cards)
- Modify: `portifolio-website-azure-ai/app/globals.css:417-461` (`.skills-grid`, `.skill-category`, `.skill-tag`, stagger ripple, `@keyframes tag-ripple`)
- Modify: `portifolio-website-azure-ai/app/page.tsx:770-776` (the skill tag stagger useEffect)
- Modify: `portifolio-website-azure-ai/app/page.tsx:903-906` (header nav link for "Skills")
- Modify: `portifolio-website-azure-ai/app/page.tsx:1722-1724` (footer nav link for "Skills")

- [ ] **Step 1: Delete the `<div id="skills" className="skills-grid">…</div>` block**

In `page.tsx`, remove lines ~1185 through ~1342 (the whole `<div id="skills" className="skills-grid">` and its 4 child `.skill-category` blocks). This is inside `.about-content`.

- [ ] **Step 2: Delete the stagger useEffect**

In `page.tsx`, remove the useEffect at lines 770–776 ("6) SKILL TAG STAGGER" block).

- [ ] **Step 3: Remove the header nav link**

In `page.tsx`, find line ~903 `<li><a href="#skills">Skills</a></li>` and delete that entire `<li>`.

- [ ] **Step 4: Remove the footer nav link**

In `page.tsx`, find line ~1723 `<a href="#skills">Skills</a>` in the footer's Navigation column and delete just that anchor line.

- [ ] **Step 5: Delete the CSS**

In `globals.css`, remove lines 417–461 (`.skills-grid`, `.skill-category`, `.skill-category:hover`, `.category-icon`, `.skill-category h3`, `.skill-tags`, `.skill-tag`, the two `.skill-category:hover .skill-tag` rules, `@keyframes tag-ripple`).

- [ ] **Step 6: Verify in browser**

Refresh. The four skill cards (Languages / Frameworks / AI & Agents / Cloud & Tools) are gone. The About section now has just the text + stats on the left, and an empty right column.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "remove(skills): drop 4-card skill grid (consolidating into About)"
```

### Task 1.3: Restructure About to single-column with inline "Current stack" strip

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1131-1344` (about-skills-section block)
- Modify: `portifolio-website-azure-ai/app/globals.css:386-415` (`.about-skills-section`, `.about-content`, `.about-text`, `.stats-grid`, `.stat-card`)

- [ ] **Step 1: Add the stack data constant near the top of `page.tsx`**

Insert this near the other constants (around line 33, after `SUGGESTED_PROMPTS`):

```ts
/* ────────────────────────────────────────────
   Current stack — one-line inline strip in About.
   Replaces the deleted Skills cards and Tech Marquee.
──────────────────────────────────────────── */
const CURRENT_STACK = [
  "Python", "TypeScript", "React", "Next.js", "Node.js",
  "MCP", "OpenRouter", "RAG", "AWS", "Docker", "C++",
];
```

- [ ] **Step 2: Replace the about JSX**

In `page.tsx`, find the entire `<div className="about-content">…</div>` block (was lines ~1138-1343). Replace it with a single-column layout that includes the stack strip:

```tsx
<div className="about-content">
  <div className="about-text reveal">
    <h3>Building Where Agentic AI Meets Full-Stack</h3>
    <p>
      Hi! I&apos;m Ahmed Dlshad Mohammed, a Full-Stack &amp; Agentic
      AI Engineer at BlackCode (Switzerland, remote). I hold a B.Sc.
      in Software Engineering with honours from Universiti Teknologi
      Malaysia (UTM), graduated March 2025.
    </p>
    <p>
      My current focus is Companion — an Agentic AI desktop
      controller built on the Model Context Protocol (MCP). It lets
      AI agents drive the browser, the local filesystem, and Gmail,
      with multi-model support through OpenRouter. Alongside it, I
      lead React/Next.js + Node.js/Python product work.
    </p>
    <p>
      I work across Python, TypeScript, C++, and Java. Native Kurdish
      and Arabic speaker, proficient in English (B2–C1). I&apos;m
      driven by problems where good engineering and AI capability
      combine into something genuinely useful.
    </p>

    {/* Current stack — inline strip, replaces the removed Skills section */}
    <div className="about-stack" aria-label="Current technology stack">
      <span className="about-stack-label">Current stack</span>
      <div className="about-stack-tags">
        {CURRENT_STACK.map((tech) => (
          <span key={tech} className="about-stack-tag">{tech}</span>
        ))}
      </div>
    </div>

    <div className="stats-grid">
      <div className="stat-card reveal" style={{ transitionDelay: "0.1s" }}>
        <h4>2+</h4>
        <p>Years Experience</p>
      </div>
      <div className="stat-card reveal" style={{ transitionDelay: "0.2s" }}>
        <h4>7+</h4>
        <p>Projects Completed</p>
      </div>
      <div className="stat-card reveal" style={{ transitionDelay: "0.3s" }}>
        <h4>3</h4>
        <p>Languages</p>
      </div>
    </div>
  </div>
</div>
```

Notes vs. the original: removed `from-left` from `.about-text` (since there's no right column to balance against, an entrance from the left becomes pointless). Removed the `<div id="skills" className="skills-grid">…</div>` entirely. Inserted the new `.about-stack` block between the paragraphs and the stats grid.

- [ ] **Step 3: Update the `.about-content` CSS — single column**

In `globals.css`, find line ~391 and change:

```css
.about-content { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
```

to:

```css
.about-content { max-width: 820px; margin: 0 auto; }
```

- [ ] **Step 4: Add the `.about-stack` styles**

In `globals.css`, immediately after the `.about-text p { … }` rule (around line 393), append:

```css
/* Inline "Current stack" strip — replaces removed Skills section */
.about-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin: 32px 0 8px;
  padding: 18px 22px;
  background: rgba(3,0,10,0.42);
  backdrop-filter: blur(14px) saturate(120%);
  border: 1px solid rgba(147,51,234,0.12);
  border-radius: 16px;
}
.about-stack-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--purple-300);
  white-space: nowrap;
}
.about-stack-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.about-stack-tag {
  padding: 5px 12px;
  background: rgba(147,51,234,0.10);
  border: 1px solid rgba(147,51,234,0.25);
  border-radius: 14px;
  color: var(--purple-200);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
```

- [ ] **Step 5: Remove the `from-left` responsive override that no longer applies**

In `globals.css` mobile breakpoint at line ~875, the rule `.hero-content, .about-content, .contact-content { grid-template-columns: 1fr; gap: 40px; }` still references `.about-content`. Update it to remove `.about-content` from that selector (since it's no longer a grid):

```css
.hero-content, .contact-content { grid-template-columns: 1fr; gap: 40px; }
```

- [ ] **Step 6: Verify in browser**

Refresh. About section is now a single centered column. Below the three paragraphs you should see a single-line stack strip ("CURRENT STACK" label + tag pills). Below that, the three stat cards (2+, 7+, 3). No empty right column.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(about): single-column with inline 'Current stack' strip"
```

---

# Phase 2 — Type-led hero redesign

**Why second:** Hero is the highest-impact screen. With Skills/Marquee gone, hero's role is clearer.

**Direction:** Demote the photo to a small floating avatar (or remove). Push the name to 10rem desktop / 6rem tablet / 4rem mobile. The space engine becomes the visual; the name *is* the brand mark.

### Task 2.1: Remove the photo + orbit rings + glow bloom

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1077-1092` (hero-image block)
- Modify: `portifolio-website-azure-ai/app/globals.css:276-340` (image-wrapper, orbit rings, glow-effect, figure-float, bloom-pulse)

- [ ] **Step 1: Delete the hero-image JSX**

In `page.tsx`, remove the entire `<div className="hero-image reveal from-right" …>…</div>` block (lines ~1078-1092).

- [ ] **Step 2: Delete photo-related CSS**

In `globals.css`, remove lines 276–340 (`.hero-image`, `.image-wrapper`, `.image-wrapper::before/::after`, `@keyframes orbit-ring-1/-2`, `.glow-effect`, `.image-wrapper img`, `@keyframes figure-float`, `@keyframes bloom-pulse`, the orphan `@keyframes float` and `@keyframes pulse-glow`).

- [ ] **Step 3: Verify**

Refresh. The hero's right column is empty — name + subtitle + description + CTAs + socials are still there on the left. No orbit, no portrait, no glow.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "remove(hero): drop portrait, orbit rings, glow bloom"
```

### Task 2.2: Convert hero to single-column type-led layout

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:946-1108` (hero section JSX)
- Modify: `portifolio-website-azure-ai/app/globals.css:149-203` (`.hero-modern`, `.hero-content`, `.hero-text`, `.hero-title`)

- [ ] **Step 1: Update `.hero-content` to single-column**

In `globals.css` line 156:

```css
.hero-content {
  display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
  align-items: center; max-width: var(--container-max);
  position: relative; z-index: 1; width: 100%;
}
```

becomes:

```css
.hero-content {
  max-width: 1100px;
  margin: 0 auto;
  position: relative; z-index: 1; width: 100%;
  text-align: left;
}
```

- [ ] **Step 2: Bump the hero title to oversize-display**

In `globals.css` line 169, replace:

```css
.hero-title { font-size: 72px; font-weight: 800; line-height: 1; margin-bottom: 20px; overflow: visible; }
```

with:

```css
.hero-title {
  font-size: clamp(56px, 11vw, 168px);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.04em;
  margin-bottom: 24px;
  overflow: visible;
}
```

- [ ] **Step 3: Bump the subtitle and tighten description**

In `globals.css` line 218, replace:

```css
.hero-subtitle {
  font-size: 30px; color: var(--purple-300); margin-bottom: 24px; font-weight: 600;
  ...
}
```

with (only font-size and weight change; keep the typewriter mechanics):

```css
.hero-subtitle {
  font-size: clamp(20px, 2.3vw, 32px);
  color: var(--purple-300);
  margin-bottom: 28px;
  font-weight: 600;
  border-right: 2px solid rgba(217,70,239,0.7);
  white-space: nowrap; overflow: hidden; width: 0;
  animation: cursor-blink 0.9s step-end infinite;
  transition: width 0.05s;
}
```

And `.hero-description` (line 249):

```css
.hero-description {
  font-size: 18px;
  color: var(--gray-400);
  max-width: 640px;
  margin-bottom: 36px;
  line-height: 1.75;
}
```

- [ ] **Step 4: Hide the scroll indicator on the new hero**

The bouncing "Scroll" arrow at the bottom is part of the motion overload — drop it.

In `page.tsx`, remove lines ~1095-1107 (`<div className="scroll-indicator">…</div>`).

In `globals.css`, remove lines 342–348 (`.scroll-indicator` + `@keyframes bounce`).

- [ ] **Step 5: Update mobile breakpoint**

In `globals.css` line ~876, the rule `.hero-title { font-size: 52px; }` and 891 `.hero-title { font-size: 36px; }` now conflict with the clamp(). Delete both lines (clamp handles responsive). Also delete `.hero-subtitle` font-size overrides at lines 877 and 892.

- [ ] **Step 6: Verify**

Refresh. The hero name "Ahmed Dlshad" should be massive — fill most of the horizontal space at 1440px width. Subtitle types out below it, description and CTAs follow. No "scroll" arrow. Resize the window from 375px → 1920px: the title scales smoothly via clamp.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(hero): type-led layout (oversize name, no portrait, no scroll arrow)"
```

### Task 2.3: Re-scatter the letter assembly across the new larger canvas

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:540-563` (letter assembly logic)

The original scatter distances (`dist = 60 + Math.random() * 120` → 60–180px) were sized for a 72px title. With clamp(56, 11vw, 168px) the title can be 168px tall — letters need to scatter further or the assembly looks tiny.

- [ ] **Step 1: Update the scatter distances**

In `page.tsx`, inside the letter-assembly forEach (line ~547):

```ts
const dist = 60 + Math.random() * 120;
```

becomes:

```ts
const dist = 120 + Math.random() * 220;
```

- [ ] **Step 2: Verify**

Hard-refresh (or open in an incognito tab to bypass the `hero-animated` sessionStorage flag). The letters should fly in from noticeably further out, matching the larger title size.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "tune(hero): widen letter scatter for oversize title"
```

---

# Phase 3 — One chatbot (floating only)

**Why third:** Once the page is shorter (sections removed in phase 1) and the hero is the focal point (phase 2), the Contact section's dual-chatbot pattern feels especially redundant. Removing the inline chatbot also removes ~200 lines of duplicate state from `page.tsx`.

### Task 3.1: Remove the inline chatbot JSX

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1618-1702` (`.chatbot-container` block)
- Modify: `portifolio-website-azure-ai/app/page.tsx:1533-1616` (the `.contact-content` 2-col wrapper — becomes single column)
- Modify: `portifolio-website-azure-ai/app/page.tsx:1532-1533` (section header — keep as is)

- [ ] **Step 1: Delete the `<div className="chatbot-container reveal scale-in">…</div>` block**

In `page.tsx`, remove the entire chatbot-container block (lines ~1619-1702).

- [ ] **Step 2: Replace `.contact-content` with a single-column flow ending in a CTA**

The current `.contact-content` is a 2-col grid: left = info + methods, right = chatbot. Make it single-column, and add a CTA button under the contact methods that opens the floating chat.

In `page.tsx`, change the wrapper from:

```tsx
<div className="contact-content">
  <div className="contact-info reveal from-left">
    ...
  </div>
  {/* Inline chatbot was here */}
</div>
```

to:

```tsx
<div className="contact-content">
  <div className="contact-info reveal">
    <h3>AI-Powered Assistant</h3>
    <p>
      I&apos;ve created an AI chatbot that knows my skills, work
      experience, and background. Ask it anything about my
      qualifications, projects, or experience.
    </p>
    <p>
      Prefer human contact? Email me, connect on LinkedIn, or
      download my resume below.
    </p>

    <button
      type="button"
      className="button primary magnetic contact-cta"
      onClick={toggleFloatChat}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Talk to my AI</span>
    </button>

    <div className="contact-methods">
      {/* the existing email, linkedin, resume <a> elements stay exactly as they were */}
      ...
    </div>
  </div>
</div>
```

Keep the inner `<a>` elements (Email, LinkedIn, Resume) exactly as they were (lines ~1547-1614).

- [ ] **Step 3: Update `.contact-content` CSS to single-column**

In `globals.css` line 604:

```css
.contact-content { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
```

becomes:

```css
.contact-content { max-width: 720px; margin: 0 auto; }
```

- [ ] **Step 4: Add styles for the new `.contact-cta` button**

In `globals.css`, after the `.contact-method` rules (around line 620), append:

```css
.contact-cta {
  margin: 28px 0 32px;
  font-size: 16px;
}
```

- [ ] **Step 5: Remove `.contact-content` from the mobile breakpoint grid override**

In `globals.css` line ~875 (the line you already touched in Task 1.3 step 5):

```css
.hero-content, .contact-content { grid-template-columns: 1fr; gap: 40px; }
```

becomes simply:

```css
.hero-content { grid-template-columns: 1fr; gap: 40px; }
```

(Since `.hero-content` is no longer a grid either after phase 2 task 2.2, you could remove this whole line. Verify first that `.hero-content` is no longer using `grid-template-columns` — if not, delete the rule entirely.)

- [ ] **Step 6: Verify in browser**

Refresh. Scroll to Contact section. You should see: section header, then a single centered column with: "AI-Powered Assistant" heading, two paragraphs, a "Talk to my AI" button (clicking opens the floating panel — the button calls `toggleFloatChat`), and the three contact method cards (Email/LinkedIn/Resume) below.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(contact): remove inline chatbot, add 'Talk to my AI' CTA to floating panel"
```

### Task 3.2: Remove the inline chat state and helpers

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:202-321` (state, sendInline, submitForm, inlineScrollRef, autoscroll effect)
- Modify: `portifolio-website-azure-ai/app/page.tsx:410-415` (the inline-chat auto-scroll useEffect)

- [ ] **Step 1: Delete state**

In `page.tsx`, remove:
- Line 202: `const [messageInput, setMessageInput] = useState("");`
- Line 207: `const [isLoading, setIsLoading] = useState(false);`
- Lines 215-216 the `inlineScrollRef` declaration
- Lines 222-229 the `messages` / `setMessages` initial state

- [ ] **Step 2: Delete the inline send and submit handlers**

Remove `sendInline` (lines ~243-316) and `submitForm` (lines ~318-321).

- [ ] **Step 3: Delete the inline auto-scroll useEffect**

Remove lines 411-415 (the `useEffect(() => { if (inlineScrollRef.current) {…} }, [messages, isLoading])` block).

- [ ] **Step 4: Delete the now-unused `renderMessage` and `typingBubble` if not used by the floating chat**

Check: the floating chat's JSX renders messages inline (lines ~1812-1862) without calling `renderMessage` — it has its own inline render. So `renderMessage` is now orphaned. Same for `typingBubble` — it's referenced inside the floating chat at line ~1862 (`{floatLoading && typingBubble}`), so KEEP `typingBubble`. Delete only `renderMessage` (lines ~801-830).

- [ ] **Step 5: Verify**

Run `npm run build` (or `npm run dev` and watch the console). TypeScript / ESLint must compile without unused-variable errors. Open the contact section in the browser — "Talk to my AI" button opens the floating panel as before.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(chat): delete inline chat state, helpers, and renderMessage"
```

---

# Phase 4 — Color identity unification

**Why fourth:** Now that the section count is reduced and the chrome is simpler, the color-identity question becomes obvious — there are fewer competing surfaces. Commit to purple. Per-section accent becomes a tiny detail.

### Task 4.1: Remove per-section foreground re-skinning

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:823-870` (`.experience-section` and `.projects-section` overrides)

- [ ] **Step 1: Reduce the `.experience-section` overrides to a single accent dot**

In `globals.css`, replace the entire block at lines 823-856 with:

```css
/* Experience — single small blue accent on the timeline dot only */
.experience-section .timeline-dot {
  background: linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%);
  box-shadow: 0 0 16px rgba(59,130,246,0.55);
}
```

Everything else (timeline line color, content card bg, h3 color, date pill, section title gradient) reverts to the base purple defined earlier in the file.

- [ ] **Step 2: Reduce the `.projects-section` overrides to a small accent on featured card**

In `globals.css`, replace lines 858-870 with:

```css
/* Projects — keep base purple chrome; aurora hue lives on per-card --hue var */
```

Yes, just a comment. The per-card aurora colors live in the `--hue` inline style on each `.project-card`, which already varies per project. The section-level `::before` radial that tinted the whole section teal is gone. The section title's teal gradient is gone — it reverts to the base fuchsia gradient.

- [ ] **Step 3: Update project card chrome to purple**

The card border, badge, tags, github link, and hover state are currently teal (lines 514-600). Change to purple. In `globals.css`:

```css
.project-card {
  ...
  border: 1px solid rgba(45,212,191,0.20);  /* CHANGE */
  background: rgba(6,22,20,0.22);            /* CHANGE */
  ...
}
```

becomes:

```css
.project-card {
  ...
  border: 1px solid rgba(147,51,234,0.20);
  background: rgba(10,3,22,0.32);
  ...
}
```

`.project-card:hover` (line 547):

```css
.project-card:hover {
  transform: translateY(-6px);
  border-color: rgba(45,212,191,0.5);
  box-shadow: 0 26px 70px rgba(20,184,166,0.20), 0 0 0 1px rgba(20,184,166,0.10);
}
```

becomes:

```css
.project-card:hover {
  transform: translateY(-6px);
  border-color: rgba(168,85,247,0.45);
  box-shadow: 0 26px 70px rgba(147,51,234,0.20), 0 0 0 1px rgba(147,51,234,0.10);
}
```

`.project-index` color (line 558) — change `rgba(94,234,212,0.16)` to `rgba(168,85,247,0.18)`.

`.project-badge` (lines 577-583):
```css
color: #5eead4; background: rgba(20,184,166,0.18);
border: 1px solid rgba(45,212,191,0.3);
```
becomes:
```css
color: var(--purple-200); background: rgba(147,51,234,0.18);
border: 1px solid rgba(147,51,234,0.3);
```

`.project-tags span` (line 585):
```css
color: #5eead4; background: rgba(20,184,166,0.15);
```
becomes:
```css
color: var(--purple-200); background: rgba(147,51,234,0.15);
```

`.project-github` (line 594):
```css
color: #2dd4bf;
```
becomes:
```css
color: var(--purple-300);
```

`.project-github:hover` (line 600):
```css
color: #5eead4;
```
becomes:
```css
color: var(--purple-200);
```

- [ ] **Step 4: Disable per-section warp accent in `page.tsx` scroll observer**

In `page.tsx`, the section-warp useEffect (lines 716-765) calls `window.setSpaceAccent(accent)` to shift the canvas tint. We're not removing the canvas shift entirely (that's a nice subtle touch), BUT the foreground is now one color — so the canvas-only shift is the only signal. That's correct behavior; leave this useEffect AS IS.

- [ ] **Step 5: Verify**

Refresh. Scroll: hero/about/experience/projects/contact all share the same purple glass tone. Timeline dots in Experience are blue (the only blue thing). Project cards are purple-tinted with multicolor auroras inside (the `--hue` per project is preserved, providing variety within a unified frame). Section titles in Experience and Projects use the same fuchsia gradient as the rest.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(color): unify identity around purple; accent dot only for Experience"
```

---

# Phase 5 — Motion strip

**Why fifth:** With layout settled, prune ambient animations.

### Task 5.1: Remove hero ambient aura and orphan keyframes

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:185-203` (`.hero-text::before`, `@keyframes hero-aura`)

- [ ] **Step 1: Delete `.hero-text::before` and `@keyframes hero-aura`**

In `globals.css`, remove lines 185-203 (the `.hero-text` position rule that wraps the ::before, the `::before` itself, and `@keyframes hero-aura`).

Replace with just:

```css
.hero-text { position: relative; }
```

(`position: relative` is preserved because `.hero-letter` spans use it as their containing context — keep it.)

- [ ] **Step 2: Verify**

Refresh. Hero text area no longer has the soft radial purple glow drifting behind it. The space engine alone provides ambient color.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "remove(motion): drop hero ambient aura"
```

### Task 5.2: Remove social-icon float and hover lift

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:267-274` (`.hero-social a:nth-child(N)` rules + `@keyframes social-float`)

- [ ] **Step 1: Delete the three nth-child animation rules and the keyframe**

In `globals.css`, remove lines 268-274:

```css
.hero-social a:nth-child(1) { animation: social-float 5.0s ease-in-out 0.0s infinite; }
.hero-social a:nth-child(2) { animation: social-float 5.0s ease-in-out 0.4s infinite; }
.hero-social a:nth-child(3) { animation: social-float 5.0s ease-in-out 0.8s infinite; }
@keyframes social-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}
```

The hover transform-translateY(-5px) on `.hero-social a:hover` (line 264) stays — that's an interaction response, not ambient motion.

- [ ] **Step 2: Verify**

Refresh. Social icons sit still at rest. Hovering one lifts it by 5px as before.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "remove(motion): drop ambient social-icon float"
```

### Task 5.3: Project aurora drift becomes hover-only

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:524-552` (`.project-card::before`, `@keyframes aurora-drift`, hover speedup)

- [ ] **Step 1: Replace the rules**

In `globals.css`, change:

```css
.project-card::before {
  content: '';
  position: absolute; inset: -35%;
  z-index: 0; pointer-events: none;
  background:
    radial-gradient(46% 52% at 22% 22%, hsla(var(--hue,170), 90%, 64%, 0.50), transparent 70%),
    radial-gradient(50% 56% at 82% 80%, hsla(calc(var(--hue,170) + 32), 92%, 66%, 0.38), transparent 72%);
  filter: blur(20px);
  animation: aurora-drift 19s ease-in-out infinite alternate;
}
```

to:

```css
.project-card::before {
  content: '';
  position: absolute; inset: -35%;
  z-index: 0; pointer-events: none;
  background:
    radial-gradient(46% 52% at 22% 22%, hsla(var(--hue,170), 90%, 64%, 0.50), transparent 70%),
    radial-gradient(50% 56% at 82% 80%, hsla(calc(var(--hue,170) + 32), 92%, 66%, 0.38), transparent 72%);
  filter: blur(20px);
  /* aurora is static at rest; only drifts on hover */
}

.project-card:hover::before {
  animation: aurora-drift 12s ease-in-out infinite alternate;
}
```

Remove the standalone `.project-card:hover::before { animation-duration: 9s; }` override at line 552 (now redundant).

- [ ] **Step 2: Verify**

Refresh. Hover a project card — its aurora starts drifting. Mouse off — aurora freezes. No card should have moving auroras at rest.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "tune(motion): aurora drift on hover only (static at rest)"
```

### Task 5.4: Magnetic buttons → scope to floating chat button only

**Why:** Magnetic on every CTA is too cute. Reserve for the persistent floating chat button (which has the strongest "I'm a thing you can touch" affordance) and remove from inline CTAs.

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:646-691` (the magnetic useEffect)
- Modify: `portifolio-website-azure-ai/app/page.tsx:992-1018` (remove "magnetic" className from hero CTAs)
- Modify: `portifolio-website-azure-ai/app/page.tsx` (the new contact-cta button in phase 3 — remove "magnetic")

- [ ] **Step 1: Remove the `magnetic` class from hero CTAs**

In `page.tsx`, find the two hero CTA `<a>` tags (lines ~992 and ~1004). Change `className="button primary magnetic"` to `className="button primary"` and `className="button secondary magnetic"` to `className="button secondary"`.

- [ ] **Step 2: Remove `magnetic` from the new contact-cta button**

In the contact CTA you added in Task 3.1 Step 2, change `className="button primary magnetic contact-cta"` to `className="button primary contact-cta"`.

- [ ] **Step 3: Add the `magnetic` class to the floating chat button**

In `page.tsx` line ~1761, the floating chat button currently has no `className`. Add it:

```tsx
<button
  id="float-chat-btn"
  className="magnetic"
  aria-label="Open AI Chat"
  onClick={toggleFloatChat}
>
```

- [ ] **Step 4: Verify**

Refresh. Hover over the hero "Get In Touch" / "Download CV" buttons — they no longer tilt toward the cursor. Hover over the floating chat bubble (bottom-right) — it still tracks the cursor.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "tune(motion): scope magnetic effect to floating chat button only"
```

### Task 5.5: Slow down section warp cooldown

**Why:** 900ms cooldown means rapid warps during scroll. Stretch to 2500ms so the canvas surges once per real section landing, not continually.

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:751-754`

- [ ] **Step 1: Update the cooldown**

In the section-warp useEffect (line 751), change:

```ts
if (now - lastWarp > 900) {
```

to:

```ts
if (now - lastWarp > 2500) {
```

- [ ] **Step 2: Verify**

Refresh. Scroll quickly through About → Experience → Projects → Contact. The starfield should surge once per arrival, not flicker.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "tune(motion): stretch section-warp cooldown 900ms→2500ms"
```

### Task 5.6: Remove the unused `.wave` keyframe and class

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:164-167`

- [ ] **Step 1: Delete the unused declarations**

In `globals.css`, remove lines 164-167:

```css
.hero-greeting { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.wave { font-size: 32px; animation: wave 2s ease-in-out infinite; display: inline-block; }
@keyframes wave { 0%,100%{transform:rotate(0)} 25%{transform:rotate(20deg)} 75%{transform:rotate(-20deg)} }
.intro-text { font-size: 18px; color: var(--gray-400); font-weight: 500; }
```

None of these classes are present in the JSX. Confirmed orphaned.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "remove(css): drop orphaned .wave, .hero-greeting, .intro-text"
```

---

# Phase 6 — Projects bento layout

**Why sixth:** Now that color and motion are unified, the bento can shine without competing with everything else.

### Task 6.1: Define a real bento grid layout

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:57-107` (PROJECTS data — add tile size hints)
- Modify: `portifolio-website-azure-ai/app/page.tsx:1481-1521` (`.projects-grid` map)
- Modify: `portifolio-website-azure-ai/app/globals.css:502-600` (`.projects-grid`, `.project-card.*`)

**Target layout (desktop, 4-column grid):**

```
+--------+--------+--------+--------+
|                 |                 |
|   Companion     |     Wathifa     |
|    (2×2)        |     (2×1)       |
|                 |                 |
|                 +--------+--------+
|                 | Resume | Movie  |
|                 | Anlz   | RAG    |
+--------+--------+--------+--------+
| Sleepy | Anime  | Image Captioning|
| Clock  |  Char  |    (2×1 wide)   |
+--------+--------+--------+--------+
```

- [ ] **Step 1: Add `size` field to the PROJECTS data**

In `page.tsx`, change the `Project` type:

```ts
type Project = {
  title: string;
  tags: string[];
  desc: string;
  href?: string;
  featured?: boolean;
  wide?: boolean;
  badge?: string;
  hue: number;
};
```

to:

```ts
type Project = {
  title: string;
  tags: string[];
  desc: string;
  href?: string;
  size: "lg" | "wide" | "sm";   // lg = 2x2 hero, wide = 2x1 banner, sm = 1x1
  badge?: string;
  hue: number;
};
```

Then update each entry. The current PROJECTS array becomes:

```ts
const PROJECTS: Project[] = [
  {
    title: "Companion — Agentic AI Desktop Controller",
    tags: ["Agentic AI", "MCP", "OpenRouter", "Python"],
    desc: "AI agent application built on the Model Context Protocol (MCP). Lets AI agents control the browser, access the local file system, manage Gmail, and execute multi-application workflows. Supports any LLM via OpenRouter integration. Currently in active development at BlackCode.",
    size: "lg",
    badge: "Ongoing",
    hue: 168,
  },
  {
    title: "Wathifa — Job Matching Platform",
    tags: ["Full-Stack", "Stripe API", "AWS"],
    desc: "Comprehensive job-matching platform connecting international job seekers with MENA region employers. Features automated readiness scoring (65% threshold), one-way messaging, an employer dashboard with advanced filtering, secure Stripe payment processing, and AWS cloud storage for resume management.",
    size: "wide",
    hue: 280,
  },
  {
    title: "AI-Powered Resume Analyzer",
    tags: ["Flask", "OpenAI", "Python"],
    desc: "Analyzes resumes against job descriptions using OpenAI GPT-3.5-turbo. Extracts text from PDFs/TXT, calculates match percentages, identifies missing keywords, suggests improvements.",
    href: "https://github.com/AhmedDlshad007/AI-Resume-Analyzer",
    size: "sm",
    hue: 190,
  },
  {
    title: "Movie Research Assistant (RAG)",
    tags: ["Python", "Tkinter", "RAG"],
    desc: "Retrieval Augmented Generation agent that integrates TMDb, OMDb, and YouTube APIs to research movies and TV shows — ratings, release dates, trailers.",
    href: "https://github.com/AhmedDlshad007/rag_agent_project.git",
    size: "sm",
    hue: 220,
  },
  {
    title: "SleepyClock",
    tags: ["HTML5", "CSS3", "JavaScript"],
    desc: "Sleep cycle calculator — smart sleep math, fully responsive, dark/light toggle, mobile-first. Pure vanilla JavaScript.",
    href: "https://github.com/AhmedDlshad007/SleepyClock",
    size: "sm",
    hue: 196,
  },
  {
    title: "Anime Character Generator",
    tags: ["Next.js", "Stable Diffusion"],
    desc: "Generates anime characters from prompts using Stable Diffusion XL via Replicate API. Next.js + Tailwind.",
    href: "https://github.com/AhmedDlshad007/Anime-Character-Generator.git",
    size: "sm",
    hue: 262,
  },
  {
    title: "AI Image Captioning & Tagging Tool",
    tags: ["React", "TypeScript", "Hugging Face"],
    desc: "Automatic image captions and tags using Hugging Face's BLIP for real-time captioning and ResNet-50 for tagging. React + Vite, drag-and-drop UI.",
    href: "https://github.com/AhmedDlshad007/AI-Image-Captioning",
    size: "wide",
    hue: 158,
  },
];
```

(Some descriptions tightened for the new card sizes.)

- [ ] **Step 2: Update the JSX map**

In `page.tsx` line ~1481, replace:

```tsx
<article
  key={p.title}
  className={`project-card reveal scale-in${
    p.featured ? " featured" : ""
  }${p.wide ? " wide" : ""}`}
  ...
>
```

with:

```tsx
<article
  key={p.title}
  className={`project-card reveal scale-in size-${p.size}`}
  style={{ transitionDelay: `${0.05 + i * 0.05}s`, "--hue": p.hue } as React.CSSProperties}
>
```

- [ ] **Step 3: Rewrite `.projects-grid` to a 4-col bento grid**

In `globals.css`, replace `.projects-grid` (line 504) with:

```css
.projects-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 220px;
  gap: 22px;
}

.project-card.size-lg   { grid-column: span 2; grid-row: span 2; }
.project-card.size-wide { grid-column: span 2; grid-row: span 1; }
.project-card.size-sm   { grid-column: span 1; grid-row: span 1; }
```

- [ ] **Step 4: Delete the old `.project-card.featured` and `.wide` rules**

In `globals.css`, remove the rules at lines 521 (`.project-card.featured { grid-column: 1 / -1; min-height: 300px; }`), 560 (`.project-card.featured .project-index { font-size: 120px; …}`), 567 (`.project-card.featured .project-content {…}`), 571-575 (`.project-card.featured::before {…}`), 591 (`.project-card.featured .project-content h3 {…}`), 593 (`.project-card.featured .project-content p {…}`), and the `.projects-section .project-card.featured` rule at line 866.

Then add size-aware content sizing:

```css
.project-card.size-lg .project-content { padding: 36px; }
.project-card.size-lg h3 { font-size: 28px; }
.project-card.size-lg p  { font-size: 16px; }
.project-card.size-lg .project-index { font-size: 96px; top: 8px; right: 24px; }
.project-card.size-lg::before {
  background:
    radial-gradient(40% 60% at 80% 70%, hsla(var(--hue,170), 92%, 66%, 0.50), transparent 72%),
    radial-gradient(40% 60% at 18% 22%, hsla(calc(var(--hue,170) + 30), 90%, 64%, 0.30), transparent 72%);
}

.project-card.size-wide .project-content { padding: 28px; }
.project-card.size-wide h3 { font-size: 22px; }
```

- [ ] **Step 5: Update mobile/tablet breakpoints**

In `globals.css` line ~879 (the 1024px breakpoint):

```css
.projects-grid { grid-template-columns: repeat(2, 1fr); }
.project-card.featured .project-content { max-width: 100%; padding: 36px; }
.project-card.featured .project-content h3 { font-size: 30px; }
.project-card.featured .project-index { font-size: 88px; }
```

becomes:

```css
.projects-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 200px; }
.project-card.size-lg   { grid-column: span 2; grid-row: span 2; }
.project-card.size-wide { grid-column: span 2; }
.project-card.size-sm   { grid-column: span 1; }
```

And mobile (line ~896):

```css
.projects-grid { grid-template-columns: 1fr; }
.project-card.featured { min-height: auto; }
.project-card.featured .project-content { max-width: 100%; padding: 26px; }
.project-card.featured .project-content h3 { font-size: 24px; }
.project-card.featured .project-index { font-size: 64px; }
```

becomes:

```css
.projects-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
.project-card.size-lg, .project-card.size-wide, .project-card.size-sm {
  grid-column: 1; grid-row: auto;
  min-height: 200px;
}
.project-card.size-lg { min-height: 280px; }
```

- [ ] **Step 6: Verify**

Refresh. At 1440px wide: 4-column bento, Companion takes top-left 2×2, Wathifa 2×1 top-right, two small cards under Wathifa, three small/wide cards on the bottom row. At 1024px: 2-column, Companion 2×2, then wides 2×1, then 1×1s. At 375px: single column.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(projects): real bento layout — varied tile sizes (lg/wide/sm)"
```

---

# Phase 7 — Typography upgrade

**Why seventh:** Cheapest cosmetic lift. The skill's portfolio recommendation: Archivo headings + Space Grotesk body. Wired via next/font (no CSS @import, lower CLS).

### Task 7.1: Install fonts via next/font

**Files:**
- Modify: `portifolio-website-azure-ai/app/layout.tsx`
- Modify: `portifolio-website-azure-ai/app/globals.css:42-49` (body font-family)

- [ ] **Step 1: Read the current layout.tsx**

```bash
cat portifolio-website-azure-ai/app/layout.tsx
```

(Reading first so the next edit knows what's already there.)

- [ ] **Step 2: Add font imports and apply to body**

Open `portifolio-website-azure-ai/app/layout.tsx` and add at the top:

```ts
import { Archivo, Space_Grotesk } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});
```

Then add the className to the root element. In the existing `<html>` or `<body>` tag, add:

```tsx
<body className={`${archivo.variable} ${spaceGrotesk.variable}`}>
```

(If the file structure differs, apply the className to whichever wrapper renders.)

- [ ] **Step 3: Update globals.css to use the new fonts**

In `globals.css` line 43:

```css
body {
  font-family: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  ...
}
```

becomes:

```css
body {
  font-family: var(--font-space), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  ...
}
```

And add (right after the body rule):

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-archivo), var(--font-space), -apple-system, sans-serif;
}
```

(Note: there's already a `h1,h2,…` rule at line 55 — append `font-family` to it instead of duplicating the selector.)

- [ ] **Step 4: Verify**

Refresh. Body text should now be Space Grotesk (slightly more geometric than Open Sans). Headings (hero title, section titles, About h3, timeline h3, project h3) should be Archivo (also geometric, tighter). Check no FOUT — `display: swap` plus next/font preload should handle it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(type): Archivo headings + Space Grotesk body via next/font"
```

---

# Phase 8 — Quality polish

### Task 8.1: Replace `<img>` with `next/image` for Open Graph / other static images

**Note:** The portrait image was deleted in Task 2.1. Verify no other `<img>` tags remain in `page.tsx`. If any do (e.g., for project screenshots added later), wrap them with `next/image` using `unoptimized: true` (already set in `next.config.js`).

- [ ] **Step 1: Grep for `<img`**

```bash
grep -n '<img' portifolio-website-azure-ai/app/page.tsx
```

Expected: 0 matches after Task 2.1.

- [ ] **Step 2: If any matches found, replace with `next/image`**

If matches exist:

```tsx
import Image from "next/image";
// then
<Image src="/path.png" alt="…" width={W} height={H} />
```

- [ ] **Step 3: Commit (only if changes made)**

```bash
git add -A
git commit -m "polish(images): use next/image for remaining static images"
```

### Task 8.2: Remove the fake notification badge

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:205,792-794,1765`
- Modify: `portifolio-website-azure-ai/app/globals.css:738-743`

- [ ] **Step 1: Delete the badge JSX**

In `page.tsx` line ~1765, remove `{badgeVisible && <div className="notif-badge">1</div>}` from the floating chat button.

- [ ] **Step 2: Delete the state**

In `page.tsx`:
- Line 205: remove `const [badgeVisible, setBadgeVisible] = useState(true);`
- Line 793: in `toggleFloatChat`, remove `if (next) setBadgeVisible(false);` — the function then simplifies:

```tsx
const toggleFloatChat = useCallback(() => {
  setFloatOpen((prev) => !prev);
}, []);
```

- [ ] **Step 3: Delete the CSS**

In `globals.css`, remove lines 738-743 (`#float-chat-btn .notif-badge { … }`).

- [ ] **Step 4: Verify**

Refresh. The floating chat button (bottom-right) no longer shows a red "1" badge.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "remove(chat): drop fake notification badge"
```

### Task 8.3: Make floating chat panel match the glass aesthetic

The floating panel currently uses `background: var(--dark-800)` (line 749) — solid gray. Make it glass like the rest of the site.

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css:746-755`

- [ ] **Step 1: Update `#float-chat-panel` background**

In `globals.css` line 749:

```css
background: var(--dark-800); border: 1px solid rgba(147,51,234,0.3);
```

becomes:

```css
background: rgba(3,0,10,0.62);
backdrop-filter: blur(22px) saturate(130%);
border: 1px solid rgba(147,51,234,0.22);
```

- [ ] **Step 2: Update the messages and input backgrounds**

`.float-chat-messages` (no rule sets bg explicitly — relies on panel) — confirm no change needed.

`.float-chat-input` (line 779): add transparency. Change:

```css
.float-chat-input {
  padding: 12px 16px; border-top: 1px solid rgba(147,51,234,0.2);
  display: flex; gap: 10px; flex-shrink: 0;
}
```

to (no functional change; this is fine as is — the parent panel's blur covers it):

```css
.float-chat-input {
  padding: 12px 16px;
  border-top: 1px solid rgba(147,51,234,0.2);
  background: transparent;
  display: flex; gap: 10px; flex-shrink: 0;
}
```

`.float-chat-input input` (line 783): swap solid background for glass:

```css
background: var(--dark-700);
```

becomes:

```css
background: rgba(255,255,255,0.04);
```

- [ ] **Step 3: Verify**

Open the floating chat. The panel should now feel like the rest of the site — translucent, with the starfield faintly visible through it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "polish(chat): unify floating panel with site glass aesthetic"
```

### Task 8.4: Add `cursor: pointer` to interactive cards

**Files:**
- Modify: `portifolio-website-azure-ai/app/globals.css` (multiple locations)

- [ ] **Step 1: Add to project cards (already clickable if `href` exists)**

In `.project-card` rule (line 509), add `cursor: pointer;` if any project has an `href`. Since some cards have a GitHub link rendered as a separate anchor, the card itself is not clickable — the link inside is. **Skip if cards are not whole-card-clickable.** Verify: in the current JSX, only `.project-github` is a link, not the whole card. So no change here.

- [ ] **Step 2: Add to `.stat-card` if it's hoverable but not clickable**

Stat cards have hover styles but no link. They're not clickable. **No `cursor: pointer` needed** — that'd be a lie. Skip.

- [ ] **Step 3: Add to `.contact-method`**

`.contact-method` is an `<a>` (line 607) — anchors get pointer by default. **No change needed.**

- [ ] **Step 4: Verify by clicking around**

Refresh. Cursor changes to pointer on links (anchors) and buttons. Cursor stays default on non-clickable cards (stats). No skipped interactives.

- [ ] **Step 5 (no commit needed if no edits were made)**

If after audit no changes were applied, skip the commit.

### Task 8.5: Footer cleanup — remove emoji, tighten copy

**Files:**
- Modify: `portifolio-website-azure-ai/app/page.tsx:1751-1754` (footer-bottom)

- [ ] **Step 1: Replace the emoji line**

In `page.tsx` line ~1753:

```tsx
<p>Built with Next.js &amp; ❤️</p>
```

becomes:

```tsx
<p>Designed and built in Kuala Lumpur · Next.js</p>
```

(Replace "Kuala Lumpur" with Ahmed's actual current city if different — he's working remote-from-Iraq per his timeline; pick the truthful location.)

- [ ] **Step 2: Verify**

Scroll to footer. No emoji. The signature line reads as a brief sentence.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "polish(footer): drop emoji, replace with a brief signature line"
```

### Task 8.6: Audit focus states

Existing `:focus-visible` rule at globals.css line 59 covers everything via a single global selector. Verify it works on:
- All `<a>` links
- All `<button>` elements
- The chat `<input>`

- [ ] **Step 1: Tab through the site**

Refresh. Tab from URL bar into the page. Each interactive element should get a purple outline (2px solid var(--purple-300)) with 2px offset.

- [ ] **Step 2: If any element loses focus visibility**

Find the offending selector and add an explicit `&:focus-visible { outline: 2px solid var(--purple-300); outline-offset: 2px; }` rule. The most likely offender is the floating chat close button (`.float-chat-close`) which has an inherited `border: none`. Verify visually.

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add -A
git commit -m "a11y(focus): ensure visible focus state on all interactives"
```

---

# Phase 9 — Repo hygiene

### Task 9.1: Delete the legacy CSS file

**Files:**
- Delete: `portifolio-website-azure-ai/app/globals-old.css`

- [ ] **Step 1: Verify nothing imports it**

```bash
grep -rn "globals-old" portifolio-website-azure-ai/
```

Expected: 0 matches.

- [ ] **Step 2: Delete**

```bash
rm portifolio-website-azure-ai/app/globals-old.css
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "remove(css): delete unused globals-old.css"
```

### Task 9.2: Delete tar.gz design files

- [ ] **Step 1: Verify nothing references them**

```bash
grep -rn "design-file" portifolio-website-azure-ai/ docs/ 2>/dev/null
```

Expected: 0 matches.

- [ ] **Step 2: Delete and add to .gitignore**

```bash
rm design-file.tar.gz design-file-2.tar.gz
```

These are untracked files (per the initial git status), so just deleting suffices. Optional: add `*.tar.gz` to `.gitignore` to prevent future accidents.

- [ ] **Step 3: Commit gitignore update if added**

```bash
git add .gitignore
git commit -m "chore(repo): ignore tar.gz design artifacts"
```

### Task 9.3: Resolve the `portfolio/` directory

This directory is untracked. Inspect before deleting.

- [ ] **Step 1: Look at it**

```bash
ls portfolio/
```

- [ ] **Step 2: Decide**

If it's scratch work / a duplicate / experimental sketch: delete it (`rm -r portfolio/`).
If it's something Ahmed wants to keep but separate: add a one-line README explaining its purpose and add to `.gitignore`.

(This is a judgment call — defer to Ahmed.)

### Task 9.4: Confirm `app/api/route.ts` is removed

Per CLAUDE.md the unused `app/api/route.ts` was already deleted. Verify.

- [ ] **Step 1: Check**

```bash
ls portifolio-website-azure-ai/app/api/
```

Expected: only `chat/` directory. If `route.ts` is present at the api/ root, delete it:

```bash
rm portifolio-website-azure-ai/app/api/route.ts
```

---

# Phase 10 — Verification pass

### Task 10.1: Reduced-motion verification

- [ ] **Step 1: Enable reduced motion**

On Windows: Settings → Accessibility → Visual effects → toggle "Animation effects" off. Or DevTools → Rendering → "Emulate CSS prefers-reduced-motion" → "reduce".

- [ ] **Step 2: Hard-refresh and observe**

- Name should appear in place (no letter scatter)
- Subtitle should be fully visible (no typewriter)
- Description should be solid (no blur reveal)
- CTAs visible immediately
- Marquee — already deleted
- Aurora drift on hover — should not animate
- Section warp bursts — should not fire
- Space engine — should freeze after ~400ms (per the existing freezeTimer logic)

- [ ] **Step 3: If any animation runs**

Find the offending rule. Add to the global `@media (prefers-reduced-motion: reduce)` block at globals.css line 908. The existing global selector `*, *::before, *::after { animation-duration: 0.001ms !important; ... }` should catch most, but specific JS-driven animations (e.g. magnetic translate transforms) bypass CSS — guard those in JS.

### Task 10.2: Breakpoint verification

- [ ] **Step 1: Test at 375px, 768px, 1024px, 1440px, 1920px**

Use DevTools device mode. At each breakpoint:
- Hero title scales smoothly (no overflow)
- Bento projects grid reflows (1-col → 2-col → 4-col)
- About strip wraps tags onto multiple lines as needed
- Floating chat panel fits inside viewport on mobile (380px max - 32px margin)
- Nav becomes a hamburger at 768px

### Task 10.3: Lighthouse run

- [ ] **Step 1: Build and serve production bundle**

```bash
cd portifolio-website-azure-ai
npm run build
npm run start
```

- [ ] **Step 2: Run Lighthouse on http://localhost:3000**

DevTools → Lighthouse → Mobile + Performance + Accessibility + Best Practices + SEO → Analyze.

- [ ] **Step 3: Target scores**

- Performance: ≥85 (canvas-heavy pages rarely hit 95)
- Accessibility: ≥95
- Best Practices: ≥95
- SEO: ≥95

Investigate any score below those targets. Common offenders post-redesign should be already addressed (LCP via font-display swap + next/font, CLS via no late-loaded fonts, TBT via space engine being non-blocking).

### Task 10.4: Update CLAUDE.md

After everything ships, the `Architecture > Per-Section Color Tints` section in CLAUDE.md is no longer accurate (per Phase 4) and the `Architecture > Single Page Component` line count is outdated.

- [ ] **Step 1: Update the affected sections**

In `CLAUDE.md`, update:
- The "Single Page Component (page.tsx, ~1750 lines)" line — count the new line total
- The "Per-Section Color Tints (globals.css)" section — replace with "the site commits to a single purple identity; the only color shift is a blue timeline dot on Experience and the per-project aurora hue inside Projects"
- The "Known Half-Implemented Features" section — the marquee bullet is no longer relevant (deleted)
- Add a note under Chatbot: "Only the floating chat panel remains; the inline contact-section chatbot was removed in the Option A redesign"

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect Option A redesign"
```

---

# Self-review

**Spec coverage:** Every critique point from the original review maps to a task:

| Original review item | Phase / Task |
|---|---|
| Motion overload (14+ animations) | Phase 5 (entire) |
| Color identity confusion (3 palettes) | Phase 4 |
| Hero text+image dated layout | Phase 2 |
| Orbit rings + aura + glow too much | Phase 2.1, 5.1 |
| Tech marquee redundant | Phase 1.1 |
| Skills cards weak / templated | Phase 1.2, 1.3 |
| Two chatbots redundant | Phase 3 |
| About + Skills cramming | Phase 1.3 |
| Experience colors clash with identity | Phase 4.1 |
| Aurora "Bento" not actually bento | Phase 6 |
| No project images | Deferred per user (Phase TBD) |
| `.chat-messages` solid bg breaks glass | Phase 8.3 |
| Magnetic everywhere too cute | Phase 5.4 |
| Generic Open Sans font | Phase 7 |
| `❤️` in footer | Phase 8.5 |
| `<img>` no srcset | Phase 8.1 (moot after photo removal) |
| Fake notification badge "1" | Phase 8.2 |
| Section warp every 900ms | Phase 5.5 |
| `design-file*.tar.gz` clutter | Phase 9.2 |
| `globals-old.css` clutter | Phase 9.1 |
| `portfolio/` folder ambiguity | Phase 9.3 |

**Placeholders:** No "TBD" / "TODO" / "implement later". Every CSS change shows the exact rule, every JSX change shows the exact JSX. Two places defer to a judgment call (Task 8.5 city name; Task 9.3 portfolio/ folder) — both are flagged explicitly.

**Type consistency:** The `Project` type changes from `featured?/wide?` booleans to a `size: "lg" | "wide" | "sm"` union in Phase 6.1 step 1. All later references use the new field. CSS selectors `.project-card.size-lg/wide/sm` match.

**Naming consistency:** `CURRENT_STACK` (Task 1.3), `.about-stack` (Task 1.3), `.contact-cta` (Task 3.1) — all unique. No collisions with existing identifiers.

---

# Execution handoff

Two options:

**1. Subagent-Driven** — fresh subagent per task, review between tasks. Best for visual UI work because each phase produces an independently-reviewable diff. **Recommended.**

**2. Inline** — execute tasks one-by-one in this session with batch checkpoints between phases.

Pick one and I'll move to execution.
