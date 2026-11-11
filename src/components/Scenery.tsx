import { memo } from "react";
import { rng, type Layout, type Rect, type Vec } from "../lib/mapLayout";

/**
 * خلفية الخارطة المرسومة: المرج الأخضر (المستوى الأول) وأرض الأحلام البنفسجية (المستوى الثاني)،
 * مع النهر والجسر والأشجار والشجيرات والزهور والبالونات… كلها رسومات SVG خفيفة.
 * كل عنصر مرسوم في صندوق 100×100 ونقطة ارتكازه أسفل المنتصف (0,0).
 */

type DecoType =
  | "tree"
  | "pine"
  | "bush"
  | "rock"
  | "flowers"
  | "tuft"
  | "mushroom"
  | "ptree"
  | "pbush"
  | "balloons"
  | "gift"
  | "candy"
  | "lolly"
  | "sparkle"
  | "pflowers"
  | "mic"
  | "cloud";

interface DecoDef {
  t: DecoType;
  w: number;
  size: [number, number];
  /** ارتفاع مركز التصادم كنسبة من الحجم (للعناصر الطويلة) */
  cy: number;
  /** نصف قطر التصادم كنسبة من الحجم */
  cr: number;
}

const ZONE1: DecoDef[] = [
  { t: "tree", w: 3, size: [84, 108], cy: 0.55, cr: 0.36 },
  { t: "pine", w: 1.6, size: [74, 96], cy: 0.5, cr: 0.3 },
  { t: "bush", w: 4, size: [58, 80], cy: 0.3, cr: 0.42 },
  { t: "rock", w: 1.6, size: [36, 54], cy: 0.3, cr: 0.42 },
  { t: "flowers", w: 4, size: [30, 42], cy: 0.3, cr: 0.45 },
  { t: "tuft", w: 3, size: [22, 32], cy: 0.3, cr: 0.45 },
  { t: "mushroom", w: 1, size: [28, 38], cy: 0.4, cr: 0.4 },
];

const ZONE2: DecoDef[] = [
  { t: "ptree", w: 2.6, size: [84, 108], cy: 0.55, cr: 0.36 },
  { t: "pbush", w: 3.6, size: [58, 80], cy: 0.3, cr: 0.42 },
  { t: "lolly", w: 1.6, size: [56, 76], cy: 0.55, cr: 0.32 },
  { t: "balloons", w: 1.3, size: [62, 82], cy: 0.6, cr: 0.36 },
  { t: "gift", w: 1.2, size: [40, 54], cy: 0.4, cr: 0.42 },
  { t: "candy", w: 1.2, size: [40, 56], cy: 0.5, cr: 0.34 },
  { t: "sparkle", w: 2.6, size: [18, 28], cy: 0.5, cr: 0.5 },
  { t: "pflowers", w: 3.4, size: [30, 42], cy: 0.3, cr: 0.45 },
  { t: "mic", w: 0.9, size: [50, 66], cy: 0.5, cr: 0.3 },
];

interface Deco {
  t: DecoType;
  x: number;
  y: number;
  s: number;
  flip: boolean;
}

interface Patch {
  x: number;
  y: number;
  rx: number;
  ry: number;
  zone: 1 | 2;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

function pick(defs: DecoDef[], r: number) {
  const total = defs.reduce((a, d) => a + d.w, 0);
  let acc = r * total;
  for (const d of defs) {
    acc -= d.w;
    if (acc <= 0) return d;
  }
  return defs[defs.length - 1];
}

function inRect(x: number, y: number, r: number, R: Rect) {
  return x + r > R.x && x - r < R.x + R.w && y + r > R.y && y - r < R.y + R.h;
}

export function buildScenery(L: Layout, reserved: Rect[]) {
  const { W, H, samples, nodes, roadW, river, zoneSplitY } = L;
  const rand = rng(Math.round(W) * 7 + 13);
  const decos: Deco[] = [];
  const placed: Circle[] = [];

  const stationCircles: Circle[] = nodes.map((n) => ({
    x: n.x,
    y: n.y,
    r: (n.kind === "milestone" ? L.milestoneSize : L.currentSize) / 2 + 26,
  }));

  const riverY = (x: number) => river.y + river.amp * Math.sin((x - river.bridge.x) / river.period);

  const clear = (x: number, y: number, r: number, zone: 1 | 2) => {
    if (x - r * 0.6 < 0 || x + r * 0.6 > W) return false;
    // لا زينة فوق الطريق
    const rr = roadW / 2 + r + 4;
    for (let i = 0; i < samples.length; i += 2) {
      const p = samples[i];
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < rr * rr) return false;
    }
    for (const c of stationCircles) {
      const dx = c.x - x;
      const dy = c.y - y;
      const m = c.r + r;
      if (dx * dx + dy * dy < m * m) return false;
    }
    for (const R of reserved) if (inRect(x, y, r, R)) return false;
    if (zone === 1 && Math.abs(y - riverY(x)) < river.width / 2 + r + 6) return false;
    // لا عناصر على حدّ المنطقتين مباشرة
    if (Math.abs(y - zoneSplitY) < r + 10) return false;
    for (const c of placed) {
      const dx = c.x - x;
      const dy = c.y - y;
      const m = (c.r + r) * 0.92;
      if (dx * dx + dy * dy < m * m) return false;
    }
    return true;
  };

  // ── شبكة مرتّبة مع اهتزاز عشوائي ثابت ──
  const step = L.wide ? 78 : 64;
  for (let gy = 40; gy < H - 10; gy += step * 0.82) {
    const row = Math.round(gy / step);
    for (let gx = (row % 2) * (step / 2) + 10; gx < W; gx += step) {
      const x = gx + (rand() - 0.5) * step * 0.8;
      const y = gy + (rand() - 0.5) * step * 0.7;
      const zone: 1 | 2 = y > zoneSplitY ? 1 : 2;
      const def = pick(zone === 1 ? ZONE1 : ZONE2, rand());
      const size = def.size[0] + rand() * (def.size[1] - def.size[0]);
      const r = size * def.cr;
      const cy = y - size * def.cy;
      if (rand() > 0.86) continue;
      if (!clear(x, cy, r, zone)) {
        // جرّب عنصرًا صغيرًا في المكان نفسه
        const small = zone === 1 ? (rand() > 0.5 ? ZONE1[4] : ZONE1[5]) : rand() > 0.5 ? ZONE2[6] : ZONE2[7];
        const ss = small.size[0] + rand() * (small.size[1] - small.size[0]);
        const sr = ss * small.cr;
        const scy = y - ss * small.cy;
        if (!clear(x, scy, sr, zone)) continue;
        decos.push({ t: small.t, x, y, s: ss / 100, flip: rand() > 0.5 });
        placed.push({ x, y: scy, r: sr });
        continue;
      }
      decos.push({ t: def.t, x, y, s: size / 100, flip: rand() > 0.5 });
      placed.push({ x, y: cy, r });
    }
  }
  decos.sort((a, b) => a.y - b.y);

  // بقع العشب الفاتحة على الأرض
  const patches: Patch[] = [];
  const pr = rng(Math.round(W) + 99);
  for (let y = 60; y < H; y += L.wide ? 150 : 120) {
    const count = L.wide ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const x = ((i + pr()) / count) * W;
      const yy = y + (pr() - 0.5) * 90;
      patches.push({
        x,
        y: yy,
        rx: 50 + pr() * (L.wide ? 110 : 70),
        ry: 18 + pr() * 26,
        zone: yy > zoneSplitY ? 1 : 2,
      });
    }
  }

  // أوراق الزنبق على النهر
  const pads: Vec[] = [];
  for (let x = 30 + pr() * 60; x < W - 20; x += (L.wide ? 170 : 120) + pr() * 90) {
    if (Math.abs(x - river.bridge.x) < roadW + 40) continue;
    pads.push({ x, y: riverY(x) + (pr() - 0.5) * river.width * 0.4 });
  }

  // سحب ونجوم في سماء المستوى الثاني
  const sky: Deco[] = [];
  const sr = rng(Math.round(W) + 7);
  for (let i = 0; i < (L.wide ? 6 : 3); i++) {
    const x = 30 + sr() * (W - 60);
    const y = 30 + sr() * 120;
    sky.push({ t: "cloud", x, y, s: (L.wide ? 0.9 : 0.6) + sr() * 0.5, flip: sr() > 0.5 });
  }

  return { decos, patches, pads, sky, riverY };
}

type Scenery = ReturnType<typeof buildScenery>;

function riverPath(L: Layout, riverY: (x: number) => number) {
  let d = `M -20 ${riverY(-20).toFixed(1)}`;
  for (let x = 0; x <= L.W + 20; x += 12) d += ` L ${x} ${riverY(x).toFixed(1)}`;
  return d;
}

export function zone2Shape(L: Layout) {
  const { W, zoneSplitY: y } = L;
  let d = `M 0 0 H ${W} V ${y}`;
  const waves = Math.max(3, Math.round(W / 140));
  const step = W / waves;
  for (let i = 0; i < waves; i++) {
    const x0 = W - i * step;
    d += ` Q ${x0 - step / 2} ${y + (i % 2 ? -22 : 22)}, ${x0 - step} ${y}`;
  }
  return d + " Z";
}

/** الطبقة السفلية: الأرض والبقع والنهر (تُرسم تحت الطريق) */
export const GroundLayer = memo(function GroundLayer({ L, S }: { L: Layout; S: Scenery }) {
  return (
    <g className="ground">
      <rect x={0} y={0} width={L.W} height={L.H} fill="url(#z1ground)" />
      {S.patches
        .filter((p) => p.zone === 1)
        .map((p, i) => (
          <ellipse key={`p1-${i}`} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#b4e48a" opacity={0.55} />
        ))}
      {/* النهر */}
      <g className="river">
        <path d={riverPath(L, S.riverY)} stroke="#d8f0a6" strokeWidth={L.river.width + 16} fill="none" />
        <path d={riverPath(L, S.riverY)} stroke="#4fb3e3" strokeWidth={L.river.width} fill="none" />
        <path d={riverPath(L, S.riverY)} stroke="#7fd0f5" strokeWidth={L.river.width - 16} fill="none" />
        <path
          d={riverPath(L, S.riverY)}
          stroke="#ffffff"
          strokeWidth={3}
          strokeDasharray="18 46"
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
          className="river-ripple"
        />
        {S.pads.map((p, i) => (
          <g key={`pad-${i}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <ellipse rx={13} ry={7} fill="#5cbf55" />
            <path d="M0 0 L12 -3 L12 3 Z" fill="#7fd0f5" />
          </g>
        ))}
      </g>

      {/* أرض المستوى الثاني */}
      <path d={zone2Shape(L)} fill="url(#z2ground)" />
      <path d={zone2Shape(L)} fill="none" stroke="#9a83ea" strokeWidth={0} />
      {S.patches
        .filter((p) => p.zone === 2)
        .map((p, i) => (
          <ellipse key={`p2-${i}`} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#c7b8fa" opacity={0.6} />
        ))}
      {S.sky.map((d, i) => (
        <use key={`sky-${i}`} href="#d-cloud" transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${d.s.toFixed(2)})`} />
      ))}
    </g>
  );
});

/** الجسر الخشبي فوق النهر (يُرسم فوق الطريق) */
export function Bridge({ L }: { L: Layout }) {
  const { bridge, width } = L.river;
  const w = L.roadW + 18;
  const h = width + 30;
  const planks = [];
  for (let y = -h / 2 + 4; y < h / 2 - 4; y += 9) planks.push(y);
  return (
    <g className="bridge" transform={`translate(${bridge.x.toFixed(1)} ${bridge.y.toFixed(1)})`}>
      <rect x={-w / 2 + 2} y={-h / 2 + 6} width={w} height={h} rx={6} fill="rgba(30,60,90,.25)" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="#c98d52" />
      {planks.map((y) => (
        <line key={y} x1={-w / 2 + 3} x2={w / 2 - 3} y1={y} y2={y} stroke="#a7703c" strokeWidth={2} />
      ))}
      <rect x={-w / 2 - 5} y={-h / 2 - 4} width={8} height={h + 8} rx={4} fill="#8c5a2b" />
      <rect x={w / 2 - 3} y={-h / 2 - 4} width={8} height={h + 8} rx={4} fill="#8c5a2b" />
      {[-h / 2 - 6, h / 2 - 4].map((y) => (
        <g key={y}>
          <rect x={-w / 2 - 8} y={y} width={14} height={12} rx={4} fill="#7a4b22" />
          <rect x={w / 2 - 6} y={y} width={14} height={12} rx={4} fill="#7a4b22" />
        </g>
      ))}
    </g>
  );
}

/** الطبقة العليا: الأشجار والشجيرات والزينة (فوق الطريق، لكنها لا تلامسه) */
export const DecoLayer = memo(function DecoLayer({ S }: { S: Scenery }) {
  return (
    <g className="decos">
      {S.decos.map((d, i) => (
        <use
          key={i}
          href={`#d-${d.t}`}
          transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${(d.flip ? -d.s : d.s).toFixed(3)} ${d.s.toFixed(3)})`}
        />
      ))}
    </g>
  );
});

/** تعريفات رسومات الزينة */
export function SceneryDefs({ L }: { L: Layout }) {
  return (
    <>
      <linearGradient id="z1ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#97d56e" />
        <stop offset="1" stopColor="#a3dc78" />
      </linearGradient>
      <linearGradient id="z2ground" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={L.zoneSplitY}>
        <stop offset="0" stopColor="#a993ef" />
        <stop offset="1" stopColor="#b6a3f4" />
      </linearGradient>

      {/* ظل أرضي مشترك */}
      <ellipse id="d-shadow" cx={0} cy={-3} rx={40} ry={8} fill="rgba(30,70,20,.2)" />

      <g id="d-tree">
        <ellipse cx={0} cy={-3} rx={34} ry={8} fill="rgba(30,70,20,.22)" />
        <rect x={-7} y={-40} width={14} height={40} rx={5} fill="#9b6a3d" />
        <rect x={-7} y={-40} width={5} height={40} rx={3} fill="#b07c4a" />
        <circle cx={-22} cy={-56} r={22} fill="#3f9b49" />
        <circle cx={22} cy={-56} r={22} fill="#3f9b49" />
        <circle cx={0} cy={-74} r={30} fill="#46a84f" />
        <circle cx={-9} cy={-84} r={13} fill="#64c25c" />
        <circle cx={14} cy={-66} r={8} fill="#5bb955" />
        <circle cx={-24} cy={-60} r={7} fill="#5bb955" />
      </g>

      <g id="d-pine">
        <ellipse cx={0} cy={-3} rx={26} ry={6} fill="rgba(30,70,20,.22)" />
        <rect x={-5} y={-22} width={10} height={22} rx={3} fill="#8a5b33" />
        <path d="M0 -100 L26 -56 L-26 -56 Z" fill="#2f8f50" strokeLinejoin="round" stroke="#2f8f50" strokeWidth={6} />
        <path d="M0 -78 L32 -30 L-32 -30 Z" fill="#35995a" strokeLinejoin="round" stroke="#35995a" strokeWidth={6} />
        <path d="M0 -100 L-12 -78 L0 -80 Z" fill="#4db36d" />
        <path d="M0 -78 L-14 -52 L0 -56 Z" fill="#4db36d" />
      </g>

      <g id="d-bush">
        <ellipse cx={0} cy={-4} rx={44} ry={9} fill="rgba(30,70,20,.2)" />
        <circle cx={-24} cy={-24} r={22} fill="#4aa94a" />
        <circle cx={24} cy={-22} r={21} fill="#4aa94a" />
        <circle cx={0} cy={-36} r={28} fill="#52b350" />
        <circle cx={-8} cy={-48} r={12} fill="#70c962" />
        <circle cx={16} cy={-36} r={7} fill="#70c962" />
        <circle cx={-27} cy={-30} r={7} fill="#68c25d" />
      </g>

      <g id="d-rock">
        <ellipse cx={0} cy={-3} rx={42} ry={8} fill="rgba(30,70,20,.2)" />
        <path d="M-40 -4 Q-44 -34 -14 -44 Q12 -54 32 -36 Q46 -22 40 -4 Z" fill="#b9b2a5" />
        <path d="M-30 -20 Q-28 -38 -8 -42 Q8 -46 18 -38 Q-6 -36 -30 -20 Z" fill="#d8d2c6" />
        <path d="M-40 -4 Q-20 -12 40 -4 Z" fill="#9d9587" />
      </g>

      <g id="d-flowers">
        {[
          [-22, -16, "#ff8fb1"],
          [6, -26, "#ffd23f"],
          [26, -12, "#ffffff"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M0 0 L0 ${16 + Number(y) * -0.2}`} stroke="#4c9e3f" strokeWidth={3} />
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={Math.sin((a * Math.PI) / 180) * 7} r={6} fill={c as string} />
            ))}
            <circle r={4.5} fill="#ffb02e" />
          </g>
        ))}
        <ellipse cx={-6} cy={-3} rx={10} ry={4} fill="#4c9e3f" />
        <ellipse cx={14} cy={-3} rx={9} ry={4} fill="#4c9e3f" />
      </g>

      <g id="d-tuft">
        <path d="M-22 0 Q-24 -40 -6 -60 Q-12 -30 -8 0 Z" fill="#5db552" />
        <path d="M-6 0 Q-2 -60 10 -90 Q8 -40 10 0 Z" fill="#4ea846" />
        <path d="M8 0 Q20 -40 34 -56 Q22 -26 22 0 Z" fill="#62bd57" />
      </g>

      <g id="d-mushroom">
        <ellipse cx={0} cy={-3} rx={30} ry={7} fill="rgba(30,70,20,.2)" />
        <rect x={-12} y={-46} width={24} height={46} rx={10} fill="#fff4de" />
        <path d="M-44 -40 Q-40 -96 0 -96 Q40 -96 44 -40 Q0 -30 -44 -40 Z" fill="#ff6a5c" />
        <circle cx={-18} cy={-70} r={8} fill="#fff" />
        <circle cx={14} cy={-80} r={6} fill="#fff" />
        <circle cx={22} cy={-56} r={5} fill="#fff" />
      </g>

      {/* ── المستوى الثاني ── */}
      <g id="d-ptree">
        <ellipse cx={0} cy={-3} rx={34} ry={8} fill="rgba(60,30,110,.22)" />
        <rect x={-7} y={-40} width={14} height={40} rx={5} fill="#8a6a9e" />
        <circle cx={-22} cy={-56} r={22} fill="#8b6fe0" />
        <circle cx={22} cy={-56} r={22} fill="#8b6fe0" />
        <circle cx={0} cy={-74} r={30} fill="#977ce8" />
        <circle cx={-9} cy={-84} r={13} fill="#b7a2f6" />
        <circle cx={14} cy={-66} r={8} fill="#ad98f3" />
        <circle cx={-6} cy={-60} r={5} fill="#ff9fc4" />
        <circle cx={18} cy={-86} r={4} fill="#ff9fc4" />
      </g>

      <g id="d-pbush">
        <ellipse cx={0} cy={-4} rx={44} ry={9} fill="rgba(60,30,110,.2)" />
        <circle cx={-24} cy={-24} r={22} fill="#8d72e3" />
        <circle cx={24} cy={-22} r={21} fill="#8d72e3" />
        <circle cx={0} cy={-36} r={28} fill="#9a80ea" />
        <circle cx={-8} cy={-48} r={12} fill="#bca9f7" />
        <circle cx={16} cy={-36} r={7} fill="#bca9f7" />
      </g>

      <g id="d-lolly">
        <ellipse cx={0} cy={-3} rx={18} ry={5} fill="rgba(60,30,110,.2)" />
        <rect x={-3.5} y={-58} width={7} height={58} rx={3} fill="#fff" />
        <circle cx={0} cy={-74} r={24} fill="#ff8fb8" />
        <path d="M0 -74 m-14 0 a14 14 0 1 1 28 0 a9 9 0 1 1 -18 0 a4 4 0 1 1 8 0" stroke="#fff" strokeWidth={5} fill="none" />
      </g>

      <g id="d-balloons">
        <path d="M-16 -50 Q-6 -20 0 0 M18 -58 Q8 -24 0 0 M2 -72 Q-4 -30 0 0" stroke="#ffffff" strokeWidth={2} fill="none" />
        <ellipse cx={-18} cy={-66} rx={15} ry={18} fill="#ffd23f" />
        <ellipse cx={20} cy={-72} rx={15} ry={18} fill="#ff8fb1" />
        <ellipse cx={2} cy={-88} rx={16} ry={19} fill="#7cc7ff" />
        <ellipse cx={-23} cy={-72} rx={4} ry={6} fill="#fff" opacity={0.6} />
        <ellipse cx={15} cy={-78} rx={4} ry={6} fill="#fff" opacity={0.6} />
        <ellipse cx={-3} cy={-95} rx={4} ry={6} fill="#fff" opacity={0.6} />
      </g>

      <g id="d-gift">
        <ellipse cx={0} cy={-3} rx={40} ry={8} fill="rgba(60,30,110,.22)" />
        <rect x={-34} y={-58} width={68} height={56} rx={6} fill="#ff8fb1" />
        <rect x={-38} y={-70} width={76} height={18} rx={5} fill="#ffa5c3" />
        <rect x={-7} y={-70} width={14} height={68} fill="#ffd23f" />
        <path d="M0 -70 Q-26 -96 -22 -76 Q-18 -68 0 -70 Q18 -68 22 -76 Q26 -96 0 -70 Z" fill="#ffd23f" />
      </g>

      <g id="d-candy">
        <ellipse cx={0} cy={-3} rx={20} ry={5} fill="rgba(60,30,110,.2)" />
        <path d="M6 0 L6 -70 Q6 -96 -16 -96 Q-34 -96 -34 -76" stroke="#ffffff" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path
          d="M6 0 L6 -70 Q6 -96 -16 -96 Q-34 -96 -34 -76"
          stroke="#ff6f91"
          strokeWidth={14}
          fill="none"
          strokeDasharray="10 10"
        />
      </g>

      <g id="d-sparkle">
        <path d="M0 -100 Q6 -56 50 -50 Q6 -44 0 0 Q-6 -44 -50 -50 Q-6 -56 0 -100 Z" fill="#fff6b8" />
      </g>

      <g id="d-pflowers">
        {[
          [-22, -16, "#ffffff"],
          [6, -26, "#ff9fc4"],
          [26, -12, "#ffe27a"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 0 L0 14" stroke="#7a5bc9" strokeWidth={3} />
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={Math.sin((a * Math.PI) / 180) * 7} r={6} fill={c as string} />
            ))}
            <circle r={4.5} fill="#8b5cf6" />
          </g>
        ))}
      </g>

      {/* ميكروفون على حامل — رمز البرنامج */}
      <g id="d-mic">
        <ellipse cx={0} cy={-3} rx={26} ry={6} fill="rgba(60,30,110,.22)" />
        <rect x={-20} y={-8} width={40} height={8} rx={4} fill="#5b4a8a" />
        <rect x={-3} y={-70} width={6} height={64} rx={3} fill="#6d5ca3" />
        <rect x={-13} y={-100} width={26} height={36} rx={13} fill="#e9e4f7" />
        <rect x={-13} y={-100} width={26} height={36} rx={13} fill="url(#micMesh)" />
        <rect x={-15} y={-70} width={30} height={7} rx={3.5} fill="#ffc93c" />
      </g>
      <pattern id="micMesh" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.2" fill="#b8aedb" />
      </pattern>

      <g id="d-cloud">
        <ellipse cx={0} cy={-20} rx={46} ry={16} fill="#ffffff" opacity={0.75} />
        <circle cx={-14} cy={-30} r={18} fill="#ffffff" opacity={0.75} />
        <circle cx={12} cy={-34} r={22} fill="#ffffff" opacity={0.75} />
      </g>
    </>
  );
}
