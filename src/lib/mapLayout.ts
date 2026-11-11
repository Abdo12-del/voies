/**
 * تخطيط خارطة الرحلة على طريقة خرائط مراحل الألعاب:
 * الطريق يبدأ من الأسفل ويصعد إلى الأعلى بشكل ثعباني (S)،
 * محطتان في كل صف على الهاتف، وأربع محطات على الحاسوب واللوحي.
 */
import type { LevelId } from "../data/sessions";

export interface Vec {
  x: number;
  y: number;
}

export interface MapNode extends Vec {
  kind: "station" | "milestone";
  /** رقم الحصة (للمحطات فقط) */
  id: number;
  level: LevelId;
  /** اتجاه السير الأفقي عند هذه النقطة: -1 من اليمين إلى اليسار، 1 من اليسار إلى اليمين */
  dir: 1 | -1;
  /** هل المحطة في طرف الصف (عند منعطف الطريق)؟ */
  rowEnd: boolean;
}

export interface Seg {
  a: Vec;
  c1: Vec;
  c2: Vec;
  b: Vec;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  W: number;
  H: number;
  wide: boolean;
  N: number;
  rowH: number;
  roadW: number;
  stationSize: number;
  currentSize: number;
  milestoneSize: number;
  labelW: number;
  nodes: MapNode[];
  start: Vec;
  segs: Seg[];
  samples: Vec[];
  zoneSplitY: number;
  river: { y: number; bridge: Vec; amp: number; period: number; width: number };
  /** منطقة لافتة المستوى الأول والأخت الصغيرة (أسفل الخارطة) */
  startArea: Rect;
  /** منطقة بوابة المستوى الثاني (لافتة + ليلى وسامي) */
  gateArea: Rect;
}

const WOBBLE = [0, 12, -8, 9, -11, 6];

export function computeLayout(W: number): Layout {
  const wide = W >= 680;
  const N = wide ? 4 : 2;
  const rowH = wide ? (W >= 1000 ? 200 : 214) : 178;
  const roadW = wide ? 56 : 46;
  const stationSize = wide ? 78 : 64;
  const currentSize = wide ? 92 : 76;
  const milestoneSize = wide ? 118 : 98;

  const lane = Math.min(W, wide ? 1180 : 560);
  const laneLeft = (W - lane) / 2;
  const reach = 0.45 * rowH + roadW / 2 + 12;
  const xMin = Math.max(laneLeft + lane * 0.12, reach);
  const xMax = W - xMin;
  const xs = Array.from({ length: N }, (_, j) => xMin + (j * (xMax - xMin)) / (N - 1));
  const spacing = (xMax - xMin) / (N - 1);
  const labelW = wide ? Math.min(230, spacing - 26) : Math.min(230, W * 0.58);

  const startH = wide ? 400 : 390;
  const msGap = rowH * (wide ? 1.2 : 1.28);
  const gateH = wide ? 500 : 500;
  const topPad = wide ? 220 : 200;
  const R = 16 / N;
  const riverRow = wide ? 1 : 3;
  const riverGap = wide ? 84 : 104;

  // ── المواضع بالارتفاع من أسفل الخارطة (b)، ثم تُقلب إلى y ──
  type BNode = Omit<MapNode, "y"> & { b: number };
  const bn: BNode[] = [];
  let b = startH;
  let g = 0;
  let riverB = 0;
  let gateBottomB = 0;
  let gateTopB = 0;
  let splitB = 0;

  for (const level of [1, 2] as LevelId[]) {
    for (let r = 0; r < R; r++) {
      const dir: 1 | -1 = g % 2 === 0 ? -1 : 1;
      for (let k = 0; k < N; k++) {
        const id = (level - 1) * 16 + r * N + k + 1;
        const x = dir === -1 ? xs[N - 1 - k] : xs[k];
        bn.push({
          kind: "station",
          id,
          level,
          x,
          b: b + WOBBLE[id % WOBBLE.length] * (wide ? 1 : 0.6),
          dir,
          rowEnd: k === 0 || k === N - 1,
        });
      }
      g++;
      if (r < R - 1) {
        if (level === 1 && r === riverRow) {
          riverB = b + (rowH + riverGap) / 2;
          b += rowH + riverGap;
        } else {
          b += rowH;
        }
      }
    }
    b += msGap;
    bn.push({ kind: "milestone", id: 0, level, x: W / 2, b, dir: g % 2 === 0 ? -1 : 1, rowEnd: false });
    g++;
    if (level === 1) {
      gateBottomB = b + (wide ? 150 : 128);
      splitB = b + milestoneSize / 2 + (wide ? 60 : 52);
      b += gateH;
      gateTopB = b - (wide ? 112 : 110);
    }
  }

  const H = Math.round(b + topPad);
  const Y = (bb: number) => H - bb;

  const nodes: MapNode[] = bn.map(({ b: bb, ...n }) => ({ ...n, y: Y(bb) }));
  const start: Vec = { x: nodes[0].x, y: H + 12 };

  // ── مقاطع الطريق (منحنيات بيزييه بمماسات أفقية عند المحطات) ──
  const minX = roadW / 2 + 6;
  const maxX = W - roadW / 2 - 6;
  const clampX = (x: number) => Math.max(minX, Math.min(maxX, x));
  const tangents: Vec[] = [{ x: 0, y: -1 }, ...nodes.map((n) => ({ x: n.dir, y: 0 }))];
  const pts: Vec[] = [start, ...nodes];
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i];
    const B = pts[i + 1];
    const tA = tangents[i];
    const tB = tangents[i + 1];
    const dist = Math.hypot(B.x - A.x, B.y - A.y);
    const dot = tA.x * tB.x + tA.y * tB.y;
    const k = dot < -0.5 ? 0.6 * Math.abs(B.y - A.y) : dot > 0.5 ? 0.42 * dist : 0.55 * dist;
    segs.push({
      a: A,
      c1: { x: clampX(A.x + tA.x * k), y: A.y + tA.y * k },
      c2: { x: clampX(B.x - tB.x * k), y: B.y - tB.y * k },
      b: B,
    });
  }

  const samples: Vec[] = [];
  for (const s of segs) {
    for (let t = 0; t <= 1; t += 1 / 30) samples.push(bezier(s, t));
  }

  // ── النهر يعبر منعطف الطريق بين صفّين، وعليه جسر خشبي ──
  const riverSeg = segs[(riverRow + 1) * N];
  const bridge = bezier(riverSeg, 0.5);
  const river = { y: Y(riverB), bridge, amp: wide ? 12 : 8, period: wide ? 90 : 60, width: wide ? 54 : 46 };
  river.y = bridge.y;

  // ── منطقة البداية: على يسار الطريق الصاعد إلى المحطة الأولى ──
  const st1 = nodes[0];
  const startArea: Rect = wide
    ? { x: 24, y: Y(startH - 128), w: Math.max(300, st1.x - 150), h: startH - 128 - 14 }
    : { x: 10, y: Y(startH - 132), w: st1.x - roadW / 2 - 18, h: startH - 132 - 14 };

  // ── بوابة المستوى الثاني: بين محطة الإنجاز الأولى وأول صف في المستوى الثاني ──
  const loopSeg = segs[16 + 1];
  const loopReach = Math.min(...[0.25, 0.5, 0.75].map((t) => bezier(loopSeg, t).x));
  const gx0 = loopReach + roadW / 2 + 14;
  const gx1 = W - (wide ? gx0 : 10);
  const gateArea: Rect = { x: gx0, y: Y(gateTopB), w: gx1 - gx0, h: gateTopB - gateBottomB };

  return {
    W,
    H,
    wide,
    N,
    rowH,
    roadW,
    stationSize,
    currentSize,
    milestoneSize,
    labelW,
    nodes,
    start,
    segs,
    samples,
    zoneSplitY: Y(splitB),
    river,
    startArea,
    gateArea,
  };
}

export function bezier(s: Seg, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.a.x + b * s.c1.x + c * s.c2.x + d * s.b.x,
    y: a * s.a.y + b * s.c1.y + c * s.c2.y + d * s.b.y,
  };
}

export function segsToPath(segs: Seg[]): string {
  if (!segs.length) return "";
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${f(segs[0].a.x)} ${f(segs[0].a.y)}`;
  for (const s of segs) d += ` C ${f(s.c1.x)} ${f(s.c1.y)}, ${f(s.c2.x)} ${f(s.c2.y)}, ${f(s.b.x)} ${f(s.b.y)}`;
  return d;
}

/** مولّد أعداد شبه عشوائية ثابت (حتى لا تتغير الزينة بين مرة وأخرى) */
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
