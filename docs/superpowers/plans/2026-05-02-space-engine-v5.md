# Space Engine v5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite space-engine.js with performance optimizations and visual upgrades that make the space background grander, more physically accurate, and buttery smooth — while keeping the public API (`window.bootSpace`, `window.updateSpaceCfg`) identical so `page.tsx` needs zero changes.

**Architecture:** Single-file rewrite of `portifolio-website-azure-ai/public/space-engine.js`. The engine is a vanilla JS Canvas2D rendering loop called from a Next.js page component. All 8 improvements are applied incrementally: performance foundations first (delta-time, layer partitioning, color LUTs, offscreen rendering), then visual upgrades (scroll-driven 3D depth, simplex noise nebulae, spiral galaxies), then scale-up (1500+ stars). Each task produces a working engine that can be verified by opening `http://localhost:3000` in a browser.

**Tech Stack:** Vanilla JavaScript, Canvas 2D API, simplex noise (embedded, no npm dependency)

**Verification:** This project has no test suite. Every task is verified visually by running `npm run dev` in `portifolio-website-azure-ai/` and opening `http://localhost:3000`. The dev server should already be running.

**File:** `portifolio-website-azure-ai/public/space-engine.js` (complete rewrite, single file)

**API contract (must not change):**
```js
window.bootSpace({
  blobCount: 0, reactivity: 75, blurAmount: 50, opacity: 4,
  colorMode: "deep-space", scrollShift: true, rippleOnClick: true,
  gridLines: false, speed: 50, starCount: 550, showStreaks: true, warpEffect: true,
});
window.updateSpaceCfg({ starCount: 800 }); // partial updates
```

---

### Task 1: Delta-Time Foundation

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** The current engine increments `t += 0.00032 * spd` per frame — frame-rate dependent. On 144Hz monitors, everything runs 2.4x faster than on 60Hz. This must be fixed before any other work since all subsequent tasks depend on consistent timing.

- [ ] **Step 1: Add timestamp tracking and compute dt**

At the top of the file, after the existing globals (`let t = 0; let warpTimer = 0;`), replace with:

```js
let t = 0;
let warpTimer = 0;
let lastFrameTime = 0;
```

In `drawFrame()`, replace:
```js
function drawFrame() {
  requestAnimationFrame(drawFrame);
  const spd = (cfg.speed || 50) / 50;
  t += 0.00032 * spd;
  warpTimer += spd;
  flashTimer += spd;
```

With:
```js
function drawFrame(timestamp) {
  requestAnimationFrame(drawFrame);
  if (!lastFrameTime) { lastFrameTime = timestamp; return; }
  const rawDt = (timestamp - lastFrameTime) / 1000; // seconds
  lastFrameTime = timestamp;
  const dt = Math.min(rawDt, 0.05); // cap at 50ms to prevent spiral on tab-refocus
  const spd = (cfg.speed || 50) / 50;
  t += dt * 0.02 * spd;  // normalized time accumulator
  warpTimer += dt * 60 * spd;  // convert to frame-equivalent units so thresholds still work
  flashTimer += dt * 60 * spd;
```

- [ ] **Step 2: Convert all frame-count-dependent logic to use dt**

In the shooting star update (layer 11), replace `s.life++` with `s.life += dt * 60` so it ticks at the same rate regardless of fps.

Replace `s.x += Math.cos(s.angle)*s.speed*spd` with `s.x += Math.cos(s.angle)*s.speed*spd*dt*60`.

In the mouse smoothing, replace `mouse.x += (targetMouse.x - mouse.x) * 0.06` with:
```js
const lerp = 1 - Math.pow(0.94, dt * 60);
mouse.x += (targetMouse.x - mouse.x) * lerp;
mouse.y += (targetMouse.y - mouse.y) * lerp;
```

In click burst physics, replace the fixed-step `p.vy+=0.03; p.vx*=0.97; p.vy*=0.97; p.alpha-=p.decay;` with:
```js
p.vy += 0.03 * dt * 60;
p.vx *= Math.pow(0.97, dt * 60);
p.vy *= Math.pow(0.97, dt * 60);
p.alpha -= p.decay * dt * 60;
```

In trail particle decay, replace `p.alpha -= p.decay` with `p.alpha -= p.decay * dt * 60`.

In flash decay, replace `f.alpha -= f.decay` with `f.alpha -= f.decay * dt * 60`.

In warp pulse expansion, replace `p.r += p.speed*W*0.006*spd` with `p.r += p.speed*W*0.006*spd*dt*60`.

- [ ] **Step 3: Update drawFrame call site**

In `bootSpace`, the initial call is just `drawFrame()`. Change to `requestAnimationFrame(drawFrame)` so the first call gets a valid timestamp:

```js
window.bootSpace = function(defaults) {
  cfg = { ...defaults };
  lastFrameTime = 0;
  resize();
  // ... rest of init unchanged ...
  requestAnimationFrame(drawFrame);
};
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000`. Stars should twinkle at the same perceived speed whether the browser is at 60Hz or 144Hz. Shooting stars should take the same real-time duration to cross the screen. Click bursts should decay at the same rate. Tab away for 5 seconds and tab back — the scene should NOT jump forward violently (the `dt` cap prevents this).

- [ ] **Step 5: Commit**

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): delta-time animation for frame-rate independence"
```

---

### Task 2: Star Layer Partitioning

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** `drawStars()` is called 3 times (layers 0, 1, 2). Each call iterates ALL 550+ stars and skips 2/3 of them. Partitioning into separate arrays eliminates 66% of wasted iteration.

- [ ] **Step 1: Replace single `stars` array with three layer arrays**

Replace:
```js
let stars = [];
```

With:
```js
let starsL0 = []; // background — small, slow parallax
let starsL1 = []; // midground
let starsL2 = []; // foreground — large, fast parallax
```

- [ ] **Step 2: Update `initStars` to partition during creation**

Replace the entire `initStars` function:

```js
function initStars(n) {
  const all = Array.from({ length: n }, () => {
    const spec = pickSpectral();
    const layer = Math.floor(Math.random() * 3);
    const brightness = spec.minAlpha + Math.random() * (1 - spec.minAlpha);
    const s = {
      x: Math.random(), y: Math.random(),
      baseX: 0, baseY: 0,
      r: layer === 0 ? 0.3 + Math.random() * 1.0
       : layer === 1 ? 0.5 + Math.random() * 1.6
       : 0.8 + Math.random() * 2.4,
      baseAlpha: brightness,
      twinkleSpeed: 0.4 + Math.random() * 3.0,
      twinklePhase: Math.random() * Math.PI * 2,
      color: spec.color,
      parallax: 0,
      layer,
      scintillation: 0,
    };
    s.parallax = layer === 0 ? 0.005 + Math.random() * 0.015
               : layer === 1 ? 0.025 + Math.random() * 0.045
               : 0.06 + Math.random() * 0.09;
    s.baseX = s.x;
    s.baseY = s.y;
    s.scintillation = 0.5 + s.y * 1.5;
    return s;
  });
  starsL0 = all.filter(s => s.layer === 0);
  starsL1 = all.filter(s => s.layer === 1);
  starsL2 = all.filter(s => s.layer === 2);
}
```

- [ ] **Step 3: Update `drawStars` to accept an array directly**

Replace:
```js
function drawStars(layer, alphaMult) {
  const str = (cfg.reactivity || 75) / 100;
  stars.forEach(s => {
    if (s.layer !== layer) return;
```

With:
```js
function drawStars(layerStars, alphaMult) {
  const str = (cfg.reactivity || 75) / 100;
  layerStars.forEach(s => {
```

Remove the `if (s.layer !== layer) return;` line — it's no longer needed.

- [ ] **Step 4: Update the 3 call sites in drawFrame**

Replace:
```js
drawStars(0, 0.55);  // Layer 4
drawStars(1, 0.85);  // Layer 8
drawStars(2, 1.0);   // Layer 14
```

With:
```js
drawStars(starsL0, 0.55);  // Layer 4
drawStars(starsL1, 0.85);  // Layer 8
drawStars(starsL2, 1.0);   // Layer 14
```

- [ ] **Step 5: Verify in browser and commit**

Open `http://localhost:3000`. The scene should look identical — same star distribution, same parallax behavior, same diffraction spikes. This is a pure refactor with no visual change.

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "perf(space-engine): partition stars into per-layer arrays"
```

---

### Task 3: Color String Pre-Computation

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** Every star builds `rgba(R,G,B,${alpha.toFixed(3)})` per frame — thousands of string allocations + `.toFixed()` calls. A lookup table of 256 pre-built strings per spectral type eliminates all runtime string work for stars.

- [ ] **Step 1: Build alpha lookup tables for each spectral type**

After the `SPECTRAL` array definition, add:

```js
const ALPHA_STEPS = 256;
const SPECTRAL_LUT = SPECTRAL.map(spec => {
  const base = spec.color; // e.g. 'rgba(155,175,255,'
  return Array.from({ length: ALPHA_STEPS }, (_, i) => {
    const a = i / (ALPHA_STEPS - 1);
    return base + a.toFixed(3) + ')';
  });
});
```

Add a helper:
```js
function colorAtAlpha(specIndex, alpha) {
  const idx = Math.min(ALPHA_STEPS - 1, Math.max(0, (alpha * (ALPHA_STEPS - 1)) | 0));
  return SPECTRAL_LUT[specIndex][idx];
}
```

- [ ] **Step 2: Store spectral index on each star instead of color string prefix**

In `initStars`, after `const spec = pickSpectral()`, compute the index:

```js
const specIdx = SPECTRAL.indexOf(spec);
```

Replace `color: spec.color` in the star object with `specIdx`.

- [ ] **Step 3: Update drawStars to use the LUT**

In `drawStars`, replace all instances of:
```js
`${s.color}${(someAlpha).toFixed(3)})`
```

With:
```js
colorAtAlpha(s.specIdx, someAlpha)
```

Specifically:
- Star body: `ctx.fillStyle = colorAtAlpha(s.specIdx, a);`
- Glow halo: `g.addColorStop(0, colorAtAlpha(s.specIdx, a * 0.35));` and `g.addColorStop(1, colorAtAlpha(s.specIdx, 0));`
- Spike stroke: `ctx.strokeStyle = colorAtAlpha(s.specIdx, spikeA);` and the fainter diagonal `ctx.strokeStyle = colorAtAlpha(s.specIdx, spikeA * 0.4);`

- [ ] **Step 4: Build palette LUT for burst particles and other elements**

After the PALETTES definition, add:

```js
function buildPalLUT(pal) {
  return pal.map(c => {
    return Array.from({ length: ALPHA_STEPS }, (_, i) => {
      const a = i / (ALPHA_STEPS - 1);
      return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
    });
  });
}
const PAL_LUTS = {};
for (const key in PALETTES) PAL_LUTS[key] = buildPalLUT(PALETTES[key]);

function palColorAtAlpha(colorIdx, alpha) {
  const pal = PAL_LUTS[cfg.colorMode] || PAL_LUTS['deep-space'];
  const ci = colorIdx % pal.length;
  const idx = Math.min(ALPHA_STEPS - 1, Math.max(0, (alpha * (ALPHA_STEPS - 1)) | 0));
  return pal[ci][idx];
}
```

Update burst particle rendering, nebula wisps, cluster stars, and deep field to use `palColorAtAlpha` or direct LUT indexing instead of template-literal color strings.

- [ ] **Step 5: Verify in browser and commit**

Scene should look pixel-identical. Open DevTools → Performance tab → record 5 seconds of animation. GC pauses should be noticeably reduced compared to before. Star rendering time per frame should drop.

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "perf(space-engine): pre-computed color LUTs eliminate per-frame string allocation"
```

---

### Task 4: Offscreen Canvas Pre-Rendering

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** The engine uses `ctx.filter = 'blur(Xpx)'` inline 4 times per frame (wisps, blobs, dust lanes, cursor glow). Each one stalls the GPU pipeline. Pre-rendering blurred layers to offscreen canvases at lower resolution eliminates all runtime blur passes.

- [ ] **Step 1: Create offscreen canvas infrastructure**

After the `let cfg = {};` line, add:

```js
let nebulaCanvas, nebulaCtx;  // blobs + wisps at 1/4 res
let dustCanvas, dustCtx;       // dust lanes at 1/4 res
let nebulaFrameCounter = 0;
const NEBULA_UPDATE_INTERVAL = 4; // re-render every 4th frame

function createOffscreenCanvases() {
  nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = Math.ceil(W / 4);
  nebulaCanvas.height = Math.ceil(H / 4);
  nebulaCtx = nebulaCanvas.getContext('2d');

  dustCanvas = document.createElement('canvas');
  dustCanvas.width = Math.ceil(W / 4);
  dustCanvas.height = Math.ceil(H / 4);
  dustCtx = dustCanvas.getContext('2d');
}
```

- [ ] **Step 2: Add offscreen canvas creation to resize**

In `resize()`, after setting `W` and `H`, add `createOffscreenCanvases();`.

- [ ] **Step 3: Move nebula blob + wisp rendering to offscreen canvas**

Create a new function `renderNebulaOffscreen()` that draws blobs and wisps to `nebulaCanvas` at 1/4 resolution. The blur is baked in at render time (applied once), not per-frame:

```js
function renderNebulaOffscreen() {
  const sw = nebulaCanvas.width, sh = nebulaCanvas.height;
  const scale = 0.25;
  nebulaCtx.clearRect(0, 0, sw, sh);
  const pal = PALETTES[cfg.colorMode] || PALETTES['deep-space'];
  const str = (cfg.reactivity || 75) / 100;
  const opBase = (cfg.opacity || 4) / 100;
  const scrollP = Math.min(1, scroll / Math.max(1, document.body.scrollHeight - H));

  // Blobs
  if (blobs.length > 0) {
    nebulaCtx.save();
    nebulaCtx.filter = `blur(${(cfg.blurAmount || 50) * scale}px)`;
    blobs.forEach((b, i) => {
      const col = pal[b.colorIdx % pal.length];
      const col2 = pal[b.colorIdx2 % pal.length];
      const dx = Math.sin(t * b.driftSpeedX * Math.PI*2 + b.phaseX) * b.driftAmpX;
      const dy = Math.cos(t * b.driftSpeedY * Math.PI*2 + b.phaseY) * b.driftAmpY;
      const mpx = (mouse.x-0.5) * b.parallax * str;
      const mpy = (mouse.y-0.5) * b.parallax * str;
      const so = cfg.scrollShift ? scrollP * (0.04+i*0.02) * -1 : 0;
      const nx = Math.max(0.05, Math.min(0.95, b.bx+dx+mpx));
      const ny = Math.max(0.05, Math.min(0.95, b.by+dy+mpy+so));
      b.cx += (nx-b.cx)*0.03; b.cy += (ny-b.cy)*0.03;
      const cx = b.cx*sw/scale*scale, cy = b.cy*sh/scale*scale;
      const r = b.radiusFrac*Math.max(sw,sh)/scale*scale;
      const pulse = 0.82+0.18*Math.sin(t*1.2+b.phaseX);
      const a = opBase * pulse;
      const g = nebulaCtx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,            `rgba(${col.r},${col.g},${col.b},${a})`);
      g.addColorStop(b.innerRatio, `rgba(${col2.r},${col2.g},${col2.b},${a*0.45})`);
      g.addColorStop(0.7,          `rgba(${col.r},${col.g},${col.b},${a*0.08})`);
      g.addColorStop(1,            `rgba(${col.r},${col.g},${col.b},0)`);
      nebulaCtx.beginPath(); nebulaCtx.arc(cx,cy,r,0,Math.PI*2);
      nebulaCtx.fillStyle=g; nebulaCtx.fill();
    });
    nebulaCtx.restore();
  }

  // Wisps
  nebulaCtx.save();
  nebulaCtx.globalCompositeOperation = 'screen';
  nebulaCtx.filter = `blur(${8 * scale}px)`;
  wisps.forEach(w => {
    const wx = (w.x + (mouse.x-0.5)*w.parallax*str + Math.sin(t*0.4+w.drift)*0.01) * sw / scale;
    const wy = (w.y + (mouse.y-0.5)*w.parallax*str + Math.cos(t*0.3+w.drift)*0.008) * sh / scale;
    const len = w.len * Math.max(sw,sh) / scale;
    const ex = wx + Math.cos(w.angle) * len;
    const ey = wy + Math.sin(w.angle) * len;
    const ci = Math.floor(w.colorShift * pal.length) % pal.length;
    const c = pal[ci];
    const g = nebulaCtx.createLinearGradient(wx*scale,wy*scale,ex*scale,ey*scale);
    g.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},0)`);
    g.addColorStop(0.3, `rgba(${c.r},${c.g},${c.b},${w.alpha})`);
    g.addColorStop(0.7, `rgba(${c.r},${c.g},${c.b},${w.alpha*0.6})`);
    g.addColorStop(1,   `rgba(${c.r},${c.g},${c.b},0)`);
    nebulaCtx.strokeStyle = g;
    nebulaCtx.lineWidth = w.width * Math.max(sw,sh) / scale * scale;
    nebulaCtx.lineCap = 'round';
    nebulaCtx.beginPath();
    nebulaCtx.moveTo(wx*scale,wy*scale);
    nebulaCtx.lineTo(ex*scale,ey*scale);
    nebulaCtx.stroke();
  });
  nebulaCtx.restore();
}
```

- [ ] **Step 4: Similarly move dust lanes to offscreen canvas**

Create `renderDustOffscreen()` following the same pattern — renders to `dustCanvas` at 1/4 res with the blur baked in.

- [ ] **Step 5: Replace inline layers 5, 6, 9 in drawFrame with drawImage composites**

In `drawFrame`, replace the nebula blob block (layer 6), wisp block (layer 5), and dust lane block (layer 9) with:

```js
/* ═══ LAYERS 5+6: Nebula (offscreen, updated every 4th frame) ═══ */
nebulaFrameCounter++;
if (nebulaFrameCounter >= NEBULA_UPDATE_INTERVAL) {
  renderNebulaOffscreen();
  nebulaFrameCounter = 0;
}
ctx.save();
ctx.globalCompositeOperation = 'screen';
ctx.drawImage(nebulaCanvas, 0, 0, W, H);
ctx.restore();

/* ═══ LAYER 9: Dust lanes (offscreen) ═══ */
// Dust only updates every 4th frame too (they drift slowly)
if (nebulaFrameCounter === 0) renderDustOffscreen();
ctx.save();
ctx.globalCompositeOperation = 'screen';
ctx.drawImage(dustCanvas, 0, 0, W, H);
ctx.restore();
```

- [ ] **Step 6: Replace cursor glow blur with a pre-rendered soft circle**

Create a small offscreen canvas at boot time containing a pre-blurred radial gradient circle. In `drawFrame`, just `drawImage` it at the cursor position:

```js
let cursorGlowCanvas;
function createCursorGlow() {
  const size = 256;
  cursorGlowCanvas = document.createElement('canvas');
  cursorGlowCanvas.width = cursorGlowCanvas.height = size;
  const c = cursorGlowCanvas.getContext('2d');
  const g = c.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  g.addColorStop(0,  'rgba(110,90,180,0.08)');
  g.addColorStop(0.5,'rgba(70,50,140,0.02)');
  g.addColorStop(1,  'rgba(50,35,110,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(size/2,size/2,size/2,0,Math.PI*2); c.fill();
}
```

Call `createCursorGlow()` in `bootSpace`. In `drawFrame`, replace the cursor glow block with:

```js
/* ═══ LAYER 13: Cursor glow (pre-rendered) ═══ */
{
  const glowSize = Math.max(W,H) * 0.16;
  const cx = mouse.x * W - glowSize/2;
  const cy = mouse.y * H - glowSize/2;
  ctx.save();
  ctx.globalAlpha = str;
  ctx.drawImage(cursorGlowCanvas, cx, cy, glowSize, glowSize);
  ctx.restore();
}
```

- [ ] **Step 7: Verify in browser and commit**

Scene should look visually identical (or very close — the 1/4 res offscreen may make nebulae slightly softer, which is fine). Open DevTools Performance tab — frame time should drop significantly. No more `filter: blur()` calls in the hot path.

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "perf(space-engine): offscreen canvas pre-rendering eliminates runtime blur passes"
```

---

### Task 5: Scroll-Driven 3D Depth Flight

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** Currently the canvas is a static viewport — scrolling barely affects the background. Adding a virtual Z-axis so scrolling moves the camera through the starfield creates a dramatic sense of flying through space.

- [ ] **Step 1: Add Z coordinate to star generation**

In `initStars`, add a `z` property to each star:

```js
z: layer === 0 ? 0.6 + Math.random() * 0.4   // far
 : layer === 1 ? 0.3 + Math.random() * 0.3   // mid
 : 0.05 + Math.random() * 0.25,              // near
```

Also add `baseZ: 0` which gets set to the same value after creation: `s.baseZ = s.z;`

- [ ] **Step 2: Modify drawStars to project from 3D using scroll-driven camera Z**

At the top of `drawStars`, compute the camera's Z offset from scroll:

```js
function drawStars(layerStars, alphaMult) {
  const str = (cfg.reactivity || 75) / 100;
  const scrollDepth = cfg.scrollShift ? scroll * 0.0003 : 0; // virtual camera Z movement

  layerStars.forEach(s => {
    // Z-depth with scroll
    let z = s.baseZ - scrollDepth;
    // Wrap stars that go behind the camera back to far distance
    while (z < 0.01) z += 1.0;
    while (z > 1.0) z -= 1.0;

    const perspective = 1.0 / z; // simple perspective division
    const screenX = 0.5 + (s.baseX - 0.5 + (mouse.x-0.5) * s.parallax * str) * perspective;
    const screenY = 0.5 + (s.baseY - 0.5 + (mouse.y-0.5) * s.parallax * str) * perspective;

    // Cull off-screen stars
    if (screenX < -0.1 || screenX > 1.1 || screenY < -0.1 || screenY > 1.1) return;

    const px = screenX * W;
    const py = screenY * H;
    const r = s.r * perspective * 0.5; // stars grow as they approach

    // Scintillation + twinkle (unchanged)
    const scintAmp = 0.15 + 0.35 * (s.scintillation / 2.0);
    const twinkle = (1 - scintAmp) + scintAmp * Math.sin(t * s.twinkleSpeed * Math.PI * 2 + s.twinklePhase);
    let a = s.baseAlpha * twinkle * alphaMult * Math.min(1, perspective * 0.3);
    if (a < 0.03) return;

    // ... rest of star rendering (glow, body, spikes) uses px, py, r, a as before ...
```

- [ ] **Step 3: Apply same depth treatment to clusters and galaxies**

Update the cluster rendering loop to offset `cl.cy` by `scrollDepth * cl.parallax * 10`. Galaxies should also drift slowly with scroll.

- [ ] **Step 4: Verify in browser**

Scroll up and down on the page. Foreground stars should visibly stream past as you scroll — like looking out the window of a spaceship. Background stars should barely move. Stars should wrap seamlessly (no popping). The effect should be subtle enough to not distract from reading content but dramatic enough to create a sense of depth.

- [ ] **Step 5: Commit**

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): scroll-driven 3D depth flight through starfield"
```

---

### Task 6: Simplex Noise for Organic Nebula Turbulence

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** Nebula blobs and wisps currently drift on sinusoidal paths, which look mechanical. Real nebulae have turbulent, fractal structure. A 2D simplex noise field creates organic, non-repeating motion.

- [ ] **Step 1: Embed a minimal 2D simplex noise implementation**

At the very top of the file (after the header comment), add a self-contained simplex noise function (~50 lines). Use the classic open-source implementation:

```js
const SimplexNoise = (() => {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const perm = new Uint8Array(512);
  
  // Seed permutation table
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  return function noise2D(x, y) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const tt = (i + j) * G2;
    const X0 = i - tt, Y0 = j - tt;
    const x0 = x - X0, y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 > 0) { t0 *= t0; const gi = grad[perm[ii + perm[jj]] % 8]; n0 = t0*t0*(gi[0]*x0+gi[1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 > 0) { t1 *= t1; const gi = grad[perm[ii+i1 + perm[jj+j1]] % 8]; n1 = t1*t1*(gi[0]*x1+gi[1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 > 0) { t2 *= t2; const gi = grad[perm[ii+1 + perm[jj+1]] % 8]; n2 = t2*t2*(gi[0]*x2+gi[1]*y2); }
    return 70 * (n0 + n1 + n2); // returns -1 to 1
  };
})();
```

- [ ] **Step 2: Replace sinusoidal blob drift with noise-driven drift**

In `renderNebulaOffscreen()` (or wherever blob position is computed), replace:

```js
const dx = Math.sin(t * b.driftSpeedX * Math.PI*2 + b.phaseX) * b.driftAmpX;
const dy = Math.cos(t * b.driftSpeedY * Math.PI*2 + b.phaseY) * b.driftAmpY;
```

With:

```js
const noiseScale = 0.8;
const dx = SimplexNoise(b.bx * noiseScale + t * b.driftSpeedX, b.by * noiseScale + b.phaseX) * b.driftAmpX;
const dy = SimplexNoise(b.by * noiseScale + t * b.driftSpeedY, b.bx * noiseScale + b.phaseY) * b.driftAmpY;
```

- [ ] **Step 3: Apply noise to wisp drift**

Replace the sinusoidal drift in wisp rendering with noise-sampled drift at a different scale/offset so wisps don't move in sync with blobs.

- [ ] **Step 4: Apply subtle noise distortion to dark nebulae positions**

In the dark nebulae rendering, add a noise-driven offset:
```js
const noiseDrift = SimplexNoise(dn.x * 2 + t * 0.1, dn.y * 2 + dn.drift) * 0.015;
```
This replaces the sinusoidal `Math.sin(t * 0.3 + dn.drift) * 0.01`.

- [ ] **Step 5: Verify in browser and commit**

Nebulae should now drift in organic, non-repeating patterns rather than predictable sinusoidal waves. The motion should look turbulent but gentle — like real gas clouds being pushed by cosmic currents.

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): simplex noise for organic nebula turbulence"
```

---

### Task 7: Spiral Galaxy Rendering

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** The 10 "distant galaxies" are currently featureless elliptical smudges. Rendering visible spiral arms on ~35% of them makes them read as galaxies rather than bokeh dots, adding universe-scale structure.

- [ ] **Step 1: Create a galaxy rendering function with spiral arms**

Add a new function after `initGalaxies`:

```js
function drawGalaxy(gx, gy, galaxy) {
  const str = (cfg.reactivity || 75) / 100;
  const px = (gx + (mouse.x-0.5) * galaxy.parallax * str) * W;
  const py = (gy + (mouse.y-0.5) * galaxy.parallax * str) * H;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(galaxy.angle + t * 0.008); // very slow rotation

  // Core glow
  const coreR = galaxy.r;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  g.addColorStop(0, `${galaxy.color}${(galaxy.alpha * 1.5).toFixed(3)})`);
  g.addColorStop(0.5, `${galaxy.color}${(galaxy.alpha * 0.5).toFixed(3)})`);
  g.addColorStop(1, `${galaxy.color}0)`);
  ctx.save();
  ctx.scale(1, galaxy.eccentricity);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Spiral arms (only for galaxies flagged with hasSpiralHint)
  if (galaxy.hasSpiralHint) {
    ctx.globalAlpha = galaxy.alpha * 2.5;
    ctx.strokeStyle = `${galaxy.color}${(galaxy.alpha * 0.8).toFixed(3)})`;
    ctx.lineWidth = 0.6;
    ctx.lineCap = 'round';

    for (let arm = 0; arm < 2; arm++) {
      ctx.beginPath();
      const baseAngle = galaxy.spiralAngle + arm * Math.PI;
      for (let s = 0; s < 40; s++) {
        const frac = s / 40;
        const theta = baseAngle + frac * Math.PI * 2.5; // 2.5 turns
        const radius = coreR * 0.2 + frac * coreR * 1.2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius * galaxy.eccentricity;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
```

- [ ] **Step 2: Replace the old galaxy rendering in drawFrame**

Currently galaxies are rendered inline as simple radial gradients. The old code should be replaced (or it may not even exist as a separate section if galaxies were handled elsewhere). In `drawFrame`, after the layer where galaxies belong (between clusters and dust lanes), add:

```js
/* ═══ Distant Galaxies ═══ */
galaxies.forEach(gal => drawGalaxy(gal.x, gal.y, gal));
```

If galaxies were previously just rendered as part of star clusters or deep field, move them to their own block using this function.

- [ ] **Step 3: Verify in browser and commit**

Look for the distant galaxies — some should now show faint spiral arm curves. They should be extremely subtle (low alpha) but visible on close inspection. The arms should rotate very slowly.

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): spiral galaxy rendering with visible arm structure"
```

---

### Task 8: Scale Up Star Count

**Files:**
- Modify: `portifolio-website-azure-ai/public/space-engine.js`

**Why:** With offscreen rendering and layer partitioning in place, the engine can handle far more stars without frame drops. Increasing from 550 to 1500 creates a much denser, richer star field. The deep field also increases from 900 to 1400.

- [ ] **Step 1: Update default star count in resize**

In `resize()`, change the fallback:

```js
initStars(cfg.starCount || 1500);
```

- [ ] **Step 2: Update deep field count**

In `initDeepField`, change:

```js
const N = 1400;
```

- [ ] **Step 3: Increase cluster density**

In `initClusters`, change the cluster count from 7 to 10, and the star range from `18 + Math.floor(Math.random() * 28)` to `25 + Math.floor(Math.random() * 35)`.

- [ ] **Step 4: Verify in browser**

The star field should be noticeably richer and denser. Frame rate should still be smooth (check DevTools Performance — target 60fps on mid-range hardware). If frame drops occur, reduce back to 1200 stars as a compromise.

- [ ] **Step 5: Commit**

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): scale up to 1500 stars + 1400 deep field with denser clusters"
```

---

### Task 9: Final Integration Verification

**Files:**
- No code changes — verification only

- [ ] **Step 1: Full visual regression check**

Open `http://localhost:3000` and verify all 17 layers render correctly:
1. Dark base with indigo center ambience
2. Deep field sub-pixel stars twinkling
3. Dark nebulae creating negative space
4. Background stars with slow parallax
5. Nebula wisps with organic noise-driven drift
6. Nebula blobs pulsing and drifting organically
7. Star clusters in dense pockets
8. Mid-layer stars
9. Cosmic dust lanes breathing
10. Warp ring pulses (if enabled)
11. Shooting stars streaking across
12. Mouse trail particles following cursor
13. Cursor glow following mouse
14. Foreground stars with fast parallax and diffraction spikes
15. Click burst particles on background click
16. Micro-event flashes (wait ~10s to see one)
17. Edge vignette darkening corners

- [ ] **Step 2: Interaction check**

- Move mouse slowly across the page — stars at different depths should shift at different rates
- Move mouse fast — trail particles should appear and streak slightly
- Click on the background — burst particles + ripple rings should appear
- Scroll down the page — foreground stars should visibly stream past, creating a sense of depth flight
- Scroll back up — stars should stream in the opposite direction

- [ ] **Step 3: Performance check**

Open DevTools → Performance → Record 10 seconds of scrolling + mouse movement. Frame time should be consistently under 16ms (60fps). No `filter: blur()` calls should appear in the flame chart.

- [ ] **Step 4: API contract check**

Open DevTools Console and run:
```js
window.updateSpaceCfg({ starCount: 800 });
```
Star count should visibly decrease. Run:
```js
window.updateSpaceCfg({ colorMode: 'blue-indigo' });
```
Nebula colors should shift to blue. Verify no errors in console.

- [ ] **Step 5: Final commit**

```bash
git add portifolio-website-azure-ai/public/space-engine.js
git commit -m "feat(space-engine): v5 complete — performance + visual upgrades"
```
