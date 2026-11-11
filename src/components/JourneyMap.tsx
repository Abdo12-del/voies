import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LEVELS, MILESTONES, SESSIONS, type LevelId } from "../data/sessions";
import { computeLayout, segsToPath, type Layout, type MapNode, type Rect } from "../lib/mapLayout";
import { isLevelComplete, statusOf, type ProgressState } from "../lib/progress";
import { Character } from "./Character";
import { LockIcon } from "./icons";
import { Bridge, DecoLayer, GroundLayer, SceneryDefs, buildScenery, zone2Shape } from "./Scenery";
import { Station } from "./Station";

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

/** موضع عنوان المحطة: يُزاح نحو الداخل في أطراف الصفوف كي لا يغطي منعطف الطريق */
function labelShiftOf(n: MapNode, L: Layout) {
  if (!n.rowEnd) return 0;
  const inward = n.x > L.W / 2 ? -1 : 1;
  return inward * (L.labelW / 2 - 30);
}

/** الجهة التي تقف فيها ليلى بجانب المحطة الحالية */
function lailaSideOf(n: MapNode, L: Layout): 1 | -1 {
  if (!n.rowEnd) return 1;
  return n.x > L.W / 2 ? 1 : -1;
}

function reservedRects(L: Layout): Rect[] {
  const out: Rect[] = [L.startArea, L.gateArea];
  for (const n of L.nodes) {
    if (n.kind === "station") {
      const top = n.y + L.currentSize / 2 + 4;
      const cx = n.x + labelShiftOf(n, L);
      out.push({ x: cx - L.labelW / 2 - 6, y: top, w: L.labelW + 12, h: L.wide ? 64 : 60 });
      // مكان ليلى المحتمل
      const side = lailaSideOf(n, L);
      const lw = L.wide ? 60 : 46;
      const lx = n.x + side * (L.currentSize / 2 + 4) - (side < 0 ? lw : 0);
      out.push({ x: lx, y: n.y - (L.wide ? 120 : 96), w: lw, h: L.wide ? 120 : 96 });
    } else {
      const s = L.milestoneSize;
      out.push({ x: n.x - 130, y: n.y + s / 2 - 4, w: 260, h: 54 });
      out.push({ x: n.x + s / 2, y: n.y - (L.wide ? 150 : 110), w: L.wide ? 130 : 90, h: L.wide ? 190 : 150 });
      out.push({ x: n.x - s, y: n.y - s, w: s * 2, h: s * 1.6 });
    }
  }
  return out;
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
  const L = useMemo(() => (W ? computeLayout(W) : null), [W]);
  const scenery = useMemo(() => (L ? buildScenery(L, reservedRects(L)) : null), [L]);
  const completed = progress.completed;
  const [intro, setIntro] = useState(true);
  const revealRef = useRef<SVGPathElement>(null);
  const [revealLen, setRevealLen] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3200);
    return () => clearTimeout(t);
  }, []);

  const d = useMemo(() => (L ? segsToPath(L.segs) : ""), [L]);

  // الجزء المقطوع من الطريق حتى المحطة الحالية
  const traveledD = useMemo(() => {
    if (!L) return "";
    if (completed >= 32) return d;
    const idx = L.nodes.findIndex((n) => n.kind === "station" && n.id === completed + 1);
    return idx >= 0 ? segsToPath(L.segs.slice(0, idx + 1)) : "";
  }, [L, completed, d]);

  useLayoutEffect(() => {
    if (revealRef.current) setRevealLen(revealRef.current.getTotalLength());
  }, [d]);

  if (!L || !scenery) return <div ref={wrapRef} className="map-wrap" style={{ minHeight: "100vh" }} />;

  const { H, wide, nodes } = L;
  const zone2Locked = completed < 16;
  const lailaH = wide ? 118 : 92;
  const charsH = wide ? 120 : 88;
  const currentNode = nodes.find((n) => n.kind === "station" && n.id === completed + 1);
  const splitPct = L.zoneSplitY / H;

  return (
    <div ref={wrapRef} className={`map-wrap ${intro ? "is-intro" : ""}`}>
      <div className={`map ${wide ? "is-wide" : "is-compact"}`} style={{ height: H }}>
        <svg className="scene" width={L.W} height={H} viewBox={`0 0 ${L.W} ${H}`} aria-hidden="true">
          <defs>
            <SceneryDefs L={L} />
            <linearGradient id="roadEdge" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
              <stop offset="0" stopColor="#8d74e0" />
              <stop offset={splitPct} stopColor="#8d74e0" />
              <stop offset={splitPct + 0.001} stopColor="#dcb978" />
              <stop offset="1" stopColor="#dcb978" />
            </linearGradient>
            <linearGradient id="roadBase" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
              <stop offset="0" stopColor="#e2d9fd" />
              <stop offset={splitPct} stopColor="#e2d9fd" />
              <stop offset={splitPct + 0.001} stopColor="#fdf0d2" />
              <stop offset="1" stopColor="#fdf0d2" />
            </linearGradient>
            <mask id="roadReveal" maskUnits="userSpaceOnUse" x="0" y="0" width={L.W} height={H}>
              <path
                ref={revealRef}
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth={L.roadW + 40}
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

          <GroundLayer L={L} S={scenery} />

          <g mask="url(#roadReveal)">
            <path d={d} className="road-shadow" strokeWidth={L.roadW + 12} />
            <path d={d} className="road-edge" stroke="url(#roadEdge)" strokeWidth={L.roadW + 10} />
            <path d={d} className="road-base" stroke="url(#roadBase)" strokeWidth={L.roadW} />
            <path d={d} className="road-dash" />
            {traveledD && <path d={traveledD} className="road-traveled" />}
          </g>

          <Bridge L={L} />
          <DecoLayer S={scenery} />

          {zone2Locked && <path d={zone2Shape(L)} className="zone-veil" />}
        </svg>

        {/* ── بداية الرحلة: لافتة المستوى الأول والأخت الصغيرة ── */}
        <ZoneIntro
          level={1}
          rect={L.startArea}
          completed={completed}
          charsH={charsH}
          wide={wide}
          entering={false}
        />

        {/* ── بوابة المستوى الثاني ── */}
        <ZoneIntro
          level={2}
          rect={L.gateArea}
          completed={completed}
          charsH={charsH}
          wide={wide}
          entering={zone2Entering}
        />

        {/* ── المحطات ومحطات الإنجاز ── */}
        {nodes.map((n, idx) => {
          if (n.kind === "station") {
            const session = SESSIONS[n.id - 1];
            const status = statusOf(n.id, completed);
            const size = status === "current" || unlockingId === n.id ? L.currentSize : L.stationSize;
            return (
              <Station
                key={n.id}
                session={session}
                status={unlockingId === n.id ? "current" : status}
                x={n.x}
                y={n.y}
                size={size}
                labelShift={labelShiftOf(n, L)}
                labelWidth={L.labelW}
                unlocking={unlockingId === n.id}
                justCompleted={justCompletedId === n.id}
                introDelay={250 + idx * 60}
                onOpen={onOpenStation}
                onStart={onStart}
              />
            );
          }
          const m = MILESTONES.find((mm) => mm.level === n.level)!;
          const achieved = isLevelComplete(n.level, completed);
          const samiH = wide ? 140 : 100;
          return (
            <div
              key={`m-${n.level}`}
              className={`milestone ${achieved ? "is-achieved" : "is-pending"} level-${n.level}`}
              style={
                {
                  left: n.x,
                  top: n.y,
                  "--msize": `${L.milestoneSize}px`,
                  "--intro-delay": `${250 + idx * 60}ms`,
                } as React.CSSProperties
              }
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
              <div className="milestone-char">
                <div className="speech speech--sami">{achieved ? "أحسنت! 🎉" : "سأنتظرك هنا! 💪"}</div>
                <Character who={achieved ? "samiCheer" : "sami"} height={samiH} className={achieved ? "hop-once" : ""} />
              </div>
            </div>
          );
        })}

        {/* ── ليلى تشير إلى المحطة الحالية ── */}
        {currentNode && !unlockingId && (() => {
          const side = lailaSideOf(currentNode, L);
          const lailaW = Math.round(lailaH * (310 / 720));
          const left = currentNode.x + side * (L.currentSize / 2 + 4) - (side < 0 ? lailaW : 0);
          return (
            <div
              key={currentNode.id}
              className="laila-guide"
              style={{ left: Math.max(2, Math.min(L.W - lailaW - 2, left)), top: currentNode.y - lailaH * 0.86 }}
              aria-hidden="true"
            >
              <Character who="lailaPoint" height={lailaH} flip={side > 0} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function ZoneIntro({
  level,
  rect,
  completed,
  charsH,
  wide,
  entering,
}: {
  level: LevelId;
  rect: Rect;
  completed: number;
  charsH: number;
  wide: boolean;
  entering: boolean;
}) {
  const info = LEVELS.find((l) => l.id === level)!;
  const unlocked = level === 1 || completed >= 16;
  const done = isLevelComplete(level, completed);
  const doneInLevel = Math.max(0, Math.min(16, completed - (info.first - 1)));

  return (
    <div
      className={`zone-intro zone-intro-${level} ${unlocked ? "" : "is-locked"} ${entering ? "is-entering" : ""} ${
        wide ? "is-wide" : ""
      }`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      <div className="zone-intro-inner">
        <div className="zone-chars" style={{ height: charsH }}>
          {level === 1 ? (
            <div className="zone-char zone-char--sister">
              <div className="speech speech--sister">سأرافقك من أول خطوة!</div>
              <Character who="sisterWave" height={charsH} className="float-soft" />
            </div>
          ) : (
            <>
              <div className="zone-char zone-char--laila">
                <Character who="laila" height={charsH} />
              </div>
              <div className="zone-char zone-char--sami">
                <Character who="sami" height={charsH} />
              </div>
            </>
          )}
        </div>
        <div className="zone-sign">
          <span className="zone-sign-tag">
            {info.shortName} · الحصص {info.first}–{info.last}
          </span>
          <h2 className="zone-sign-title">{info.name}</h2>
          <div className="zone-sign-status">
            {!unlocked ? (
              <span className="pill pill-locked">
                <LockIcon size={15} /> يُفتح بعد إتمام المستوى الأول
              </span>
            ) : done ? (
              <span className="pill pill-done">✓ مكتمل — 16 / 16</span>
            ) : (
              <span className="pill pill-progress">{doneInLevel} / 16 محطة مكتملة</span>
            )}
          </div>
        </div>
        {level === 1 && <div className="start-tag">🚩 نقطة الانطلاق</div>}
      </div>
    </div>
  );
}
