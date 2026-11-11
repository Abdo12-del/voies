/** Horizontal RTL world geometry. All coordinates are physical SVG coordinates;
 * native scrolling is deliberately LTR, so RTL scrollLeft browser quirks never leak into navigation.
 * The existing Bézier/sampling and seeded density approach is shared by rendering and collision tests.
 */
import type { LevelId } from "../data/sessions";

export interface Vec {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Seg {
  a: Vec;
  c1: Vec;
  c2: Vec;
  b: Vec;
}
export interface MapNode extends Vec {
  kind: "station" | "milestone";
  id: number;
  level: LevelId;
}
export interface Layout {
  W: number;
  H: number;
  viewportW: number;
  compact: boolean;
  spacing: number;
  roadW: number;
  stationSize: number;
  milestoneSize: number;
  labelW: number;
  labelH: number;
  roadCenter: number;
  amplitude: number;
  cardY: number;
  cardW: number;
  cardH: number;
  nodes: MapNode[];
  start: Vec;
  end: Vec;
  gate: Vec;
  splitX: number;
  segs: Seg[];
  samples: Vec[];
  rivers: Vec[];
  signs: Rect[];
}

export function computeLayout(viewportW: number, height = 640): Layout {
  const H = Math.max(260, Math.round(height));
  const compact = viewportW < 640;
  const spacing = compact ? 144 : viewportW < 1000 ? 188 : 204;
  const stationSize = compact ? 84 : 80;
  const milestoneSize = compact ? 106 : 120;
  const labelW = spacing - (compact ? 10 : 18);
  const labelH = compact ? 80 : 66;
  const roadW = compact ? 42 : 50;
  const roadCenter = Math.min(420, H * 0.4);
  const amplitude = compact ? Math.min(26, H * 0.04) : Math.min(62, H * 0.065);
  const cardH = compact ? 164 : 152;
  const cardW = compact ? 248 : 304;
  const cardY = Math.min(
    H - cardH - 18,
    roadCenter + amplitude + stationSize / 2 + labelH + 44,
  );
  const firstD = Math.max(viewportW / 2 + 48, compact ? 610 : 740);
  const distances: Array<Omit<MapNode, "x"> & { d: number }> = [];
  const medalGap = spacing + 90;
  let d = firstD;
  const waveY = (i: number) =>
    roadCenter + Math.cos((i * Math.PI) / 2) * amplitude;
  let gateD = 0;
  for (const level of [1, 2] as const) {
    for (let i = 0; i < 16; i++) {
      distances.push({
        kind: "station",
        id: (level - 1) * 16 + i + 1,
        level,
        d: d + i * spacing,
        y: waveY(i),
      });
    }
    d += 15 * spacing + medalGap;
    distances.push({ kind: "milestone", id: 0, level, d, y: roadCenter });
    if (level === 1) {
      gateD = d + (compact ? 220 : 280);
      d = gateD + (compact ? 220 : 280);
    }
  }
  const W = Math.ceil(d + Math.max(viewportW / 2 + 64, 350));
  const nodes: MapNode[] = distances.map(({ d: distance, ...node }) => ({
    ...node,
    x: W - distance,
  }));
  const first = nodes[0];
  const start = { x: first.x + (compact ? 260 : 320), y: first.y - 4 };
  const end = { x: W - d, y: roadCenter };
  const gate = { x: W - gateD, y: roadCenter };
  const points: Vec[] = [start];
  for (const node of nodes) {
    points.push(node);
    if (node.kind === "milestone" && node.level === 1) points.push(gate);
  }
  // Monotone X cubic Hermite interpolation; tangents are continuous at every join.
  const slopes = points.map((_p, i) =>
    i === 0 || i === points.length - 1
      ? 0
      : (points[i + 1].y - points[i - 1].y) /
        (points[i + 1].x - points[i - 1].x),
  );
  const segs: Seg[] = points.slice(0, -1).map((a, i) => {
    const b = points[i + 1];
    const dx = (b.x - a.x) / 3;
    return {
      a,
      b,
      c1: { x: a.x + dx, y: a.y + slopes[i] * dx },
      c2: { x: b.x - dx, y: b.y - slopes[i + 1] * dx },
    };
  });
  const samples = segs.flatMap((seg) =>
    Array.from({ length: 31 }, (_, i) => bezier(seg, i / 30)),
  );
  const signs = [
    {
      x: start.x + 100,
      y: Math.max(90, roadCenter - 122),
      w: compact ? 236 : 278,
      h: 118,
    },
    { x: gate.x - 16, y: cardY + 2, w: compact ? 176 : 226, h: 118 },
  ];
  const partial: Layout = {
    W,
    H,
    viewportW,
    compact,
    spacing,
    stationSize,
    milestoneSize,
    labelW,
    labelH,
    roadW,
    roadCenter,
    amplitude,
    cardY,
    cardW,
    cardH,
    nodes,
    start,
    end,
    gate,
    splitX: gate.x,
    segs,
    samples,
    signs,
    rivers: [],
  };
  partial.rivers = [4, 23].map((id) => {
    const a = nodes.find((n) => n.kind === "station" && n.id === id)!;
    const b = nodes.find((n) => n.kind === "station" && n.id === id + 1)!;
    const x = (a.x + b.x) / 2;
    return { x, y: roadYAt(partial, x) };
  });
  return partial;
}

export function bezier(s: Seg, t: number): Vec {
  const u = 1 - t;
  return {
    x:
      u ** 3 * s.a.x +
      3 * u ** 2 * t * s.c1.x +
      3 * u * t ** 2 * s.c2.x +
      t ** 3 * s.b.x,
    y:
      u ** 3 * s.a.y +
      3 * u ** 2 * t * s.c1.y +
      3 * u * t ** 2 * s.c2.y +
      t ** 3 * s.b.y,
  };
}

export function segsToPath(segs: Seg[]): string {
  if (!segs.length) return "";
  const f = (n: number) => Math.round(n * 10) / 10;
  return (
    `M ${f(segs[0].a.x)} ${f(segs[0].a.y)}` +
    segs
      .map(
        (s) =>
          ` C ${f(s.c1.x)} ${f(s.c1.y)}, ${f(s.c2.x)} ${f(s.c2.y)}, ${f(s.b.x)} ${f(s.b.y)}`,
      )
      .join("")
  );
}

export function roadYAt(L: Layout, x: number): number {
  const s = L.segs.find((seg) => x <= seg.a.x && x >= seg.b.x);
  if (!s) return x > L.start.x ? L.start.y : L.end.y;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(s, mid).x > x) lo = mid;
    else hi = mid;
  }
  return bezier(s, (lo + hi) / 2).y;
}

export function labelRect(n: MapNode, L: Layout): Rect {
  const w = n.kind === "milestone" ? (L.compact ? 200 : 232) : L.labelW;
  const h = n.kind === "milestone" ? 54 : L.labelH;
  const nearby = L.samples.filter((p) => Math.abs(p.x - n.x) < w / 2 + 8);
  const minY = Math.min(
    n.y - L.stationSize / 2,
    ...nearby.map((p) => p.y - L.roadW / 2),
  );
  const maxY = Math.max(
    n.y + (n.kind === "milestone" ? L.milestoneSize / 2 : L.stationSize / 2),
    ...nearby.map((p) => p.y + L.roadW / 2),
  );
  const above = n.kind === "station" && n.id % 2 === 0;
  return { x: n.x - w / 2, y: above ? minY - 16 - h : maxY + 18, w, h };
}

export function currentCardRect(n: Vec, L: Layout): Rect {
  return { x: n.x - L.cardW / 2, y: L.cardY, w: L.cardW, h: L.cardH };
}
export function sisterRect(L: Layout): Rect {
  const n = L.nodes[0],
    h = L.compact ? 104 : 116;
  return { x: n.x + 82, y: n.y - 64 - h, w: h * (365 / 720), h };
}
export function sisterSpeechRect(L: Layout): Rect {
  const r = sisterRect(L);
  return {
    x: L.compact ? r.x - 150 : r.x + r.w + 14,
    y: r.y - 10,
    w: L.compact ? 136 : 158,
    h: 46,
  };
}
export function guideRect(n: Vec, L: Layout): Rect {
  const h = L.compact ? 118 : 142;
  return {
    x: n.x + L.cardW / 2 + (L.compact ? 10 : 18),
    y: L.cardY + L.cardH - h - 4,
    w: h * (310 / 720),
    h,
  };
}
export function samiRect(n: Vec, L: Layout): Rect {
  const h = L.compact ? 126 : 140;
  return {
    x: n.x - (h * (552 / 720)) / 2,
    y: L.cardY + L.cardH - h - 4,
    w: h * (552 / 720),
    h,
  };
}
export function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}
export function reservedRects(L: Layout, currentId: number | null): Rect[] {
  const boxes: Rect[] = [
    ...L.nodes.map((n) => ({
      x:
        n.x -
        (n.kind === "milestone" ? L.milestoneSize : L.stationSize) / 2 -
        12,
      y:
        n.y -
        (n.kind === "milestone" ? L.milestoneSize : L.stationSize) / 2 -
        34,
      w: (n.kind === "milestone" ? L.milestoneSize : L.stationSize) + 24,
      h: (n.kind === "milestone" ? L.milestoneSize : L.stationSize) + 58,
    })),
    ...L.nodes
      .filter((n) => n.kind !== "station" || n.id !== currentId)
      .map((n) => labelRect(n, L)),
    ...L.signs.map((r) => ({ ...r, h: r.h + 32 })),
    { x: L.start.x - 72, y: L.start.y - 130, w: 144, h: 164 },
    { x: L.gate.x - 70, y: L.gate.y - 60, w: 140, h: 110 },
    sisterRect(L),
    sisterSpeechRect(L),
    ...L.nodes.filter((n) => n.kind === "milestone").map((n) => samiRect(n, L)),
  ];
  const current = L.nodes.find(
    (n) => n.kind === "station" && n.id === currentId,
  );
  if (current)
    boxes.push(currentCardRect(current, L), guideRect(current, L), {
      x: current.x - 12,
      y: current.y + L.stationSize / 2,
      w: 24,
      h: Math.max(0, L.cardY - current.y - L.stationSize / 2),
    });
  return boxes;
}

/** Stable pseudo-random generator: resizing never causes flickering random placement. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
