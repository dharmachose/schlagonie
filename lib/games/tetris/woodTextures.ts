import { createNoise2D } from 'simplex-noise';
import type { TetrominoType } from './logic';

export type WoodSpecies = 'pine' | 'oak' | 'walnut' | 'birch' | 'cherry' | 'maple' | 'larch';

export const PIECE_SPECIES: Record<TetrominoType, WoodSpecies> = {
  I: 'pine',    // tronc droit — grain long
  O: 'oak',     // coupe transversale — cernes concentriques
  T: 'walnut',  // fourche de branche foncée
  S: 'birch',   // bouleau clair
  Z: 'cherry',  // cerisier rouge-brun
  J: 'maple',   // érable doré
  L: 'larch',   // mélèze ambré
};

interface WoodPalette {
  heartwood: [number, number, number];
  sapwood:   [number, number, number];
  bark:      [number, number, number];
  ringCount: number;
  noiseAmp:  number;
}

export const PALETTES: Record<WoodSpecies, WoodPalette> = {
  pine:   { heartwood: [142, 94,  38], sapwood: [218, 180, 108], bark: [50,  26,  8 ], ringCount: 2.8, noiseAmp: 0.24 },
  oak:    { heartwood: [82,  46,  12], sapwood: [142, 98,  44 ], bark: [32,  15,  4 ], ringCount: 4.5, noiseAmp: 0.18 },
  walnut: { heartwood: [36,  15,  3 ], sapwood: [88,  48,  15 ], bark: [18,  8,   2 ], ringCount: 5.5, noiseAmp: 0.15 },
  birch:  { heartwood: [192, 175, 145], sapwood: [238, 228, 208], bark: [28,  20,  12], ringCount: 2.2, noiseAmp: 0.30 },
  cherry: { heartwood: [95,  42,  18], sapwood: [152, 88,  46 ], bark: [38,  15,  6 ], ringCount: 3.8, noiseAmp: 0.20 },
  maple:  { heartwood: [165, 125, 62], sapwood: [220, 188, 128], bark: [62,  40,  15], ringCount: 3.0, noiseAmp: 0.26 },
  larch:  { heartwood: [112, 64,  14], sapwood: [168, 118, 45 ], bark: [44,  22,  5 ], ringCount: 4.2, noiseAmp: 0.22 },
};

function seededPrng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS: Record<WoodSpecies, number> = {
  pine: 11, oak: 22, walnut: 33, birch: 44, cherry: 55, maple: 66, larch: 77,
};

/**
 * Texture face (cap) — grain / cernes concentriques.
 * width/height en pixels, correspondant aux dimensions réelles de la pièce.
 */
export function generateWoodTexture(
  width: number,
  height: number,
  species: WoodSpecies,
): HTMLCanvasElement {
  const pal   = PALETTES[species];
  const noise = createNoise2D(seededPrng(SEEDS[species]));
  const cv    = document.createElement('canvas');
  cv.width = width; cv.height = height;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const d   = img.data;

  const ratio    = width / height;
  const isSquare = ratio >= 0.80 && ratio <= 1.25;
  const isWide   = ratio >  1.25;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let ring: number;
      if (isSquare) {
        const nx   = (px / width  - 0.5) * 2.4;
        const ny   = (py / height - 0.5) * 2.4;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const warp = noise(nx * 1.6, ny * 1.6) * 0.45 + noise(nx * 4.5, ny * 4.5) * 0.12;
        ring = Math.sin((dist + warp) * Math.PI * pal.ringCount);
      } else if (isWide) {
        const normY = py / height;
        const warp  = noise(px * 0.010, py * 0.052) * 0.42 + noise(px * 0.032, py * 0.108) * 0.14;
        ring = Math.sin((normY + warp) * Math.PI * pal.ringCount);
      } else {
        const normX = px / width;
        const warp  = noise(px * 0.052, py * 0.010) * 0.42 + noise(px * 0.108, py * 0.032) * 0.14;
        ring = Math.sin((normX + warp) * Math.PI * pal.ringCount);
      }
      const fine = noise(px * 0.058, py * 0.058) * pal.noiseAmp;
      const t    = Math.max(0, Math.min(1, ring * 0.5 + 0.5 + fine));
      const i    = (py * width + px) * 4;
      d[i]     = Math.round(pal.heartwood[0] + (pal.sapwood[0] - pal.heartwood[0]) * t);
      d[i + 1] = Math.round(pal.heartwood[1] + (pal.sapwood[1] - pal.heartwood[1]) * t);
      d[i + 2] = Math.round(pal.heartwood[2] + (pal.sapwood[2] - pal.heartwood[2]) * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/**
 * Texture écorce (sides extrudés) — striations verticales sombres.
 */
export function generateBarkTexture(
  width: number,
  height: number,
  species: WoodSpecies,
): HTMLCanvasElement {
  const [r0, g0, b0] = PALETTES[species].bark;
  const noise = createNoise2D(seededPrng(SEEDS[species] + 100));
  const cv    = document.createElement('canvas');
  cv.width = width; cv.height = height;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const d   = img.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Striations verticales + rugosité fine
      const striation = noise(px * 0.035, py * 0.005) * 0.5 + 0.5;
      const rough     = noise(px * 0.18,  py * 0.18 ) * 0.5 + 0.5;
      const t = striation * 0.65 + rough * 0.35;
      const i = (py * width + px) * 4;
      d[i]     = Math.min(255, Math.round(r0 + t * 38));
      d[i + 1] = Math.min(255, Math.round(g0 + t * 22));
      d[i + 2] = Math.min(255, Math.round(b0 + t * 8 ));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function getBarkRgb(species: WoodSpecies): [number, number, number] {
  return PALETTES[species].bark;
}
