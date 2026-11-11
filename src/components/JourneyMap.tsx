import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LEVELS, MILESTONES, SESSIONS, type LevelId } from "../data/sessions";
import { isLevelComplete, statusOf, type ProgressState } from "../lib/progress";
import { Character } from "./Character";
import { LockIcon } from "./icons";
import { Station, type LabelSide } from "./Station";

/** نمط التعرّج اللطيف للطريق (نسبة من عرض الخارطة) */
const PATTERN = [0.5, 0.76, 0.5, 0.24];

interface Pt {
  x: number;
  y: number;
}

interface StationNode extends Pt {
  kind: "station";
  id: number;
  i: number;
}
interface MilestoneNode extends Pt {
  kind: "milestone";
  level: LevelId;
}
type MapNode = StationNode | MilestoneNode;

interface Zone {
  level: LevelId;
  top: number;
  bottom: number;
  bannerH: number;
}

function computeLayout(W: number) {
  const wide = W >= 620;
  const rowH = wide ? 134 : 122;
  const bannerH = wide ? 340 : 350;
  const milestoneH = wide ? 280 : 270;

  const nodes: MapNode[] = [];
  const pts: Pt[] = [];
  const zones: Zone[] = [];
  let y = 0;

  LEVELS.forEach((level, li) => {
    const top = y;
    // الطريق يبدأ من أسفل لافتة المنطقة الأولى، ويمرّ عبر "بوابة" المنطقة الثانية
    pts.push({ x: W / 2, y: li === 0 ? top + bannerH - 24 : top + 40 });
    y += bannerH;

    SESSIONS.filter((s) => s.level === level.id).forEach((s, i) => {
      const p = { x: Math.round(W * PATTERN[i % 4]), y: Math.round(y + rowH / 2 + i * rowH) };
      nodes.push({ kind: "station", id: s.id, i, ...p });
      pts.push(p);
    });
    y += 16 * rowH;

    const m = { x: W / 2, y: Math.round(y + milestoneH * 0.36) };
    nodes.push({ kind: "milestone", level: level.id, ...m });
    pts.push(m);
    y += milestoneH;

    zones.push({ level: level.id, top, bottom: y, bannerH });
  });

  return { W, H: y, wide, rowH, nodes, pts, zones };
}

function toPath(pts: Pt[]) {
  if (!pts.length) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const dy = b.y - a.y;
    d += ` C ${a.x} ${a.y + dy * 0.55}, ${b.x} ${b.y - dy * 0.55}, ${b.x} ${b.y}`;
  }
  return d;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Props {
  progress: ProgressState;
  unlockingId: number | null;
  justCompletedId: number | null;
  zone2Entering: boolean;
  onOpenStation: (id: number) => void;
  onStart: (id: number) => void;
  onOpenMilestone: (level: LevelId) => void;
}

export function JourneyMap({
  progress,
  unlockingId,
  justCompletedId,
  zone2Entering,
  onOpenStation,
  onStart,
  onOpenMilestone,
}: Props) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const layout = useMemo(() => (W ? computeLayout(W) : null), [W]);
  const completed = progress.completed;
  const [intro, setIntro] = useState(true);
  const revealRef = useRef<SVGPathElement>(null);
  const [revealLen, setRevealLen] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const d = useMemo(() => (layout ? toPath(layout.pts) : ""), [layout]);

  // الجزء المقطوع من الطريق (حتى المحطة الحالية)
  const traveledD = useMemo(() => {
    if (!layout) return "";
    if (completed >= 32) return d;
    const currentId = completed + 1;
    const idx = layout.pts.findIndex((p) =>
      layout.nodes.some((n) => n.kind === "station" && n.id === currentId && n.x === p.x && n.y === p.y),
    );
    return idx > 0 ? toPath(layout.pts.slice(0, idx + 1)) : "";
  }, [layout, completed, d]);

  useLayoutEffect(() => {
    if (revealRef.current) setRevealLen(revealRef.current.getTotalLength());
  }, [d]);

  if (!layout) return <div ref={wrapRef} className="map-wrap" style={{ minHeight: "100vh" }} />;

  const { H, wide, zones, nodes } = layout;
  const stationSize = wide ? 72 : 60;
  const currentSize = wide ? 86 : 72;
  const zoneSplit = zones[0].bottom / H;
  const lailaH = wide ? 124 : 96;
  const charsH = wide ? 150 : 104;

  const currentNode = nodes.find((n) => n.kind === "station" && n.id === completed + 1) as StationNode | undefined;

  const labelSideOf = (n: StationNode): LabelSide => {
    const f = PATTERN[n.i % 4];
    if (f > 0.5) return "left";
    if (f < 0.5) return "right";
    return n.i % 4 === 0 ? "left" : "right";
  };

  const labelWidthOf = (n: StationNode, size: number, side: LabelSide) => {
    const room = side === "left" ? n.x - size / 2 - 16 : W - n.x - size / 2 - 16;
    return Math.max(110, Math.min(wide ? 250 : 190, room));
  };

  return (
    <div ref={wrapRef} className={`map-wrap ${intro ? "is-intro" : ""}`}>
      <div className="map" style={{ height: H }}>
        {/* ── خلفيات المنطقتين ── */}
        {zones.map((z) => {
          const level = LEVELS.find((l) => l.id === z.level)!;
          const zoneLocked = z.level === 2 && completed < 16;
          return (
            <section
              key={z.level}
              className={`zone zone-${z.level} ${zoneLocked ? "is-locked" : ""}`}
              style={{ top: z.top, height: z.bottom - z.top }}
              aria-label={`${level.shortName}: ${level.name}`}
            >
              <div className="zone-deco" aria-hidden="true" />
              {z.level === 2 && <div className="zone-hills" aria-hidden="true" />}
            </section>
          );
        })}

        {/* ── الطريق ── */}
        <svg className="road" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs>
            <linearGradient id="roadGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
              <stop offset="0" stopColor="#bfe0fb" />
              <stop offset={zoneSplit - 0.02} stopColor="#bfe0fb" />
              <stop offset={zoneSplit + 0.02} stopColor="#e9d3f7" />
              <stop offset="1" stopColor="#e9d3f7" />
            </linearGradient>
            <linearGradient id="travGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
              <stop offset="0" stopColor="#ffc93c" />
              <stop offset={zoneSplit} stopColor="#ffb02e" />
              <stop offset="1" stopColor="#ff8f3d" />
            </linearGradient>
            <mask id="roadReveal" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <path
                ref={revealRef}
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth={60}
                strokeLinecap="round"
                className={revealLen ? "road-reveal" : ""}
                style={
                  {
                    strokeDasharray: revealLen || undefined,
                    opacity: revealLen ? 1 : 0,
                    "--len": revealLen,
                  } as React.CSSProperties
                }
              />
            </mask>
          </defs>
          <g mask="url(#roadReveal)">
            <path d={d} className="road-edge" />
            <path d={d} className="road-base" stroke="url(#roadGrad)" />
            <path d={d} className="road-dash" />
            {traveledD && <path d={traveledD} className="road-traveled" stroke="url(#travGrad)" />}
          </g>
        </svg>

        {/* ── لافتات المنطقتين ── */}
        {zones.map((z) => {
          const level = LEVELS.find((l) => l.id === z.level)!;
          const unlocked = z.level === 1 || completed >= 16;
          const done = isLevelComplete(z.level, completed);
          const doneInLevel = Math.max(0, Math.min(16, completed - (level.first - 1)));
          return (
            <div
              key={`banner-${z.level}`}
              className={`zone-banner zone-banner-${z.level} ${unlocked ? "" : "is-locked"} ${
                z.level === 2 && zone2Entering ? "is-entering" : ""
              }`}
              style={{ top: z.top + 12 }}
            >
              <div
                className="banner-chars"
                style={{ "--chars-h": `${charsH}px`, "--chars-overlap": `${Math.round(charsH * 0.2)}px` } as React.CSSProperties}
              >
                {z.level === 1 ? (
                  <div className="banner-char banner-char--sister">
                    <Character who="sisterWave" height={charsH} className="float-soft" />
                    <div className="speech speech--sister">سأرافقك من أول خطوة!</div>
                  </div>
                ) : (
                  <>
                    <div className="banner-char banner-char--laila">
                      <Character who="laila" height={charsH} />
                    </div>
                    <div className="banner-char banner-char--sami">
                      <Character who="sami" height={charsH} />
                    </div>
                  </>
                )}
              </div>
              <div className="banner-card">
                <span className="banner-tag">
                  {level.shortName} · الحصص {level.first}–{level.last}
                </span>
                <h2 className="banner-title">{level.name}</h2>
                <p className="banner-tagline">{level.tagline}</p>
                <div className="banner-status">
                  {!unlocked ? (
                    <span className="pill pill-locked">
                      <LockIcon size={16} /> تُفتح بعد إتمام المستوى الأول
                    </span>
                  ) : done ? (
                    <span className="pill pill-done">✓ مكتمل — 16 / 16</span>
                  ) : (
                    <span className="pill pill-progress">
                      {doneInLevel} / 16 محطة مكتملة
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* علامة الانطلاق */}
        <div className="start-flag" style={{ left: layout.pts[0].x, top: layout.pts[0].y }} aria-hidden="true">
          🚩 نقطة الانطلاق
        </div>

        {/* ── المحطات ── */}
        {nodes.map((n, idx) => {
          if (n.kind === "station") {
            const session = SESSIONS[n.id - 1];
            const status = statusOf(n.id, completed);
            const size = status === "current" ? currentSize : stationSize;
            const side = labelSideOf(n);
            return (
              <Station
                key={n.id}
                session={session}
                status={unlockingId === n.id ? "current" : status}
                x={n.x}
                y={n.y}
                size={size}
                labelSide={side}
                labelWidth={labelWidthOf(n, size, side)}
                unlocking={unlockingId === n.id}
                justCompleted={justCompletedId === n.id}
                introDelay={300 + idx * 55}
                onOpen={onOpenStation}
                onStart={onStart}
              />
            );
          }
          const m = MILESTONES.find((mm) => mm.level === n.level)!;
          const achieved = isLevelComplete(n.level, completed);
          return (
            <div
              key={`m-${n.level}`}
              className={`milestone ${achieved ? "is-achieved" : "is-pending"} level-${n.level}`}
              style={{ left: n.x, top: n.y, "--intro-delay": `${300 + idx * 55}ms` } as React.CSSProperties}
            >
              <button
                type="button"
                className="milestone-btn"
                onClick={() => onOpenMilestone(n.level)}
                aria-label={`محطة إنجاز: ${m.title} — ${achieved ? "تم الإنجاز" : "لم تُفتح بعد"}`}
              >
                <span className="milestone-rays" aria-hidden="true" />
                <span className="milestone-badge">
                  <span className="milestone-icon" aria-hidden="true">
                    {m.icon}
                  </span>
                  {!achieved && (
                    <span className="milestone-lock" aria-hidden="true">
                      <LockIcon size={20} />
                    </span>
                  )}
                </span>
                <span className="milestone-ribbon">{m.title}</span>
              </button>
              <div className={`milestone-char ${n.level === 2 ? "is-other-side" : ""}`}>
                <div className="speech speech--sami">{achieved ? "أحسنت! 🎉" : "سأنتظرك هنا! 💪"}</div>
                <Character
                  who={achieved ? "samiCheer" : "sami"}
                  height={wide ? 150 : 100}
                  className={achieved ? "hop-once" : ""}
                />
              </div>
            </div>
          );
        })}

        {/* ── ليلى تشير إلى المحطة الحالية ── */}
        {currentNode && !unlockingId && (() => {
          const side = labelSideOf(currentNode);
          const lailaW = Math.round(lailaH * (310 / 720));
          // ليلى تقف في الجهة الفارغة المقابلة لعنوان المحطة
          const onRight = side === "left";
          const left = onRight ? currentNode.x + currentSize / 2 + 8 : currentNode.x - currentSize / 2 - 8 - lailaW;
          return (
            <div
              className="laila-guide"
              style={{ left: Math.max(4, Math.min(W - lailaW - 4, left)), top: currentNode.y - lailaH * 0.3 }}
              aria-hidden="true"
            >
              <Character who="lailaPoint" height={lailaH} flip={onRight} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
