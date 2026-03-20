'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { generateWoodTexture, generateBarkTexture, PIECE_SPECIES, type WoodSpecies } from './woodTextures';
import type { TetrominoType } from './logic';

export type Cell = { row: number; col: number };

// Module-level texture cache (survives re-renders, cleared on cellSize change)
const texCache = new Map<string, THREE.CanvasTexture>();
const geoCache = new Map<string, THREE.ExtrudeGeometry>();

function woodTex(species: WoodSpecies, wCells: number, hCells: number): THREE.CanvasTexture {
  const key = `w-${species}-${wCells}x${hCells}`;
  if (!texCache.has(key)) {
    // Generate at 72 px/cell (good quality without being huge)
    const px = Math.max(wCells, 1) * 72;
    const py = Math.max(hCells, 1) * 72;
    const cv  = generateWoodTexture(px, py, species);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, tex);
  }
  return texCache.get(key)!;
}

function barkTex(species: WoodSpecies): THREE.CanvasTexture {
  const key = `b-${species}`;
  if (!texCache.has(key)) {
    const cv  = generateBarkTexture(256, 128, species);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, tex);
  }
  return texCache.get(key)!;
}

// ── Outer polygon computation (half-edge chain) ───────────────────────────
/**
 * Compute the ordered outer polygon vertices of a set of cells.
 * Winding: counter-clockwise (Three.js front-face default).
 */
export function computeOuterPolygon(cells: Cell[]): { x: number; y: number }[] {
  if (!cells.length) return [];
  const set = new Set(cells.map(c => `${c.row},${c.col}`));

  // Directed edges for CCW winding (viewed from +Z):
  //   top edge    → right  (x, y)   → (x+1, y)
  //   right edge  → down   (x+1, y) → (x+1, y+1)
  //   bottom edge → left   (x+1,y+1)→ (x,   y+1)
  //   left edge   → up     (x,  y+1)→ (x,   y)
  type E = { x1: number; y1: number; x2: number; y2: number };
  const edges: E[] = [];

  for (const { row: r, col: c } of cells) {
    if (!set.has(`${r - 1},${c}`)) edges.push({ x1: c,     y1: r,     x2: c + 1, y2: r     });
    if (!set.has(`${r},${c + 1}`)) edges.push({ x1: c + 1, y1: r,     x2: c + 1, y2: r + 1 });
    if (!set.has(`${r + 1},${c}`)) edges.push({ x1: c + 1, y1: r + 1, x2: c,     y2: r + 1 });
    if (!set.has(`${r},${c - 1}`)) edges.push({ x1: c,     y1: r + 1, x2: c,     y2: r     });
  }
  if (!edges.length) return [];

  const map = new Map<string, E>();
  for (const e of edges) map.set(`${e.x1},${e.y1}`, e);

  const poly: { x: number; y: number }[] = [];
  let cur = edges[0];
  for (let i = 0; i <= edges.length; i++) {
    poly.push({ x: cur.x1, y: cur.y1 });
    const nxt = map.get(`${cur.x2},${cur.y2}`);
    if (!nxt || nxt === edges[0]) break;
    cur = nxt;
  }
  return poly;
}

// ── 3D LogPiece component ─────────────────────────────────────────────────
const EXTRUDE_DEPTH = 0.60;  // depth of extrusion (world units = cells)
const BEVEL_SIZE    = 0.055;
const BEVEL_THICK   = 0.08;
const BEVEL_SEG     = 4;

interface LogPieceProps {
  cells: Cell[];
  type:  TetrominoType;
  ghost?: boolean;
}

export function LogPiece({ cells, type, ghost = false }: LogPieceProps) {
  const species = PIECE_SPECIES[type];

  // Bounding box
  const minRow = Math.min(...cells.map(c => c.row));
  const maxRow = Math.max(...cells.map(c => c.row));
  const minCol = Math.min(...cells.map(c => c.col));
  const maxCol = Math.max(...cells.map(c => c.col));
  const wCells = maxCol - minCol + 1;
  const hCells = maxRow - minRow + 1;

  // Outer polygon, shifted so minCol/minRow = 0
  const polygon = useMemo(
    () => computeOuterPolygon(cells).map(p => ({ x: p.x - minCol, y: p.y - minRow })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cells.map(c => `${c.row},${c.col}`).join('|')],
  );

  // Extruded geometry (cached by polygon key)
  const geoKey = polygon.map(p => `${p.x},${p.y}`).join('|');
  const geometry = useMemo(() => {
    if (!polygon.length) return null;
    const existing = geoCache.get(geoKey);
    if (existing) return existing;

    const shape = new THREE.Shape();
    // Three.js Y is up → negate Tetris Y (rows go down)
    shape.moveTo(polygon[0].x, -polygon[0].y);
    for (const { x, y } of polygon.slice(1)) shape.lineTo(x, -y);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps:          1,
      depth:          EXTRUDE_DEPTH,
      bevelEnabled:   true,
      bevelThickness: BEVEL_THICK,
      bevelSize:      BEVEL_SIZE,
      bevelSegments:  BEVEL_SEG,
    });
    // Fix UV for the cap faces: ExtrudeGeometry maps x,y directly as UV
    // → we want 0..wCells → 0..1
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) / wCells, uv.getY(i) / hCells);
    }
    uv.needsUpdate = true;

    geoCache.set(geoKey, geo);
    return geo;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoKey, wCells, hCells]);

  const wt = useMemo(() => woodTex(species, wCells, hCells), [species, wCells, hCells]);
  const bt = useMemo(() => barkTex(species), [species]);

  if (!geometry) return null;

  // Place at correct board position: col → X, row → -Y (Three.js Y up)
  const position: [number, number, number] = [minCol, -minRow, 0];

  if (ghost) {
    return (
      <mesh geometry={geometry} position={position}>
        {/* face */}
        <meshStandardMaterial attach="material-0" color={0x8B6040} transparent opacity={0.18} depthWrite={false} />
        {/* sides */}
        <meshStandardMaterial attach="material-1" color={0x3D1E0A} transparent opacity={0.18} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      {/* Group 0 = caps (front + back face) → coupe bois avec cernes/grain */}
      <meshStandardMaterial
        attach="material-0"
        map={wt}
        roughness={0.72}
        metalness={0.03}
      />
      {/* Group 1 = sides extrudés → écorce */}
      <meshStandardMaterial
        attach="material-1"
        map={bt}
        roughness={0.96}
        metalness={0.0}
      />
    </mesh>
  );
}
