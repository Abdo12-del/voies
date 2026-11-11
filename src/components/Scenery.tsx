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
const DEFS: Array<{ t: DecoType; weight: number; size: [number, number] }> = [
  { t: "tree", weight: 5, size: [100, 142] },
  { t: "pine", weight: 2, size: [96, 128] },
  { t: "bush", weight: 5, size: [56, 80] },
  { t: "rock", weight: 2, size: [38, 62] },
  { t: "flowers", weight: 6, size: [46, 68] },
  { t: "tuft", weight: 4, size: [20, 32] },
  { t: "mushroom", weight: 1.2, size: [24, 36] },
  { t: "house", weight: 1.5, size: [118, 145] },
  { t: "windmill", weight: 0.4, size: [148, 175] },
  { t: "fence", weight: 1.2, size: [84, 110] },
  { t: "pond", weight: 0.5, size: [150, 180] },
  { t: "direction", weight: 0.6, size: [66, 82] },
  { t: "butterfly", weight: 0.5, size: [20, 28] },
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

/** Jittered stratified sampling, two density passes, exact AABBs + sampled Bézier clearance.
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
      r.y < 83 ||
      r.y + r.h < horizon + 40 ||
      r.y + r.h > L.H - 8
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
  // Distinct landmarks, still subject to exactly the same collision checks as every flower.
  place("windmill", first.x + 486, L.H - 35, L.compact ? 128 : 162);
  place("house", first.x + 656, L.H * 0.7, 118);
  place("tree", first.x + 320, L.H - 24, 118);
  place("tree", first.x - 330, L.H - 24, 132);
  place("pond", first.x - 530, L.H - 34, L.compact ? 128 : 178);
  // Large silhouettes first; otherwise small flowers greedily consume every tree-sized pocket.
  for (let x = 85; x < L.W - 60; x += L.compact ? 177 : 205) {
    for (const y of [horizon + 108, L.H - 25, L.H * 0.79]) {
      const r = random();
      const type: DecoType =
        r < 0.52 ? "tree" : r < 0.72 ? "pine" : r < 0.89 ? "house" : "fence";
      place(
        type,
        x + (random() - 0.5) * 30,
        y,
        (type === "fence" ? 92 : 108) + random() * 24,
      );
    }
  }
  const step = L.compact ? 78 : 94;
  for (let y = horizon + 80, row = 0; y < L.H - 12; y += step * 0.77, row++) {
    for (let x = 30 + ((row % 2) * step) / 2; x < L.W; x += step) {
      const px = x + (random() - 0.5) * step * 0.65;
      const py = y + (random() - 0.5) * step * 0.5;
      const def = pick(random());
      const size =
        (def.size[0] + random() * (def.size[1] - def.size[0])) *
        (L.compact ? 0.86 : 1);
      if (!place(def.t, px, py, size)) {
        place(random() > 0.42 ? "flowers" : "tuft", px, py, 28 + random() * 20);
      }
    }
  }
  // Fill only genuinely empty pockets, never force an item onto the road or a label.
  for (let y = horizon + 46; y < L.H - 18; y += 51) {
    for (let x = 34; x < L.W - 20; x += 69) {
      if (random() < 0.45)
        place(
          random() > 0.5 ? "flowers" : "tuft",
          x + random() * 16,
          y,
          20 + random() * 16,
        );
    }
  }
  decos.sort((a, b) => a.y - b.y);
  return { decos, horizon };
}
export type Scenery = ReturnType<typeof buildScenery>;

/** Kept as reusable definitions from the original scene; extended rather than rasterized. */
export function SceneryDefs({ L }: { L: Layout }) {
  return (
    <>
      <linearGradient id="springGround" x2="0" y2="1">
        <stop stopColor="#e2edc5" />
        <stop offset="1" stopColor="#c2dda4" />
      </linearGradient>
      <linearGradient id="goldGround" x2="0" y2="1">
        <stop stopColor="#f5e9bd" />
        <stop offset="1" stopColor="#e4cf97" />
      </linearGradient>
      <linearGradient id="springSky" x2="0" y2="1">
        <stop stopColor="#e0f2ef" />
        <stop offset="1" stopColor="#f5f6df" />
      </linearGradient>
      <linearGradient id="goldSky" x2="0" y2="1">
        <stop stopColor="#fae5cf" />
        <stop offset="1" stopColor="#fff3d2" />
      </linearGradient>
      <linearGradient id="treeLeaves" x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#91bb77" />
        <stop offset="1" stopColor="#51876c" />
      </linearGradient>
      <linearGradient id="goldLeaves" x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#e6c470" />
        <stop offset="1" stopColor="#ad8547" />
      </linearGradient>
      <linearGradient id="roof" x2="0" y2="1">
        <stop stopColor="#db9477" />
        <stop offset="1" stopColor="#b96f56" />
      </linearGradient>
      <linearGradient id="water" x2="1" y2=".5">
        <stop stopColor="#93ced0" />
        <stop offset=".5" stopColor="#badfd5" />
        <stop offset="1" stopColor="#81bec3" />
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
      <g id="d-tree" stroke="#456750" strokeWidth="1.2" strokeLinejoin="round">
        <ellipse
          cx="0"
          cy="-1"
          rx="35"
          ry="7"
          fill="#355a40"
          opacity=".14"
          stroke="none"
        />
        <path d="M-6-44h12L8-3Q0 2-8-3Z" fill="#b28861" />
        <path
          d="m0-12 1-34m0 12-12-11m12 7 13-12"
          fill="none"
          stroke="#816749"
        />
        <path
          d="M-32-43C-53-47-48-75-31-79c-4-29 29-36 41-21 20-8 34 4 30 21 22 5 18 34-1 38-13 11-27 8-39 3-10 7-21 4-32-5Z"
          fill="url(#treeLeaves)"
        />
        <path
          d="M-34-72q-5-13 9-20m6-5q12-10 24-2"
          stroke="#c4dba4"
          strokeWidth="3"
          opacity=".65"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M17-59q12 0 18-8" fill="none" opacity=".4" />
      </g>
      <g id="d-pine" stroke="#456750" strokeWidth="1.2" strokeLinejoin="round">
        <ellipse
          cy="-1"
          rx="28"
          ry="6"
          fill="#355a40"
          opacity=".14"
          stroke="none"
        />
        <path d="M-5-29H5V0H-5Z" fill="#aa805a" />
        <path
          d="m0-106 25 40H15l20 28H23l18 20H-41l18-20h-12l20-28h-10Z"
          fill="url(#treeLeaves)"
        />
        <path
          d="m-17-68 13-23m-18 47L-8-61m-16 34 13-17"
          stroke="#b9d9a2"
          opacity=".6"
          strokeWidth="2"
        />
      </g>
      <g id="d-bush" stroke="#54764f" strokeWidth="1.6">
        <ellipse
          cy="-1"
          rx="44"
          ry="6"
          fill="#355a40"
          opacity=".13"
          stroke="none"
        />
        <path
          d="M-43-8c-10-21 8-37 22-32 4-24 37-28 45-4 23-7 34 22 17 36Z"
          fill="url(#treeLeaves)"
        />
        <path
          d="M-30-27q6-11 17-9M-6-45q11-8 19 1"
          stroke="#c2dba0"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="17" cy="-20" r="2.5" fill="#d99379" stroke="none" />
        <circle cx="25" cy="-17" r="2" fill="#d99379" stroke="none" />
      </g>
      <g id="d-rock">
        <ellipse cy="0" rx="42" ry="6" fill="#355a40" opacity=".13" />
        <path
          d="M-40-4q-4-30 26-40 26-10 46 8 14 14 8 32Z"
          fill="#a5b0a0"
          stroke="#667a69"
          strokeWidth="1.8"
        />
        <path d="m-30-19 21-21 22 2-13 21Z" fill="#c8cdb7" />
        <path d="m0-17 13-21 18 7" fill="none" stroke="#8f9b88" />
      </g>
      <g id="d-flowers" stroke="#648953" strokeWidth="2" strokeLinecap="round">
        <path d="M-22-1v-27M4-1v-39M27-1v-21" />
        <path d="m-22-8-10-7m36 3 12-8" />
        {[
          [-22, -28, "#e4a08d"],
          [4, -40, "#fff9de"],
          [27, -22, "#edc86c"],
        ].map(([x, y, color], i) => (
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            stroke="#a98e5b"
            strokeWidth=".6"
          >
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                transform={`rotate(${a})`}
                cy="-6"
                rx="4.2"
                ry="6"
                fill={color as string}
              />
            ))}
            <circle r="3.3" fill="#d5ab51" />
          </g>
        ))}
      </g>
      <g
        id="d-tuft"
        stroke="#67935b"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M-19-1q-4-22-15-28M-3-2q-3-32 3-49M13-1q3-22 19-31" />
      </g>
      <g id="d-mushroom" stroke="#8f7050" strokeWidth="2">
        <ellipse
          cy="0"
          rx="30"
          ry="6"
          fill="#355a40"
          opacity=".12"
          stroke="none"
        />
        <path d="M-10-45h20L14-3Q0 3-14-3Z" fill="#fff4d9" />
        <path d="M-43-43q3-53 43-53t43 53q-43 15-86 0Z" fill="#d68f77" />
        <circle cx="-18" cy="-69" r="8" fill="#fff5da" stroke="none" />
        <circle cx="13" cy="-80" r="6" fill="#fff5da" stroke="none" />
        <circle cx="25" cy="-55" r="5" fill="#fff5da" stroke="none" />
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
              fill={x < L.splitX ? "#e3ce9c" : "#bcd6b2"}
              stroke={x < L.splitX ? "#d9c18d" : "#accba7"}
              strokeWidth="1"
            />
            <path
              d={`M${x - 100} ${h + 64}q200-96 360-18 170-112 370 12v110H${x - 100}Z`}
              fill={x < L.splitX ? "#e9d8aa" : "#cbdfb3"}
            />
            <path
              d={`M${x} ${h + 96}q150-50 330-10 130-60 320 14v100H${x}Z`}
              fill={x < L.splitX ? "#efdfb2" : "#d8e7bc"}
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
      {Array.from({ length: Math.ceil(L.W / 350) }, (_, i) => (
        <ellipse
          key={i}
          cx={i * 350 + 130}
          cy={L.H * (0.67 + (i % 3) * 0.11)}
          rx={115 + (i % 4) * 18}
          ry={24}
          fill={i * 350 < L.splitX ? "#f5e8bd" : "#e4eecb"}
          opacity=".4"
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
              stroke="#aac39a"
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
              fill="#d0b086"
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
                  fill="#b89361"
                />
                {[-w / 2, 0, w / 2].map((x) => (
                  <rect
                    key={x}
                    x={x - 3}
                    y={(s * h) / 2 - 13}
                    width="6"
                    height="17"
                    rx="2"
                    fill="#c5a175"
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
      <path d="M-10-171h42l-9 12 9 12h-42Z" fill="#7ea98d" stroke="#527b65" />
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
