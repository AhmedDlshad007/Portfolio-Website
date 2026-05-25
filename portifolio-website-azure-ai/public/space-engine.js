/* ══════════════════════════════════════════════════════
   DEEP SPACE SIMULATION ENGINE v5
   ──────────────────────────────────────────────────────
   Rendering layers (back → front):
     1.  Near-black base + deep indigo radial
     2.  Deep field (1400 sub-pixel distant stars)
     3.  Dark nebulae (negative space blockers)
     4.  Background stars (layer 0) — small, slow parallax
     5.  Nebula gas wisps (offscreen, composited 'screen')
     6.  Nebula blobs (offscreen, composited 'screen')
     7.  Star clusters (dense pockets)
     8.  Spiral galaxies
     9.  Mid stars (layer 1)
    10.  Cosmic dust lanes (offscreen, composited 'screen')
    11.  Warp pulses
    12.  Shooting star streaks
    13.  Mouse trail particles
    14.  Cursor glow (pre-rendered offscreen)
    15.  Foreground stars (layer 2) — large, fast parallax
    16.  Click burst particles
    17.  Micro-event flashes
    18.  Edge vignette + top gradient
══════════════════════════════════════════════════════ */

const canvas = document.getElementById('bg-canvas');
if (!canvas) throw new Error('space-engine: #bg-canvas not found');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
let rafHandle = 0;
let cachedScrollHeight = 1;
let mouse = { x: 0.5, y: 0.5 };
let targetMouse = { x: 0.5, y: 0.5 };
let prevMouse = { x: 0.5, y: 0.5 };
let mouseVel = { x: 0, y: 0 };
let scroll = 0;
let cfg = {};
let lastFrameTime = 0;

/* ══════════════════════════════════════════════
   2D SIMPLEX NOISE (self-contained IIFE)
══════════════════════════════════════════════ */
const SimplexNoise = (function() {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const perm = new Uint8Array(512);
  const permMod8 = new Uint8Array(512);
  // Fisher-Yates shuffle
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod8[i] = perm[i] % 8;
  }
  return function noise2D(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const tt = (i + j) * G2;
    const x0 = xin - (i - tt);
    const y0 = yin - (j - tt);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi = permMod8[ii + perm[jj]];
      n0 = t0 * t0 * (grad[gi][0] * x0 + grad[gi][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi = permMod8[ii + i1 + perm[jj + j1]];
      n1 = t1 * t1 * (grad[gi][0] * x1 + grad[gi][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi = permMod8[ii + 1 + perm[jj + 1]];
      n2 = t2 * t2 * (grad[gi][0] * x2 + grad[gi][1] * y2);
    }
    return 70.0 * (n0 + n1 + n2);
  };
})();

/* ── Palettes — dark, desaturated ── */
const PALETTES = {
  'deep-space': [
    { r:55, g:18, b:130 }, { r:30, g:8,  b:80  },
    { r:75, g:35, b:170 }, { r:40, g:22, b:100 },
    { r:90, g:45, b:190 }, { r:22, g:6,  b:65  },
  ],
  'purple-fuchsia': [
    { r:90, g:30, b:170 }, { r:140, g:45, b:180 },
    { r:110, g:55, b:190 }, { r:70, g:25, b:140 },
    { r:60, g:18, b:120 }, { r:45, g:12, b:95  },
  ],
  'blue-indigo': [
    { r:22, g:40, b:130 }, { r:35, g:55, b:170 },
    { r:50, g:35, b:150 }, { r:18, g:28, b:95  },
    { r:30, g:50, b:190 }, { r:12, g:18, b:75  },
  ],
  'cold-void': [
    { r:12, g:22, b:55 }, { r:22, g:35, b:75  },
    { r:35, g:28, b:95 }, { r:8,  g:12, b:45  },
    { r:55, g:30, b:110 },{ r:6,  g:8,  b:35  },
  ],
  'teal': [
    { r:13, g:148, b:136 }, { r:20, g:184, b:166 },
    { r:15, g:118, b:110 }, { r:8,  g:80,  b:78  },
    { r:45, g:200, b:180 }, { r:6,  g:55,  b:55  },
  ],
};

/* ══════════════════════════════════════════════
   STAR SPECTRAL TYPES — realistic color temp
══════════════════════════════════════════════ */
const SPECTRAL = [
  { r:140, g:165, b:255, weight: 0.07, minAlpha: 0.82, sizeBonus: 0.55 }, // O/B blue supergiants — rare, brilliant
  { r:188, g:208, b:255, weight: 0.13, minAlpha: 0.60, sizeBonus: 0.22 }, // A blue-white
  { r:240, g:242, b:255, weight: 0.20, minAlpha: 0.28, sizeBonus: 0.00 }, // F neutral white
  { r:255, g:248, b:218, weight: 0.24, minAlpha: 0.18, sizeBonus: 0.00 }, // G warm white (sun-like)
  { r:255, g:210, b:142, weight: 0.21, minAlpha: 0.28, sizeBonus: 0.20 }, // K yellow-orange subgiants
  { r:255, g:158, b:82,  weight: 0.15, minAlpha: 0.50, sizeBonus: 0.45 }, // M red-orange giants — warm amber
];

/* ══════════════════════════════════════════════
   COLOR STRING PRE-COMPUTATION (LUT)
══════════════════════════════════════════════ */
const SPECTRAL_LUT = [];
const PAL_LUTS = {};
function buildLUT(r, g, b) {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    const a = (i / 255).toFixed(3);
    lut[i] = `rgba(${r},${g},${b},${a})`;
  }
  return lut;
}

function initSpectralLUT() {
  SPECTRAL_LUT.length = 0;
  for (let i = 0; i < SPECTRAL.length; i++) {
    SPECTRAL_LUT.push(buildLUT(SPECTRAL[i].r, SPECTRAL[i].g, SPECTRAL[i].b));
  }
}

function initPalLUT(palKey) {
  if (PAL_LUTS[palKey]) return;
  const pal = PALETTES[palKey];
  if (!pal) return;
  PAL_LUTS[palKey] = pal.map(c => buildLUT(c.r, c.g, c.b));
}

function colorAtAlpha(specIndex, alpha) {
  const idx = Math.max(0, Math.min(255, (alpha * 255 + 0.5) | 0));
  return SPECTRAL_LUT[specIndex][idx];
}

function palColorAtAlpha(colorIdx, alpha) {
  const palKey = cfg.colorMode || 'deep-space';
  const luts = PAL_LUTS[palKey];
  if (!luts) return `rgba(55,18,130,${alpha.toFixed(3)})`;
  const idx = Math.max(0, Math.min(255, (alpha * 255 + 0.5) | 0));
  return luts[colorIdx % luts.length][idx];
}

const DEEP_FIELD_LUT = buildLUT(220, 220, 240);
const CLUSTER_STAR_LUT = buildLUT(220, 215, 245);

function pickSpectralIndex() {
  let r = Math.random(), cum = 0;
  for (let i = 0; i < SPECTRAL.length; i++) { cum += SPECTRAL[i].weight; if (r <= cum) return i; }
  return 3;
}

/* ══════════════════════════════════════════════
   DEEP FIELD — sub-pixel infinity layer
══════════════════════════════════════════════ */
let deepField = [];
function initDeepField() {
  const N = cfg.deepFieldCount || 4000;
  deepField = Array.from({ length: N }, () => ({
    x: Math.random(), y: Math.random(),
    alpha: 0.06 + Math.random() * 0.2,
    r: 0.15 + Math.random() * 0.4,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.3 + Math.random() * 1.0,
  }));
}

/* ══════════════════════════════════════════════
   MAIN STARS — partitioned into 3 layers
══════════════════════════════════════════════ */
let starsL0 = [], starsL1 = [], starsL2 = [];
function initStars(n) {
  starsL0 = []; starsL1 = []; starsL2 = [];
  for (let i = 0; i < n; i++) {
    const specIdx = pickSpectralIndex();
    const spec = SPECTRAL[specIdx];
    const layer = Math.floor(Math.random() * 3);
    const brightness = spec.minAlpha + Math.random() * (1 - spec.minAlpha);
    const s = {
      x: Math.random(), y: Math.random(),
      baseX: 0, baseY: 0,
      r: (layer === 0 ? 0.3 + Math.random() * 0.7
       : layer === 1 ? 0.4 + Math.random() * 1.0
       : 0.5 + Math.random() * 1.4) + (spec.sizeBonus || 0),
      baseAlpha: brightness,
      twinkleSpeed: 0.4 + Math.random() * 3.0,
      twinklePhase: Math.random() * Math.PI * 2,
      specIdx: specIdx,
      parallax: 0,
      layer,
      scintillation: 0,
      z: 0, baseZ: 0,
    };
    s.parallax = layer === 0 ? 0.005 + Math.random() * 0.015
              : layer === 1 ? 0.025 + Math.random() * 0.045
              : 0.06 + Math.random() * 0.09;
    s.baseX = s.x;
    s.baseY = s.y;
    s.scintillation = 0.5 + s.y * 1.5;
    // Z depth per layer
    if (layer === 0) { s.z = 0.6 + Math.random() * 0.4; s.baseZ = s.z; }
    else if (layer === 1) { s.z = 0.3 + Math.random() * 0.3; s.baseZ = s.z; }
    else { s.z = 0.05 + Math.random() * 0.25; s.baseZ = s.z; }

    if (layer === 0) starsL0.push(s);
    else if (layer === 1) starsL1.push(s);
    else starsL2.push(s);
  }
}

/* ══════════════════════════════════════════════
   STAR CLUSTERS — dense pockets
══════════════════════════════════════════════ */
let clusters = [];
function initClusters() {
  clusters = Array.from({ length: 10 }, () => {
    const cx = 0.08 + Math.random() * 0.84;
    const cy = 0.08 + Math.random() * 0.84;
    const n = 25 + Math.floor(Math.random() * 35);
    const spread = 0.015 + Math.random() * 0.025;
    const clusterStars = Array.from({ length: n }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      return {
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        r: 0.2 + Math.random() * 0.7,
        alpha: 0.15 + Math.random() * 0.45,
        twinkle: Math.random() * Math.PI * 2,
      };
    });
    return { cx, cy, stars: clusterStars, parallax: 0.01 + Math.random() * 0.03, z: 0.4 + Math.random() * 0.4 };
  });
}

/* ══════════════════════════════════════════════
   DARK NEBULAE — negative space blockers
══════════════════════════════════════════════ */
let darkNebulae = [];
function initDarkNebulae() {
  darkNebulae = Array.from({ length: 5 }, () => ({
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.8,
    r: 0.06 + Math.random() * 0.14,
    alpha: 0.25 + Math.random() * 0.45,
    angle: Math.random() * Math.PI,
    stretch: 0.3 + Math.random() * 0.7,
    parallax: 0.004 + Math.random() * 0.01,
    drift: Math.random() * Math.PI * 2,
    noiseScale: 0.3 + Math.random() * 0.5,
  }));
}

/* ══════════════════════════════════════════════
   NEBULA GAS WISPS — thin filaments
══════════════════════════════════════════════ */
let wisps = [];
function initWisps() {
  wisps = Array.from({ length: 10 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 0.08 + Math.random() * 0.20,
    angle: Math.random() * Math.PI,
    width: 0.008 + Math.random() * 0.02,
    alpha: 0.008 + Math.random() * 0.02,
    parallax: 0.008 + Math.random() * 0.025,
    colorShift: Math.random(),
    drift: Math.random() * Math.PI * 2,
    noiseScale: 0.2 + Math.random() * 0.4,
  }));
}

/* ══════════════════════════════════════════════
   COSMIC DUST LANES
══════════════════════════════════════════════ */
let dustLanes = [];
function initDustLanes() {
  dustLanes = [
    { x1:-0.1, y1:0.2, x2:1.1, y2:0.65, width:0.28, alpha:0.035, phase:0 },
    { x1:0.3, y1:-0.1, x2:0.9, y2:1.1, width:0.16, alpha:0.02, phase:2.1 },
  ];
}

/* ══════════════════════════════════════════════
   DISTANT GALAXIES
══════════════════════════════════════════════ */
let galaxies = [];
function initGalaxies() {
  galaxies = Array.from({ length: 10 }, () => ({
    x: 0.04 + Math.random() * 0.92,
    y: 0.04 + Math.random() * 0.92,
    r: 4 + Math.random() * 16,
    angle: Math.random() * Math.PI,
    eccentricity: 0.3 + Math.random() * 0.7,
    alpha: 0.01 + Math.random() * 0.03,
    colorR: Math.random() < 0.4 ? 195 : Math.random() < 0.7 ? 250 : 210,
    colorG: Math.random() < 0.4 ? 190 : Math.random() < 0.7 ? 235 : 200,
    colorB: Math.random() < 0.4 ? 240 : Math.random() < 0.7 ? 210 : 230,
    parallax: 0.002 + Math.random() * 0.006,
    hasSpiralHint: Math.random() < 0.35,
    spiralAngle: Math.random() * Math.PI * 2,
    z: 0.7 + Math.random() * 0.3,
  }));
}

/* ══════════════════════════════════════════════
   SHOOTING STARS
══════════════════════════════════════════════ */
let streaks = [];
function initStreaks() { streaks = Array.from({ length: 6 }, () => makeStreak()); }
function makeStreak() {
  return {
    x: Math.random(), y: Math.random() * 0.6,
    len: 0.04 + Math.random() * 0.10,
    speed: 0.00007 + Math.random() * 0.00014,
    angle: Math.PI * 0.18 + Math.random() * 0.25,
    alpha: 0, life: 0,
    maxLife: 3.5 + Math.random() * 5.5, // seconds instead of frames
    width: 0.4 + Math.random() * 0.9,
    colorPrefix: Math.random() < 0.7 ? 'rgba(200,210,255,' : 'rgba(255,240,220,',
  };
}

/* ══════════════════════════════════════════════
   WARP PULSES
══════════════════════════════════════════════ */
let warpPulses = [];
function spawnWarpPulse(alpha, speed) {
  if (warpPulses.length < 6)
    warpPulses.push({ r:0, maxR: Math.max(W,H)*0.85, alpha: alpha || 0.035, speed: speed || (0.4+Math.random()*0.35) });
}

/* Warp-jump flight: warpVel is a decaying surge kicked on section changes;
   warpFlight is the integrated forward travel it adds to every layer's scrollDepth. */
let warpVel = 0;
let warpFlight = 0;

/* Per-section accent tint (lerped each frame) — drives the ambience hue. */
const ACCENTS = {
  purple: { r: 26, g: 10, b: 52 },
  blue:   { r: 14, g: 26, b: 74 },
  teal:   { r: 8,  g: 48, b: 50 },
};
let tint = { ...ACCENTS.purple };
let tintTarget = { ...ACCENTS.purple };

/* Pre-rendered star-glow sprites (one per spectral type) + cached vignette. */
let starGlowSprites = [];
let vignetteCanvas = null;

/* ══════════════════════════════════════════════
   MOUSE TRAIL
══════════════════════════════════════════════ */
let trailParticles = [];
const MAX_TRAIL = 50;

/* ══════════════════════════════════════════════
   MICRO-EVENT FLASHES
══════════════════════════════════════════════ */
let flashes = [];
let flashAccum = 0;

/* ══════════════════════════════════════════════
   CLICK BURST
══════════════════════════════════════════════ */
let burstParticles = [];
function spawnBurst(px, py) {
  const pal = PALETTES[cfg.colorMode] || PALETTES['deep-space'];
  const N = 20 + Math.floor(Math.random() * 16);
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
    const speed = 1.2 + Math.random() * 4.0;
    const colIdx = Math.floor(Math.random() * pal.length);
    burstParticles.push({
      x: px, y: py,
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      r: 0.5 + Math.random()*1.8, alpha: 0.85+Math.random()*0.15,
      decay: 0.6+Math.random()*0.9, // per second
      colIdx, trail: [],
    });
  }
  if (cfg.rippleOnClick) {
    const layer = document.getElementById('ripple-layer');
    if (!layer) return;
    [0,100,220].forEach((delay,di) => {
      const div = document.createElement('div');
      const c = ['rgba(100,80,180,0.45)','rgba(70,55,140,0.25)','rgba(90,70,160,0.12)'];
      div.style.cssText = `position:absolute;left:${px}px;top:${py}px;width:4px;height:4px;border-radius:50%;border:1px solid ${c[di]};transform:translate(-50%,-50%);animation:ripple-out ${1+di*0.3}s cubic-bezier(0.15,0.7,0.3,1) ${delay}ms forwards;pointer-events:none;`;
      layer.appendChild(div);
      setTimeout(()=>div.remove(), 1500+delay+di*400);
    });
  }
}

/* ══════════════════════════════════════════════
   NEBULA BLOBS
══════════════════════════════════════════════ */
let blobs = [];
function initBlobs(n) {
  blobs = Array.from({ length: n }, (_, i) => ({
    bx: 0.1+Math.random()*0.8, by: 0.1+Math.random()*0.8,
    driftAmpX: 0.04+Math.random()*0.10, driftAmpY: 0.03+Math.random()*0.08,
    driftSpeedX: 0.08+Math.random()*0.14, driftSpeedY: 0.06+Math.random()*0.11,
    phaseX: Math.random()*Math.PI*2, phaseY: Math.random()*Math.PI*2,
    parallax: 0.02+Math.random()*0.08,
    radiusFrac: 0.25+Math.random()*0.35,
    colorIdx: i, cx: 0.5, cy: 0.5,
    colorIdx2: (i+2) % (PALETTES['deep-space'].length), innerRatio: 0.2+Math.random()*0.3,
    noiseScaleX: 0.4 + Math.random() * 0.3,
    noiseScaleY: 0.3 + Math.random() * 0.3,
  }));
}

/* ══════════════════════════════════════════════
   OFFSCREEN CANVASES
══════════════════════════════════════════════ */
let nebulaCanvas = null, nebulaCtx = null;
let dustCanvas = null, dustCtx = null;
let cursorGlowCanvas = null, cursorGlowCtx = null;
let nebulaW = 0, nebulaH = 0;
let offscreenFrameCount = 0;

function createOffscreenCanvases() {
  if (nebulaCanvas) { nebulaCanvas.width = 0; nebulaCanvas.height = 0; }
  if (dustCanvas) { dustCanvas.width = 0; dustCanvas.height = 0; }
  nebulaW = Math.ceil(W / 4);
  nebulaH = Math.ceil(H / 4);

  nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = nebulaW;
  nebulaCanvas.height = nebulaH;
  nebulaCtx = nebulaCanvas.getContext('2d');

  dustCanvas = document.createElement('canvas');
  dustCanvas.width = nebulaW;
  dustCanvas.height = nebulaH;
  dustCtx = dustCanvas.getContext('2d');

  // Cursor glow — 256x256 radial gradient, created once
  cursorGlowCanvas = document.createElement('canvas');
  cursorGlowCanvas.width = 256;
  cursorGlowCanvas.height = 256;
  cursorGlowCtx = cursorGlowCanvas.getContext('2d');
  renderCursorGlow();
}

function renderCursorGlow() {
  const c = cursorGlowCtx;
  c.clearRect(0, 0, 256, 256);
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0,   'rgba(110,90,180,0.08)');
  g.addColorStop(0.5, 'rgba(70,50,140,0.02)');
  g.addColorStop(1,   'rgba(50,35,110,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(128, 128, 128, 0, Math.PI * 2); c.fill();
}

/* Pre-render one radial glow sprite per spectral type (full alpha). Drawn with
   globalAlpha per star instead of allocating a gradient every frame. */
function buildStarGlowSprites() {
  starGlowSprites = SPECTRAL.map((spec) => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   `rgba(${spec.r},${spec.g},${spec.b},1)`);
    grad.addColorStop(0.4, `rgba(${spec.r},${spec.g},${spec.b},0.3)`);
    grad.addColorStop(1,   `rgba(${spec.r},${spec.g},${spec.b},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return c;
  });
}

/* The vignette + top gradient are static (depend only on W/H) — bake them once. */
function buildVignetteCanvas() {
  vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = W; vignetteCanvas.height = H;
  const vc = vignetteCanvas.getContext('2d');
  const g = vc.createRadialGradient(W*0.5,H*0.44,Math.min(W,H)*0.2,W*0.5,H*0.44,Math.max(W,H)*0.95);
  g.addColorStop(0,   'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.2)');
  g.addColorStop(1,   'rgba(0,0,0,0.55)');
  vc.fillStyle = g; vc.fillRect(0,0,W,H);
  const tg = vc.createLinearGradient(0,0,0,60);
  tg.addColorStop(0,'rgba(0,0,0,0.25)'); tg.addColorStop(1,'rgba(0,0,0,0)');
  vc.fillStyle = tg; vc.fillRect(0,0,W,90);
}

function renderNebulaOffscreen(t) {
  const oc = nebulaCtx;
  const scale = 0.25; // 1/4 resolution
  oc.clearRect(0, 0, nebulaW, nebulaH);

  const pal = PALETTES[cfg.colorMode] || PALETTES['deep-space'];
  const opBase = (cfg.opacity || 4) / 100;
  const str = (cfg.reactivity || 75) / 100;
  const scrollP = Math.min(1, scroll / Math.max(1, cachedScrollHeight - H));

  // Blur baked in
  oc.filter = `blur(${((cfg.blurAmount || 50) * scale).toFixed(1)}px)`;

  // Nebula blobs
  if (blobs.length > 0) {
    blobs.forEach((b, i) => {
      const col  = pal[b.colorIdx  % pal.length];
      const col2 = pal[b.colorIdx2 % pal.length];
      const dx = SimplexNoise(b.bx * b.noiseScaleX + t * b.driftSpeedX * Math.PI * 2, b.by * b.noiseScaleY + b.phaseX) * b.driftAmpX;
      const dy = SimplexNoise(b.by * b.noiseScaleY + t * b.driftSpeedY * Math.PI * 2, b.bx * b.noiseScaleX + b.phaseY) * b.driftAmpY;
      const mpx = (mouse.x-0.5) * b.parallax * str;
      const mpy = (mouse.y-0.5) * b.parallax * str;
      const so = cfg.scrollShift ? scrollP * (0.04+i*0.02) * -1 : 0;
      const nx = Math.max(0.05, Math.min(0.95, b.bx+dx+mpx));
      const ny = Math.max(0.05, Math.min(0.95, b.by+dy+mpy+so));
      b.cx += (nx-b.cx)*0.03; b.cy += (ny-b.cy)*0.03;
      const cx = b.cx*nebulaW, cy = b.cy*nebulaH, r = b.radiusFrac*Math.max(nebulaW,nebulaH);
      const pulse = 0.82+0.18*Math.sin(t*1.2+b.phaseX);
      const a = opBase * pulse;
      const ci1 = b.colorIdx % pal.length;
      const ci2 = b.colorIdx2 % pal.length;
      const g = oc.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,            palColorAtAlpha(ci1, a));
      g.addColorStop(b.innerRatio, palColorAtAlpha(ci2, a*0.45));
      g.addColorStop(0.7,          palColorAtAlpha(ci1, a*0.08));
      g.addColorStop(1,            palColorAtAlpha(ci1, 0));
      oc.beginPath(); oc.arc(cx,cy,r,0,Math.PI*2); oc.fillStyle=g; oc.fill();
    });
  }

  // Nebula wisps
  wisps.forEach(w => {
    const noiseX = SimplexNoise(w.x * w.noiseScale + t * 0.4, w.y * w.noiseScale + w.drift) * 0.01;
    const noiseY = SimplexNoise(w.y * w.noiseScale + t * 0.3, w.x * w.noiseScale + w.drift * 1.7) * 0.008;
    const wx = (w.x + (mouse.x-0.5) * w.parallax * str + noiseX) * nebulaW;
    const wy = (w.y + (mouse.y-0.5) * w.parallax * str + noiseY) * nebulaH;
    const len = w.len * Math.max(nebulaW, nebulaH);
    const ex = wx + Math.cos(w.angle) * len;
    const ey = wy + Math.sin(w.angle) * len;
    const ci = Math.floor(w.colorShift * pal.length) % pal.length;
    const g = oc.createLinearGradient(wx,wy,ex,ey);
    g.addColorStop(0,   palColorAtAlpha(ci, 0));
    g.addColorStop(0.3, palColorAtAlpha(ci, w.alpha));
    g.addColorStop(0.7, palColorAtAlpha(ci, w.alpha * 0.6));
    g.addColorStop(1,   palColorAtAlpha(ci, 0));
    oc.strokeStyle = g;
    oc.lineWidth = w.width * Math.max(nebulaW, nebulaH);
    oc.lineCap = 'round';
    oc.beginPath(); oc.moveTo(wx,wy); oc.lineTo(ex,ey); oc.stroke();
  });

  oc.filter = 'none';
}

function renderDustOffscreen(t) {
  const dc = dustCtx;
  const scale = 0.25;
  dc.clearRect(0, 0, nebulaW, nebulaH);
  dc.filter = `blur(${(55 * scale).toFixed(1)}px)`;

  dustLanes.forEach(dl => {
    const cx = (dl.x1+dl.x2)*0.5*nebulaW, cy = (dl.y1+dl.y2)*0.5*nebulaH;
    const ang = Math.atan2((dl.y2-dl.y1)*nebulaH, (dl.x2-dl.x1)*nebulaW);
    const len = Math.sqrt(((dl.x2-dl.x1)*nebulaW)**2 + ((dl.y2-dl.y1)*nebulaH)**2) * 0.5;
    const w = dl.width * Math.max(nebulaW, nebulaH);
    const breathe = 0.85 + 0.15 * Math.sin(t*0.5+dl.phase);
    dc.save();
    dc.translate(cx,cy); dc.rotate(ang);
    const g = dc.createRadialGradient(0,0,0,0,0,len);
    g.addColorStop(0,   `rgba(160,155,200,${dl.alpha*breathe})`);
    g.addColorStop(0.5, `rgba(120,115,175,${dl.alpha*breathe*0.35})`);
    g.addColorStop(1,   'rgba(90,85,140,0)');
    dc.fillStyle = g; dc.scale(1, w/len);
    dc.beginPath(); dc.arc(0,0,len,0,Math.PI*2); dc.fill();
    dc.restore();
  });

  dc.filter = 'none';
}

/* ══════════════════════════════════════════════
   RESIZE
══════════════════════════════════════════════ */
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  initStars(cfg.starCount || 3000);
  initDeepField();
  createOffscreenCanvases();
  buildVignetteCanvas();
  offscreenFrameCount = 0;
  cachedScrollHeight = document.body.scrollHeight;
}

/* ══════════════════════════════════════════════
   SPIRAL GALAXY RENDERER
══════════════════════════════════════════════ */
function drawGalaxy(gx, gy, galaxy, t) {
  // Core glow
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(galaxy.angle);
  ctx.scale(1, galaxy.eccentricity);

  const coreR = galaxy.r;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  g.addColorStop(0,   `rgba(${galaxy.colorR},${galaxy.colorG},${galaxy.colorB},${galaxy.alpha})`);
  g.addColorStop(0.4, `rgba(${galaxy.colorR},${galaxy.colorG},${galaxy.colorB},${galaxy.alpha*0.4})`);
  g.addColorStop(1,   `rgba(${galaxy.colorR},${galaxy.colorG},${galaxy.colorB},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Spiral arms for galaxies with hasSpiralHint
  if (galaxy.hasSpiralHint) {
    ctx.save();
    ctx.translate(gx, gy);
    const rotAngle = t * 0.008 + galaxy.spiralAngle;
    ctx.rotate(rotAngle);

    const armCount = 2;
    const points = 40;
    const turns = 2.5;
    const maxR = galaxy.r * 2.2;
    const armAlpha = galaxy.alpha * 0.35;

    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm / armCount) * Math.PI * 2;
      ctx.beginPath();
      for (let p = 0; p < points; p++) {
        const frac = p / (points - 1);
        // Logarithmic spiral: r = a * e^(b*theta)
        const theta = armOffset + frac * turns * Math.PI * 2;
        const spiralR = maxR * 0.08 * Math.exp(frac * 2.2);
        const clampedR = Math.min(spiralR, maxR);
        const sx = Math.cos(theta) * clampedR * galaxy.eccentricity;
        const sy = Math.sin(theta) * clampedR;
        if (p === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      const fadeAlpha = armAlpha * 0.6;
      ctx.strokeStyle = `rgba(${galaxy.colorR},${galaxy.colorG},${galaxy.colorB},${fadeAlpha.toFixed(3)})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════
   MAIN RENDER LOOP — delta-time driven
══════════════════════════════════════════════ */
let t = 0;
let warpAccum = 0;

function drawFrame(timestamp) {
  rafHandle = requestAnimationFrame(drawFrame);

  // Delta time in seconds, capped at 0.05s
  const rawDt = lastFrameTime === 0 ? 0.016 : (timestamp - lastFrameTime) / 1000;
  const dt = Math.min(rawDt, 0.05);
  lastFrameTime = timestamp;

  const spd = (cfg.speed || 50) / 50;
  t += 0.02 * spd * dt; // ~0.00032 per frame at 60fps => 0.02 per second
  warpAccum += spd * dt;
  flashAccum += spd * dt;
  offscreenFrameCount++;

  if (cfg.warpEffect && warpAccum > 3.0 + Math.random() * 2.0) { spawnWarpPulse(); warpAccum = 0; }

  /* Warp-jump surge: kicked by window.warpBurst() on section changes, decays fast (~0.2s) */
  warpVel *= Math.pow(0.01, dt);
  if (warpVel < 0.0008) warpVel = 0;
  warpFlight += warpVel * dt;

  /* Accent tint lerp (per-section color shift) — ~1s ease toward target */
  {
    const k = 1 - Math.pow(0.05, dt);
    tint.r += (tintTarget.r - tint.r) * k;
    tint.g += (tintTarget.g - tint.g) * k;
    tint.b += (tintTarget.b - tint.b) * k;
  }

  /* Micro-flash events — very rare */
  if (flashAccum > 1.3 + Math.random() * 3.3) {
    flashes.push({ x: Math.random()*W, y: Math.random()*H, alpha: 0.4+Math.random()*0.5, r: 2+Math.random()*4, decay: 2.4+Math.random()*1.8 });
    flashAccum = 0;
  }

  /* Mouse velocity & lerp smoothing — dt-based */
  mouseVel.x = targetMouse.x - prevMouse.x;
  mouseVel.y = targetMouse.y - prevMouse.y;
  prevMouse.x = mouse.x; prevMouse.y = mouse.y;
  const lerpFactor = 1 - Math.pow(0.03, dt); // equivalent to *= 0.94 at 60fps => smooth dt-based lerp
  mouse.x += (targetMouse.x - mouse.x) * lerpFactor;
  mouse.y += (targetMouse.y - mouse.y) * lerpFactor;
  const vel = Math.sqrt(mouseVel.x**2 + mouseVel.y**2);
  const str = (cfg.reactivity || 75) / 100;
  const scrollP = Math.min(1, scroll / Math.max(1, cachedScrollHeight - H));

  /* Trail particles */
  if (vel > 0.001 && trailParticles.length < MAX_TRAIL) {
    trailParticles.push({
      x: mouse.x*W, y: mouse.y*H,
      alpha: 0.35+Math.random()*0.25, r: 0.8+Math.random()*1.5,
      decay: 0.72+Math.random()*0.6, // per second
    });
  }

  /* ═══ LAYER 1: Base ═══ */
  ctx.fillStyle = '#010004';
  ctx.fillRect(0, 0, W, H);

  /* Center ambience — tinted by the current per-section accent */
  {
    const cx = W*0.5, cy = H*0.42, r = Math.max(W,H)*0.95;
    const tr = tint.r | 0, tg = tint.g | 0, tb = tint.b | 0;
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,    `rgba(${tr},${tg},${tb},0.55)`);
    g.addColorStop(0.35, `rgba(${(tr*0.55)|0},${(tg*0.55)|0},${(tb*0.55)|0},0.30)`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }

  /* ═══ LAYER 2: Deep field ═══ */
  deepField.forEach(s => {
    const tw = 0.7 + 0.3 * Math.sin(t * s.twinkleSpeed * Math.PI * 2 + s.twinkle);
    const a = s.alpha * tw;
    if (a < 0.02) return;
    const px = s.x * W, py = s.y * H;
    ctx.fillStyle = DEEP_FIELD_LUT[Math.max(0, Math.min(255, (a * 255 + 0.5) | 0))];
    ctx.fillRect(px, py, s.r, s.r);
  });

  /* ═══ LAYER 3: Dark nebulae — noise-driven ═══ */
  ctx.save();
  darkNebulae.forEach(dn => {
    const dx = dn.x + (mouse.x-0.5) * dn.parallax * str;
    const dy = dn.y + (mouse.y-0.5) * dn.parallax * str;
    const driftX = SimplexNoise(dn.x * dn.noiseScale + t * 0.3, dn.y * dn.noiseScale + dn.drift) * 0.01;
    const driftY = SimplexNoise(dn.y * dn.noiseScale + t * 0.25, dn.x * dn.noiseScale + dn.drift * 1.3) * 0.008;
    const cx = (dx + driftX) * W, cy = (dy + driftY) * H;
    const r = dn.r * Math.max(W, H);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dn.angle);
    ctx.scale(1, dn.stretch);

    const g = ctx.createRadialGradient(0,0,0,0,0,r);
    g.addColorStop(0,   `rgba(1,0,3,${dn.alpha})`);
    g.addColorStop(0.5, `rgba(1,0,3,${dn.alpha * 0.5})`);
    g.addColorStop(1,   'rgba(1,0,3,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  /* ═══ LAYER 4: Background stars ═══ */
  drawStars(starsL0, 0.55);

  /* ═══ LAYERS 5+6: Nebula (offscreen composite) ═══ */
  if (offscreenFrameCount % 4 === 0 || offscreenFrameCount <= 1) {
    renderNebulaOffscreen(t);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(nebulaCanvas, 0, 0, W, H);
  ctx.restore();

  /* ═══ LAYER 7: Star clusters ═══ */
  ctx.save();
  clusters.forEach(cl => {
    const scrollDepth = (cfg.scrollShift ? scroll * 0.0003 : 0) + warpFlight;
    let cz = cl.z - scrollDepth;
    cz = ((cz % 1.0) + 1.0) % 1.0;
    if (cz < 0.01) cz += 0.01;
    const perspective = 1 / cz;
    const clx = (0.5 + (cl.cx - 0.5 + (mouse.x-0.5)*cl.parallax*str) * perspective) * W;
    const cly = (0.5 + (cl.cy - 0.5 + (mouse.y-0.5)*cl.parallax*str) * perspective) * H;
    cl.stars.forEach(s => {
      const tw = 0.7 + 0.3 * Math.sin(t * 1.8 + s.twinkle);
      const a = s.alpha * tw * Math.min(1, perspective * 0.3);
      ctx.fillStyle = CLUSTER_STAR_LUT[Math.max(0, Math.min(255, (a * 255 + 0.5) | 0))];
      ctx.beginPath();
      ctx.arc(clx + s.ox*W*perspective*0.5, cly + s.oy*H*perspective*0.5, s.r * perspective * 0.5, 0, Math.PI*2);
      ctx.fill();
    });
  });
  ctx.restore();

  /* ═══ LAYER 8: Galaxies (with spiral rendering) ═══ */
  ctx.save();
  galaxies.forEach(gal => {
    const scrollDepth = (cfg.scrollShift ? scroll * 0.0003 : 0) + warpFlight;
    let gz = gal.z - scrollDepth;
    gz = ((gz % 1.0) + 1.0) % 1.0;
    if (gz < 0.01) gz += 0.01;
    const perspective = 1 / gz;
    const gx = (0.5 + (gal.x - 0.5 + (mouse.x-0.5)*gal.parallax*str) * perspective) * W;
    const gy = (0.5 + (gal.y - 0.5 + (mouse.y-0.5)*gal.parallax*str) * perspective) * H;
    if (gx < -50 || gx > W+50 || gy < -50 || gy > H+50) return;
    drawGalaxy(gx, gy, gal, t);
  });
  ctx.restore();

  /* ═══ LAYER 9: Mid stars ═══ */
  drawStars(starsL1, 0.85);

  /* ═══ LAYER 10: Dust lanes (offscreen composite) ═══ */
  if (offscreenFrameCount % 4 === 0 || offscreenFrameCount <= 1) {
    renderDustOffscreen(t);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(dustCanvas, 0, 0, W, H);
  ctx.restore();

  /* ═══ LAYER 11: Warp pulses ═══ */
  if (cfg.warpEffect) {
    ctx.save();
    const cx = W*(0.4+mouse.x*0.2), cy = H*(0.3+mouse.y*0.2);
    warpPulses = warpPulses.filter(p => p.r < p.maxR);
    warpPulses.forEach(p => {
      p.r += p.speed*W*0.006*spd*dt*60; // dt-based expansion
      const fade = 1-(p.r/p.maxR);
      const g = ctx.createRadialGradient(cx,cy,p.r*0.88,cx,cy,p.r);
      g.addColorStop(0,   'rgba(70,50,140,0)');
      g.addColorStop(0.7, `rgba(70,50,140,${(p.alpha*fade*0.35).toFixed(3)})`);
      g.addColorStop(1,   `rgba(100,70,180,${(p.alpha*fade).toFixed(3)})`);
      ctx.strokeStyle=g; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(cx,cy,p.r,0,Math.PI*2); ctx.stroke();
    });
    ctx.restore();
  }

  /* ═══ LAYER 12: Shooting stars — dt-based ═══ */
  if (cfg.showStreaks) {
    ctx.save();
    streaks.forEach((s,idx) => {
      s.life += dt * spd;
      if (s.life > s.maxLife) { streaks[idx]=makeStreak(); return; }
      const lr = s.life/s.maxLife;
      s.alpha = lr<0.15 ? lr/0.15 : lr>0.75 ? (1-lr)/0.25 : 1;
      s.x += Math.cos(s.angle)*s.speed*spd*dt*60;
      s.y += Math.sin(s.angle)*s.speed*spd*dt*60;
      if (s.x>1.1||s.y>1.1||s.x<-0.1) { streaks[idx]=makeStreak(); return; }
      const sx=s.x*W, sy=s.y*H;
      const ex=sx-Math.cos(s.angle)*s.len*W, ey=sy-Math.sin(s.angle)*s.len*H;
      const g=ctx.createLinearGradient(ex,ey,sx,sy);
      g.addColorStop(0,  `${s.colorPrefix}0)`);
      g.addColorStop(0.6,`${s.colorPrefix}${(s.alpha*0.3).toFixed(2)})`);
      g.addColorStop(1,  `${s.colorPrefix}${s.alpha.toFixed(2)})`);
      ctx.strokeStyle=g; ctx.lineWidth=s.width; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(sx,sy); ctx.stroke();
      const h=ctx.createRadialGradient(sx,sy,0,sx,sy,3);
      h.addColorStop(0,`${s.colorPrefix}${(s.alpha*0.7).toFixed(2)})`);
      h.addColorStop(1,`${s.colorPrefix}0)`);
      ctx.fillStyle=h; ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  /* ═══ LAYER 13: Mouse trail — dt-based decay ═══ */
  trailParticles = trailParticles.filter(p => p.alpha > 0.01);
  if (trailParticles.length > 0) {
    ctx.save();
    trailParticles.forEach(p => {
      p.alpha -= p.decay * dt;
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
      g.addColorStop(0, `rgba(170,165,220,${p.alpha.toFixed(2)})`);
      g.addColorStop(1, 'rgba(170,165,220,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  /* ═══ LAYER 14: Cursor glow (pre-rendered offscreen) ═══ */
  {
    const cx = mouse.x*W, cy = mouse.y*H;
    const glowSize = Math.max(W,H)*0.16; // draw size
    ctx.save();
    ctx.globalAlpha = str;
    ctx.drawImage(cursorGlowCanvas, cx - glowSize*0.5, cy - glowSize*0.5, glowSize, glowSize);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ═══ LAYER 15: Foreground stars ═══ */
  drawStars(starsL2, 1.0);

  /* ═══ LAYER 16: Click burst — dt-based physics ═══ */
  burstParticles = burstParticles.filter(p => p.alpha > 0.02);
  if (burstParticles.length > 0) {
    ctx.save();
    const dtScale = dt * 60; // normalize to 60fps equivalent
    burstParticles.forEach(p => {
      p.trail.push({x:p.x,y:p.y,a:p.alpha});
      if (p.trail.length>6) p.trail.shift();
      p.x+=p.vx*dtScale; p.y+=p.vy*dtScale;
      p.vy+=1.8*dtScale; // gravity: ~0.03/frame at 60fps
      const damping = Math.pow(0.97, dtScale);
      p.vx*=damping; p.vy*=damping;
      p.alpha-=p.decay*dt;
      p.trail.forEach((pt,ti) => {
        const ta=pt.a*(ti/p.trail.length)*0.3;
        ctx.fillStyle = palColorAtAlpha(p.colIdx, ta);
        ctx.beginPath(); ctx.arc(pt.x,pt.y,p.r*0.5,0,Math.PI*2); ctx.fill();
      });
      const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2);
      grd.addColorStop(0, palColorAtAlpha(p.colIdx, p.alpha));
      grd.addColorStop(1, palColorAtAlpha(p.colIdx, 0));
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  /* ═══ LAYER 17: Micro-event flashes — dt-based ═══ */
  flashes = flashes.filter(f => f.alpha > 0.01);
  if (flashes.length > 0) {
    ctx.save();
    flashes.forEach(f => {
      f.alpha -= f.decay * dt;
      const g = ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*3);
      g.addColorStop(0, `rgba(255,250,240,${f.alpha})`);
      g.addColorStop(0.5, `rgba(200,195,230,${f.alpha*0.3})`);
      g.addColorStop(1, 'rgba(180,170,220,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*3,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  /* ═══ LAYER 18: Vignette (pre-baked, drawn once per frame) ═══ */
  if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0);

  /* Grid overlay (on top of everything else) */
  if (cfg.gridLines) {
    ctx.save(); ctx.strokeStyle='rgba(70,55,120,0.03)'; ctx.lineWidth=1;
    const G=80;
    ctx.beginPath();
    for (let x=0;x<W;x+=G){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for (let y=0;y<H;y+=G){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════
   STAR RENDERER — 3D depth, diffraction spikes, scintillation
══════════════════════════════════════════════ */
function drawStars(layerArray, alphaMult) {
  const str = (cfg.reactivity || 75) / 100;
  // warpFlight surges on warpBurst() (section changes) so the main starfield
  // participates in the jump too — not just clusters/galaxies.
  const scrollDepth = (cfg.scrollShift ? scroll * 0.0003 : 0) + warpFlight;

  for (let i = 0; i < layerArray.length; i++) {
    const s = layerArray[i];

    // Z depth with scroll-driven flight
    let z = s.baseZ - scrollDepth;
    z = ((z % 1.0) + 1.0) % 1.0;
    if (z < 0.01) z += 0.01;
    s.z = z;

    const perspective = Math.min(1 / z, 5);

    // Atmospheric scintillation — stars near bottom twinkle more
    const scintAmp = 0.15 + 0.35 * (s.scintillation / 2.0);
    const twinkle = (1 - scintAmp) + scintAmp * Math.sin(t * s.twinkleSpeed * Math.PI * 2 + s.twinklePhase);
    let a = s.baseAlpha * twinkle * alphaMult;
    if (a < 0.015) continue;

    // Position: simple parallax (no perspective warp on position — just mouse reactivity + scroll)
    const mouseOffX = (mouse.x - 0.5) * s.parallax * str;
    const mouseOffY = (mouse.y - 0.5) * s.parallax * str;
    const px = (s.baseX + mouseOffX) * W;
    const py = (s.baseY + mouseOffY) * H;

    // Cull offscreen
    if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

    // Size scales with perspective — close stars bigger, far stars smaller
    const r = s.r * (0.4 + perspective * 0.15);

    /* Glow halo for brighter stars — pre-rendered sprite, tinted alpha */
    if (s.baseAlpha > 0.52 && r > 0.8 && starGlowSprites.length) {
      const isColored = s.specIdx === 0 || s.specIdx === 1 || s.specIdx === 4 || s.specIdx === 5;
      const glowR = r * (isColored ? 3.8 : 2.5);
      const glowA = a * (isColored ? 0.55 : 0.35);
      ctx.globalAlpha = glowA;
      ctx.drawImage(starGlowSprites[s.specIdx], px - glowR, py - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;
    }

    /* Warp streak — during a section-jump surge, stars rush outward as radial
       lines (length ∝ speed × distance from centre, capped). Visual-only, so
       it never produces the position-warp "vortex". */
    if (cfg.warpEffect && warpVel > 0.06) {
      const dxc = px - W * 0.5, dyc = py - H * 0.5;
      const dist = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
      const streak = Math.min(warpVel, 1.2) * dist * 0.12;
      if (streak > 1.5) {
        ctx.strokeStyle = colorAtAlpha(s.specIdx, a);
        ctx.lineWidth = Math.max(0.6, r * 0.9);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - (dxc / dist) * streak, py - (dyc / dist) * streak);
        ctx.stroke();
      }
    }

    /* Star body */
    ctx.fillStyle = colorAtAlpha(s.specIdx, a);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();

    /* 4-point diffraction spikes for brightest stars */
    if (s.r > 1.4 && s.baseAlpha > 0.65 && s.layer >= 1) {
      ctx.save();
      const spikeA = a * 0.3;
      ctx.strokeStyle = colorAtAlpha(s.specIdx, spikeA);
      ctx.lineWidth = 0.4;
      const rot = t * 0.15 + s.twinklePhase;
      const sl = r * (s.layer === 2 ? 5 : 4);

      ctx.beginPath();
      ctx.moveTo(px - Math.cos(rot)*sl, py - Math.sin(rot)*sl);
      ctx.lineTo(px + Math.cos(rot)*sl, py + Math.sin(rot)*sl);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(rot+Math.PI/2)*sl, py - Math.sin(rot+Math.PI/2)*sl);
      ctx.lineTo(px + Math.cos(rot+Math.PI/2)*sl, py + Math.sin(rot+Math.PI/2)*sl);
      ctx.stroke();

      if (s.r > 2.0 && s.baseAlpha > 0.8) {
        ctx.strokeStyle = colorAtAlpha(s.specIdx, spikeA*0.4);
        ctx.lineWidth = 0.3;
        const sl2 = sl * 0.6;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(rot+Math.PI/4)*sl2, py - Math.sin(rot+Math.PI/4)*sl2);
        ctx.lineTo(px + Math.cos(rot+Math.PI/4)*sl2, py + Math.sin(rot+Math.PI/4)*sl2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(rot+3*Math.PI/4)*sl2, py - Math.sin(rot+3*Math.PI/4)*sl2);
        ctx.lineTo(px + Math.cos(rot+3*Math.PI/4)*sl2, py + Math.sin(rot+3*Math.PI/4)*sl2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/* ══════════════════════════════════════════════
   EVENTS + RIPPLE KEYFRAME
══════════════════════════════════════════════ */
const rkStyle = document.createElement('style');
rkStyle.textContent = `@keyframes ripple-out {
  0%   { opacity:1; width:4px; height:4px; border-width:1px; }
  100% { opacity:0; width:480px; height:480px; border-width:0.3px; }
}`;
document.head.appendChild(rkStyle);

window.addEventListener('mousemove', e => {
  targetMouse.x = e.clientX / W;
  targetMouse.y = e.clientY / H;
});
/* Touch parallax — bring the reactive scene to phones/tablets */
function handleTouch(e) {
  if (e.touches && e.touches.length) {
    targetMouse.x = e.touches[0].clientX / W;
    targetMouse.y = e.touches[0].clientY / H;
  }
}
window.addEventListener('touchstart', handleTouch, { passive: true });
window.addEventListener('touchmove', handleTouch, { passive: true });
window.addEventListener('scroll', () => { scroll = window.scrollY; cachedScrollHeight = document.body.scrollHeight; }, { passive: true });
window.addEventListener('resize', resize);

/* ══════════════════════════════════════════════
   API for HTML integration
══════════════════════════════════════════════ */
window.bootSpace = function(defaults) {
  cfg = { ...defaults };
  initSpectralLUT();
  buildStarGlowSprites();
  tint = { ...ACCENTS.purple };
  tintTarget = { ...ACCENTS.purple };
  initPalLUT(cfg.colorMode || 'deep-space');
  // Pre-build LUTs for all palettes
  Object.keys(PALETTES).forEach(k => initPalLUT(k));
  resize();
  initBlobs(cfg.blobCount || 0);
  initStreaks();
  initDustLanes();
  initGalaxies();
  initClusters();
  initDarkNebulae();
  initWisps();
  lastFrameTime = 0;
  cancelAnimationFrame(rafHandle);
  rafHandle = requestAnimationFrame(drawFrame);
};

window.stopSpace = function() {
  cancelAnimationFrame(rafHandle);
  rafHandle = 0;
};

window.updateSpaceCfg = function(newCfg) {
  const prev = { ...cfg };
  Object.assign(cfg, newCfg);
  if (newCfg.warpEffect === false) warpPulses = [];
  if (newCfg.colorMode && newCfg.colorMode !== prev.colorMode) {
    initPalLUT(newCfg.colorMode);
  }
  if (prev.blobCount !== cfg.blobCount) initBlobs(cfg.blobCount);
  if (prev.starCount !== cfg.starCount) {
    initStars(cfg.starCount);
    initDeepField();
    createOffscreenCanvases();
  }
};

/* Trigger a warp jump — a quick forward surge plus brighter pulse rings.
   Call on section changes for a "jumping through space" feel. */
window.warpBurst = function(intensity) {
  const k = intensity || 1;
  warpVel += 0.95 * k;
  spawnWarpPulse(0.11 * k, 0.85 + Math.random() * 0.4);
  spawnWarpPulse(0.06 * k, 0.6 + Math.random() * 0.35);
};

/* Shift the background accent per section: 'purple' | 'blue' | 'teal'.
   Lerps the ambience hue and swaps the nebula palette. */
window.setSpaceAccent = function(key) {
  const a = ACCENTS[key] || ACCENTS.purple;
  tintTarget = { r: a.r, g: a.g, b: a.b };
  const mode = key === 'blue' ? 'blue-indigo' : key === 'teal' ? 'teal' : 'deep-space';
  if (mode !== cfg.colorMode) {
    initPalLUT(mode);
    cfg.colorMode = mode;
  }
};
