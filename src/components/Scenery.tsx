import { memo } from "react";
import {
  intersects,
  rng,
  type Layout,
  type Rect,
  type Vec,
} from "../lib/mapLayout";

type DecoType =
  | "tree"
  | "pine"
  | "bush"
  | "rock"
  | "flowers"
  | "tuft"
  | "mushroom"
  | "house"
  | "windmill"
  | "fence"
  | "pond"
  | "direction"
  | "butterfly";
export interface Deco {
  t: DecoType;
  x: number;
  y: number;
  size: number;
  gold: boolean;
  flip: boolean;
  bounds: Rect;
}
// Small ground accents only; large landmarks get their own, widely spaced pass.
const DEFS: Array<{ t: DecoType; weight: number; size: [number, number] }> = [
  { t: "bush", weight: 1, size: [48, 64] },
  { t: "rock", weight: 1, size: [32, 44] },
  { t: "flowers", weight: 3, size: [30, 42] },
  { t: "tuft", weight: 6, size: [22, 32] },
  { t: "mushroom", weight: 0.5, size: [24, 30] },
  { t: "butterfly", weight: 0.2, size: [18, 24] },
];
function pick(r: number) {
  let target = r * DEFS.reduce((sum, d) => sum + d.weight, 0);
  for (const def of DEFS) {
    target -= def.weight;
    if (target <= 0) return def;
  }
  return DEFS[0];
}
export function riverX(bridge: Vec, y: number) {
  return bridge.x + Math.sin((y - bridge.y) / 74) * 22;
}

/** Calm, seeded scenery: one sparse landmark pass and one light grass-detail pass.
 * The same bounds are exposed to the automated acceptance tests (not just eyeballed).
 */
export function buildScenery(L: Layout, reserved: Rect[]) {
  const random = rng(Math.round(L.viewportW) * 7 + Math.round(L.H) * 11 + 13);
  const decos: Deco[] = [];
  const horizon = L.H * 0.27;
  const clear = (r: Rect) => {
    if (
      r.x < 4 ||
      r.x + r.w > L.W - 4 ||
      r.y < L.hudTop + 24 ||
      r.y + r.h < horizon + 40 ||
      r.y + r.h > L.H - L.hudBottom + 12
    )
      return false;
    if (reserved.some((box) => intersects(r, box, 9))) return false;
    if (decos.some((d) => intersects(r, d.bounds, 7))) return false;
    const padding = L.roadW / 2 + 12;
    if (
      L.samples.some(
        (p) =>
          p.x > r.x - padding &&
          p.x < r.x + r.w + padding &&
          p.y > r.y - padding &&
          p.y < r.y + r.h + padding,
      )
    )
      return false;
    if (
      L.rivers.some((b) => {
        const nearestY = Math.max(r.y, Math.min(b.y, r.y + r.h));
        const x = riverX(b, nearestY);
        return r.x < x + 64 && r.x + r.w > x - 64;
      })
    )
      return false;
    return true;
  };
  const place = (t: DecoType, x: number, y: number, size: number) => {
    const bounds = {
      x: x - size * 0.53,
      y: y - size * 1.09,
      w: size * 1.06,
      h: size * 1.17,
    };
    if (!clear(bounds)) return false;
    decos.push({
      t,
      x,
      y,
      size,
      bounds,
      gold: x < L.splitX,
      flip: random() > 0.5,
    });
    return true;
  };
  const first = L.nodes[0];
  const foregroundY = L.H - L.hudBottom - 24;
  // Keep a few recognizable landmarks without a row of competing silhouettes.
  place("windmill", first.x + 486, foregroundY, L.compact ? 118 : 148);
  place("tree", first.x - 330, foregroundY, 112);
  place("pond", first.x - 550, foregroundY - 14, L.compact ? 118 : 156);
  for (let x = 85; x < L.W - 60; x += L.compact ? 340 : 420) {
    const r = random();
    const type: DecoType = r < 0.52 ? "tree" : r < 0.83 ? "pine" : "house";
    place(type, x + (random() - 0.5) * 32, foregroundY, 100 + random() * 22);
  }
  // No dense fallback/fill pass: breathing room is intentional. Preserve the
  // original filled grass shapes and bright palette rather than fading the art.
  const step = L.compact ? 112 : 138;
  for (
    let y = horizon + 80, row = 0;
    y < foregroundY;
    y += step * 0.88, row++
  ) {
    for (let x = 30 + ((row % 2) * step) / 2; x < L.W; x += step) {
      if (random() > 0.66) continue;
      const px = x + (random() - 0.5) * step * 0.6;
      const py = y + (random() - 0.5) * step * 0.45;
      const def = pick(random());
      const size = def.size[0] + random() * (def.size[1] - def.size[0]);
      place(def.t, px, py, size);
    }
  }
  decos.sort((a, b) => a.y - b.y);
  return { decos, horizon };
}
export type Scenery = ReturnType<typeof buildScenery>;

/** Original meadow artwork and saturated palette, extended with the horizontal-world landmarks. */
export function SceneryDefs({ L }: { L: Layout }) {
  return (
    <>
      <linearGradient id="springGround" x2="0" y2="1">
        <stop stopColor="#97d56e" />
        <stop offset="1" stopColor="#a3dc78" />
      </linearGradient>
      <linearGradient id="goldGround" x2="0" y2="1">
        <stop stopColor="#f6d993" />
        <stop offset="1" stopColor="#e8bf68" />
      </linearGradient>
      <linearGradient id="springSky" x2="0" y2="1">
        <stop stopColor="#ccecff" />
        <stop offset="1" stopColor="#f1fbff" />
      </linearGradient>
      <linearGradient id="goldSky" x2="0" y2="1">
        <stop stopColor="#ffd2ae" />
        <stop offset="1" stopColor="#fff0c2" />
      </linearGradient>
      <linearGradient id="treeLeaves" x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#64c25c" />
        <stop offset="1" stopColor="#35995a" />
      </linearGradient>
      <linearGradient id="goldLeaves" x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#f2bf50" />
        <stop offset="1" stopColor="#bd7e2d" />
      </linearGradient>
      <linearGradient id="roof" x2="0" y2="1">
        <stop stopColor="#f39b62" />
        <stop offset="1" stopColor="#d77342" />
      </linearGradient>
      <linearGradient id="water" x2="1" y2=".5">
        <stop stopColor="#4fb3e3" />
        <stop offset=".5" stopColor="#7fd0f5" />
        <stop offset="1" stopColor="#45a9db" />
      </linearGradient>
      <pattern
        id="groundGrain"
        width="72"
        height="61"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="m9 12 2-4 2 4m30 34 2-3 2 3"
          stroke="#5e8263"
          strokeWidth="1"
          opacity=".16"
          fill="none"
        />
      </pattern>
      <clipPath id="springClip">
        <rect x={L.splitX} width={L.W - L.splitX + 200} height={L.H} />
      </clipPath>
      <clipPath id="goldClip">
        <rect x={-200} width={L.splitX + 200} height={L.H} />
      </clipPath>
      <g id="d-tree">
        <ellipse cx={0} cy={-3} rx={34} ry={8} fill="rgba(30,70,20,.22)" />
        <rect x={-7} y={-40} width={14} height={40} rx={5} fill="#9b6a3d" />
        <rect x={-7} y={-40} width={5} height={40} rx={3} fill="#b07c4a" />
        <circle cx={-22} cy={-56} r={22} fill="var(--leaf-deep, #3f9b49)" />
        <circle cx={22} cy={-56} r={22} fill="var(--leaf-deep, #3f9b49)" />
        <circle cx={0} cy={-74} r={30} fill="var(--leaf-mid, #46a84f)" />
        <circle cx={-9} cy={-84} r={13} fill="var(--leaf-light, #64c25c)" />
        <circle cx={14} cy={-66} r={8} fill="var(--leaf-highlight, #5bb955)" />
        <circle cx={-24} cy={-60} r={7} fill="var(--leaf-highlight, #5bb955)" />
      </g>

      <g id="d-pine">
        <ellipse cx={0} cy={-3} rx={26} ry={6} fill="rgba(30,70,20,.22)" />
        <rect x={-5} y={-22} width={10} height={22} rx={3} fill="#8a5b33" />
        <path
          d="M0 -100 L26 -56 L-26 -56 Z"
          fill="var(--leaf-deep, #2f8f50)"
          strokeLinejoin="round"
          stroke="var(--leaf-deep, #2f8f50)"
          strokeWidth={6}
        />
        <path
          d="M0 -78 L32 -30 L-32 -30 Z"
          fill="var(--leaf-mid, #35995a)"
          strokeLinejoin="round"
          stroke="var(--leaf-mid, #35995a)"
          strokeWidth={6}
        />
        <path d="M0 -100 L-12 -78 L0 -80 Z" fill="var(--leaf-light, #4db36d)" />
        <path d="M0 -78 L-14 -52 L0 -56 Z" fill="var(--leaf-light, #4db36d)" />
      </g>

      <g id="d-bush">
        <ellipse cx={0} cy={-4} rx={44} ry={9} fill="rgba(30,70,20,.2)" />
        <circle cx={-24} cy={-24} r={22} fill="var(--leaf-deep, #4aa94a)" />
        <circle cx={24} cy={-22} r={21} fill="var(--leaf-deep, #4aa94a)" />
        <circle cx={0} cy={-36} r={28} fill="var(--leaf-mid, #52b350)" />
        <circle cx={-8} cy={-48} r={12} fill="var(--leaf-light, #70c962)" />
        <circle cx={16} cy={-36} r={7} fill="var(--leaf-light, #70c962)" />
        <circle cx={-27} cy={-30} r={7} fill="var(--leaf-highlight, #68c25d)" />
      </g>

      <g id="d-rock">
        <ellipse cx={0} cy={-3} rx={42} ry={8} fill="rgba(30,70,20,.2)" />
        <path
          d="M-40 -4 Q-44 -34 -14 -44 Q12 -54 32 -36 Q46 -22 40 -4 Z"
          fill="#b9b2a5"
        />
        <path
          d="M-30 -20 Q-28 -38 -8 -42 Q8 -46 18 -38 Q-6 -36 -30 -20 Z"
          fill="#d8d2c6"
        />
        <path d="M-40 -4 Q-20 -12 40 -4 Z" fill="#9d9587" />
      </g>

      <g id="d-flowers">
        {[
          [-22, -16, "#ff8fb1"],
          [6, -26, "#ffd23f"],
          [26, -12, "#ffffff"],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path
              d={`M0 0 L0 ${16 + Number(y) * -0.2}`}
              stroke="var(--grass-b, #4c9e3f)"
              strokeWidth={3}
            />
            {[0, 72, 144, 216, 288].map((a) => (
              <circle
                key={a}
                cx={Math.cos((a * Math.PI) / 180) * 7}
                cy={Math.sin((a * Math.PI) / 180) * 7}
                r={6}
                fill={c as string}
              />
            ))}
            <circle r={4.5} fill="#ffb02e" />
          </g>
        ))}
        <ellipse
          cx={-6}
          cy={-3}
          rx={10}
          ry={4}
          fill="var(--grass-b, #4c9e3f)"
        />
        <ellipse cx={14} cy={-3} rx={9} ry={4} fill="var(--grass-b, #4c9e3f)" />
      </g>

      <g id="d-tuft">
        <path
          d="M-22 0 Q-24 -40 -6 -60 Q-12 -30 -8 0 Z"
          fill="var(--grass-a, #5db552)"
        />
        <path
          d="M-6 0 Q-2 -60 10 -90 Q8 -40 10 0 Z"
          fill="var(--grass-b, #4ea846)"
        />
        <path
          d="M8 0 Q20 -40 34 -56 Q22 -26 22 0 Z"
          fill="var(--grass-c, #62bd57)"
        />
      </g>

      <g id="d-mushroom">
        <ellipse cx={0} cy={-3} rx={30} ry={7} fill="rgba(30,70,20,.2)" />
        <rect x={-12} y={-46} width={24} height={46} rx={10} fill="#fff4de" />
        <path
          d="M-44 -40 Q-40 -96 0 -96 Q40 -96 44 -40 Q0 -30 -44 -40 Z"
          fill="#ff6a5c"
        />
        <circle cx={-18} cy={-70} r={8} fill="#fff" />
        <circle cx={14} cy={-80} r={6} fill="#fff" />
        <circle cx={22} cy={-56} r={5} fill="#fff" />
      </g>

      <g
        id="d-house"
        stroke="#7c7151"
        strokeWidth="1.25"
        strokeLinejoin="round"
      >
        <ellipse
          cy="1"
          rx="48"
          ry="7"
          fill="#355a40"
          opacity=".15"
          stroke="none"
        />
        <path d="M-38-61h76v58h-76Z" fill="#fff1d0" />
        <path d="M-5-59h43v56H-5Z" fill="#ebd4a4" stroke="none" />
        <path d="M20-91h10v28H20Z" fill="#c7a277" />
        <path d="m-50-57 50-45 50 45Z" fill="url(#roof)" />
        <path d="m-45-61 43-34 41 34" fill="none" stroke="#f1bba0" />
        <rect x="6" y="-35" width="18" height="32" rx="8" fill="#8aab9d" />
        <rect x="-28" y="-40" width="19" height="18" rx="3" fill="#bddbd2" />
        <path d="M-19-40v18m-9-9h19M15-16h2" />
        <path d="M3-1h24v4H3Z" fill="#a88d69" />
        <path d="M-30-18h23v4h-23Z" fill="#a88d69" />
        <path
          d="M-31-16q7-15 15-2 10-12 13 2"
          fill="#799c61"
          stroke="#688759"
        />
      </g>
      <g
        id="d-windmill"
        stroke="#7c7151"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        <ellipse
          cy="1"
          rx="39"
          ry="6"
          fill="#355a40"
          opacity=".14"
          stroke="none"
        />
        <path d="m-14-76-12 73h52L14-76Z" fill="#f3e8c5" />
        <path d="m-2-76-6 73h34L14-76Z" fill="#dfcfa5" stroke="none" />
        <path d="m-22-75 22-24 22 24Z" fill="url(#roof)" />
        <path d="M-8-1v-20a8 8 0 0 1 16 0v20" fill="#9ab4a1" />
        <g className="windmill-sails">
          <path
            d="m0-67-28-29-8 10 36 19-29 28 10 8L0-67l28 29 8-10L0-67l29-28-10-8Z"
            fill="#fff9df"
          />
          <path
            d="m0-67-30-23m30 23-23 30m23-30 30 23m-30-23 23-30"
            fill="none"
          />
          <circle cy="-67" r="4" fill="#a37a54" />
        </g>
      </g>
      <g id="d-fence" stroke="#8b7954" strokeWidth="1.5" strokeLinejoin="round">
        <ellipse
          cy="0"
          rx="48"
          ry="5"
          fill="#355a40"
          opacity=".1"
          stroke="none"
        />
        <path d="M-46-40h92v8h-92Zm0 20h92v8h-92Z" fill="#dac29a" />
        <path
          d="m-38 0-1-55 5-7 5 7v55Zm33 0V-55l5-7 5 7V0Zm34 0V-55l5-7 5 7V0Z"
          fill="#f4dfb8"
        />
      </g>
      <g id="d-pond" strokeWidth="1.1">
        <path
          d="M-49-27q-4-22 26-25 35-26 66 4 24 20-10 36-60 17-82-15Z"
          fill="#b2cb8f"
          stroke="#99b67b"
        />
        <path
          d="M-43-28q0-15 27-18 29-17 51 2 21 19-7 26-51 12-71-10Z"
          fill="url(#water)"
          stroke="#8bb4a4"
        />
        <path
          d="M-28-32h25m11 5h20m-32 5H8"
          stroke="#edf6de"
          strokeLinecap="round"
        />
        <ellipse cx="23" cy="-39" rx="9" ry="4" fill="#8ba76e" stroke="none" />
        <path d="m25-40 4-3" stroke="#f2edcf" />
        <path d="m-39-42-3-15m5 17 2-10" stroke="#769563" />
        <circle cx="-42" cy="-57" r="2" fill="#b99c68" stroke="none" />
      </g>
      <g
        id="d-direction"
        stroke="#88704c"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        <ellipse
          cy="0"
          rx="23"
          ry="4"
          fill="#355a40"
          opacity=".14"
          stroke="none"
        />
        <path d="M-4-85h8V0h-8Z" fill="#b89666" />
        <path d="M-39-72h63l19 14-19 14h-63Z" fill="#f3dfab" />
        <path d="M-21-63h43m-36 10h30" stroke="#998453" strokeWidth="2" />
      </g>
      <g id="d-butterfly" stroke="#8a795f" strokeWidth="1.7">
        <g className="butterfly-wings">
          <path
            d="M0-38q-45-44-43-8 0 16 32 13-22 25-2 29 16 3 13-34Z"
            fill="#edc08b"
          />
          <path
            d="M0-38q45-44 43-8 0 16-32 13 22 25 2 29-16 3-13-34Z"
            fill="#e6a798"
          />
        </g>
        <path d="M0-42v30m0-30-5-8m5 8 5-8" fill="none" />
      </g>
      <g id="d-cloud" fill="#fffef0" stroke="#d3e2cf" strokeWidth=".6">
        <path d="M-47-10c-14-11-4-28 9-25-3-23 30-32 39-12 19-17 45-4 39 15 23-3 31 20 14 25-17 4-85 4-101-3Z" />
      </g>
    </>
  );
}

export const FarLayer = memo(function FarLayer({ L }: { L: Layout }) {
  const h = L.H * 0.27;
  const chunks = Array.from(
    { length: Math.ceil(L.W / 660) + 2 },
    (_, i) => i * 660 - 400,
  );
  return (
    <g className="far-landscape">
      <rect width={L.W} height={L.H} fill="url(#springSky)" />
      <rect width={L.splitX} height={L.H} fill="url(#goldSky)" />
      <circle
        cx={L.splitX - 520}
        cy={h * 0.45}
        r="45"
        fill="#f5d69a"
        opacity=".65"
      />
      <g className="parallax-hills">
        {chunks.map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} ${h + 42}q150-160 320-45 160-160 340 20v120H${x}Z`}
              fill={x < L.splitX ? "#dbaf58" : "#7dba62"}
              stroke={x < L.splitX ? "#ca9c49" : "#69a953"}
              strokeWidth="1"
            />
            <path
              d={`M${x - 100} ${h + 64}q200-96 360-18 170-112 370 12v110H${x - 100}Z`}
              fill={x < L.splitX ? "#edc66e" : "#91ce70"}
            />
            <path
              d={`M${x} ${h + 96}q150-50 330-10 130-60 320 14v100H${x}Z`}
              fill={x < L.splitX ? "#f4d486" : "#a4da7c"}
            />
            {i % 2 === 0 && (
              <use
                href="#d-cloud"
                transform={`translate(${x + 260} ${h * 0.47}) scale(1.1 .8)`}
                className="cloud-drift"
              />
            )}
            <path
              d={`m${x + 120} ${h * 0.53}q5-7 11 0 5-7 11 0m38-15q4-6 9 0 4-6 9 0`}
              stroke="#75958b"
              strokeWidth="1.6"
              fill="none"
              opacity=".65"
              className="bird-glide"
            />
          </g>
        ))}
      </g>
    </g>
  );
});

export const GroundLayer = memo(function GroundLayer({ L }: { L: Layout }) {
  const y = L.H * 0.27 + 58;
  const groundPath = `M0 ${y} Q${L.W * 0.25} ${y - 36} ${L.W * 0.5} ${y + 4} T${L.W} ${y} V${L.H}H0Z`;
  return (
    <g>
      <path d={groundPath} fill="url(#springGround)" />
      <path d={groundPath} fill="url(#goldGround)" clipPath="url(#goldClip)" />
      <path d={groundPath} fill="url(#groundGrain)" />
      {Array.from({ length: Math.ceil(L.W / 550) }, (_, i) => (
        <ellipse
          key={i}
          cx={i * 550 + 130}
          cy={L.H * (0.67 + (i % 3) * 0.11)}
          rx={115 + (i % 4) * 18}
          ry={24}
          fill={i * 550 < L.splitX ? "#ffe6a1" : "#b4e48a"}
          opacity=".55"
        />
      ))}
      {L.rivers.map((b, i) => {
        const points = Array.from({ length: 18 }, (_, n) => {
          const py = y + (n * (L.H - y + 40)) / 17;
          return `${riverX(b, py).toFixed(1)},${py.toFixed(1)}`;
        }).join(" ");
        return (
          <g key={i} fill="none" strokeLinejoin="round" strokeLinecap="round">
            <polyline
              points={points}
              stroke="#7fb957"
              strokeWidth={L.compact ? 65 : 81}
            />
            <polyline
              points={points}
              stroke="url(#water)"
              strokeWidth={L.compact ? 52 : 66}
            />
            <polyline
              points={points}
              stroke="#edf8e6"
              strokeWidth="2"
              strokeDasharray="12 51"
              opacity=".7"
              className="river-ripple"
            />
            {[0.67, 0.85].map((k) => (
              <g
                key={k}
                transform={`translate(${riverX(b, L.H * k)} ${L.H * k})`}
              >
                <ellipse rx="11" ry="5" fill="#88aa78" stroke="none" />
                <path d="m0 0 11-2" stroke="#d9e9c2" strokeWidth="2" />
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
});

/** Horizontal planks and raised rails; rotation follows the tangent where road meets water. */
export function Bridge({ L }: { L: Layout }) {
  return (
    <g>
      {L.rivers.map((b, i) => {
        const near = L.samples.filter((p) => Math.abs(p.x - b.x) < 30);
        const angle =
          near.length > 1
            ? (Math.atan(
                (near[0].y - near[near.length - 1].y) /
                  (near[0].x - near[near.length - 1].x),
              ) *
                180) /
              Math.PI
            : 0;
        const w = L.compact ? 108 : 132,
          h = L.roadW + 8;
        return (
          <g
            key={i}
            transform={`translate(${b.x} ${b.y}) rotate(${angle})`}
            stroke="#8f7951"
            strokeWidth="1.4"
            strokeLinejoin="round"
          >
            <rect
              x={-w / 2}
              y={-h / 2 + 8}
              width={w}
              height={h}
              rx="5"
              fill="#496747"
              opacity=".18"
              stroke="none"
            />
            <rect
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              rx="4"
              fill="#c98d52"
            />
            {Array.from({ length: 11 }, (_, n) => (
              <path
                key={n}
                d={`M${-w / 2 + (n * w) / 10} ${-h / 2 + 2}v${h - 4}`}
              />
            ))}
            {[-1, 1].map((s) => (
              <g key={s}>
                <rect
                  x={-w / 2 - 5}
                  y={(s * h) / 2 - 4}
                  width={w + 10}
                  height="6"
                  rx="3"
                  fill="#8c5a2b"
                />
                {[-w / 2, 0, w / 2].map((x) => (
                  <rect
                    key={x}
                    x={x - 3}
                    y={(s * h) / 2 - 13}
                    width="6"
                    height="17"
                    rx="2"
                    fill="#a7703c"
                  />
                ))}
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

export const DecoLayer = memo(function DecoLayer({ S }: { S: Scenery }) {
  return (
    <g className="decos">
      {S.decos.map((d, i) => (
        <g
          key={i}
          className={d.gold ? "gold-deco" : undefined}
          style={d.gold ? { color: "#b78f4b" } : undefined}
        >
          <use
            href={`#d-${d.t}`}
            transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${(d.flip ? -d.size : d.size) / 100} ${d.size / 100})`}
          />
        </g>
      ))}
    </g>
  );
});

export function StartVillage({ L }: { L: Layout }) {
  const { x, y } = L.start;
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke="#7e7752"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <ellipse
        cy="15"
        rx="64"
        ry="13"
        fill="#43684a"
        opacity=".16"
        stroke="none"
      />
      <path
        d="M-52 13v-89q0-48 52-48t52 48v89H37v-89q0-32-37-32t-37 32v89Z"
        fill="#c9ae7b"
      />
      <path
        d="M-49-20v-57q0-42 49-42t49 42v57"
        fill="none"
        stroke="#e6d4a2"
        strokeWidth="4"
      />
      <path d="M-63-2h30v15h-30Zm96 0h30v15H33Z" fill="#b6b58a" />
      <path
        d="M-54-86q-20 11-9 24 16 2 12-16m102-13q20 11 9 24-16 2-12-16"
        fill="#82a267"
        stroke="#66855b"
      />
      <path d="M-11-131v-41" fill="none" />
      <path d="M-10-171h42l-9 12 9 12h-42Z" fill="#ffc93c" stroke="#a96a15" />
      <rect x="-74" y="-91" width="148" height="30" rx="9" fill="#fff4d4" />
      <text
        y="-71"
        textAnchor="middle"
        fill="#53654c"
        stroke="none"
        fontFamily="Tajawal"
        fontSize="16"
        fontWeight="700"
        direction="rtl"
      >
        نقطة الانطلاق
      </text>
      <path d="M-14-40q14-6 28 0M-12-34h24" stroke="#9f8b5d" opacity=".4" />
    </g>
  );
}

export function WorldGate({ L }: { L: Layout }) {
  return (
    <g
      transform={`translate(${L.gate.x} ${L.gate.y})`}
      stroke="#92825c"
      strokeWidth="1.4"
    >
      <ellipse
        cy="11"
        rx="67"
        ry="12"
        fill="#5f6245"
        opacity=".14"
        stroke="none"
      />
      {[-1, 1].map((s) => (
        <g key={s} transform={`translate(${s * 58} 0)`}>
          <rect x="-9" y="-54" width="18" height="65" rx="5" fill="#dfd1a0" />
          <circle cy="-61" r="13" fill="#f3e6b8" />
          <path d="m-5-61 5-6 5 6-5 6Z" fill="#b9a76e" stroke="none" />
        </g>
      ))}
      <path
        d="M-49-41q49-48 98 0"
        fill="none"
        stroke="#cfb980"
        strokeWidth="9"
      />
      <path
        d="M-49-41q49-48 98 0"
        fill="none"
        stroke="#f0deb0"
        strokeWidth="4"
      />
    </g>
  );
}
