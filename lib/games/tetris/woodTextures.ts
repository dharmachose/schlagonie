import { createNoise2D } from 'simplex-noise';
import type { TetrominoType } from './logic';

// ── Wood species — one per tetromino type ─────────────────────────────────
export type WoodSpecies = 'pine' | 'oak' | 'walnut' | 'birch' | 'cherry' | 'maple' | 'larch';

export const PIECE_SPECIES: Record<TetrominoType, WoodSpecies> = {
  I: 'pine',    // Pin des Vosges — brun clair, grain long
  O: 'oak',     // Chêne          — cernes concentriques (pièce carrée)
  T: 'walnut',  // Noyer          — chocolat foncé
  S: 'birch',   // Bouleau        — crème ivoire
  Z: 'cherry',  // Cerisier       — brun rouge chaud
  J: 'maple',   // Érable         — doré clair
  L: 'larch',   // Mélèze         — brun ambré
};

interface WoodPalette {
  heartwood: [number, number, number]; // inner dark grain
  sapwood:   [number, number, number]; // outer light grain
  bark:      [number, number, number]; // outer edge color
  ringCount: number;                   // ring density
  noiseAmp:  number;                   // grain irregularity
}

const PALETTES: Record<WoodSpecies, WoodPalette> = {
  pine:   { heartwood: [168, 122,  58], sapwood: [228, 195, 135], bark: [ 80, 48, 18], ringCount: 3.5, noiseAmp: 0.28 },
  oak:    { heartwood: [102,  62,  22], sapwood: [162, 118,  62], bark: [ 50, 28, 10], ringCount: 5.0, noiseAmp: 0.22 },
  walnut: { heartwood: [ 58,  28,   8], sapwood: [118,  72,  28], bark: [ 28, 12,  4], ringCount: 6.0, noiseAmp: 0.18 },
  birch:  { heartwood: [205, 192, 165], sapwood: [242, 235, 218], bark: [ 45, 35, 22], ringCount: 2.8, noiseAmp: 0.32 },
  cherry: { heartwood: [128,  48,  42], sapwood: [172,  88,  72], bark: [ 58, 22, 20], ringCount: 4.2, noiseAmp: 0.24 },
  maple:  { heartwood: [188, 152,  92], sapwood: [232, 205, 155], bark: [ 88, 62, 32], ringCount: 3.2, noiseAmp: 0.30 },
  larch:  { heartwood: [132,  78,  25], sapwood: [188, 138,  62], bark: [ 65, 38, 12], ringCount: 4.8, noiseAmp: 0.24 },
};

/** Minimal seeded PRNG (Mulberry32) for deterministic noise per species. */
function seededPrng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECIES_SEEDS: Record<WoodSpecies, number> = {
  pine: 11, oak: 22, walnut: 33, birch: 44, cherry: 55, maple: 66, larch: 77,
};

/**
 * Generate a realistic wood texture for a piece of given pixel dimensions.
 *
 * Orientation is inferred from aspect ratio:
 *   ~square   → cross-section view (concentric rings)
 *   wider     → log side view (grain horizontal)
 *   taller    → trunk side view (grain vertical)
 */
export function generateWoodTexture(
  width: number,
  height: number,
  species: WoodSpecies,
): HTMLCanvasElement {
  const pal    = PALETTES[species];
  const seed   = SPECIES_SEEDS[species];
  const noise  = createNoise2D(seededPrng(seed));
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const d   = img.data;

  const ratio        = width / height;
  const isCrossSection = ratio > 0.55 && ratio < 1.8;
  const isHorizontal   = ratio >= 1.8;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let ring: number;

      if (isCrossSection) {
        // Oak cross-section: concentric rings warped by noise
        const nx = (px / width  - 0.5) * 2.2;
        const ny = (py / height - 0.5) * 2.2;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const warp = noise(nx * 1.8, ny * 1.8) * 0.40
                   + noise(nx * 5.0, ny * 5.0) * 0.10;
        ring = Math.sin((dist + warp) * Math.PI * pal.ringCount);
      } else if (isHorizontal) {
        // Side of a horizontal log — grain runs along X, rings seen as Y-stripes
        const normY = py / height;
        const warp  = noise(px * 0.012, py * 0.055) * 0.38
                    + noise(px * 0.035, py * 0.110) * 0.12;
        ring = Math.sin((normY + warp) * Math.PI * pal.ringCount);
      } else {
        // Side of a vertical trunk — grain runs along Y, rings seen as X-stripes
        const normX = px / width;
        const warp  = noise(px * 0.055, py * 0.012) * 0.38
                    + noise(px * 0.110, py * 0.035) * 0.12;
        ring = Math.sin((normX + warp) * Math.PI * pal.ringCount);
      }

      // Fine grain overlay — adds micro-irregularity
      const fine = noise(px * 0.065, py * 0.065) * pal.noiseAmp;
      const t    = Math.max(0, Math.min(1, ring * 0.5 + 0.5 + fine));

      const i    = (py * width + px) * 4;
      d[i]     = Math.round(pal.heartwood[0] + (pal.sapwood[0] - pal.heartwood[0]) * t);
      d[i + 1] = Math.round(pal.heartwood[1] + (pal.sapwood[1] - pal.heartwood[1]) * t);
      d[i + 2] = Math.round(pal.heartwood[2] + (pal.sapwood[2] - pal.heartwood[2]) * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Dark bark color string for outer-edge strokes. */
export function getBarkColor(species: WoodSpecies): [number, number, number] {
  return PALETTES[species].bark;
}
