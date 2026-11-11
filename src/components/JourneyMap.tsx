import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { getLevel, MILESTONES, SESSIONS, type LevelId } from "../data/sessions";
import {
  computeLayout,
  currentCardRect,
  guideRect,
  labelRect,
  reservedRects,
  samiRect,
  segsToPath,
  sisterRect,
  sisterSpeechRect,
  type Layout,
  type Rect,
  type Vec,
} from "../lib/mapLayout";
import {
  currentSessionId,
  isLevelComplete,
  statusOf,
  type ProgressState,
} from "../lib/progress";
import { Character } from "./Character";
import {
  Bridge,
  buildScenery,
  DecoLayer,
  FarLayer,
  GroundLayer,
  SceneryDefs,
  StartVillage,
  WorldGate,
} from "./Scenery";
import { Station } from "./Station";
import { Icon } from "./icons";

interface Props {
  progress: ProgressState;
  unlockingId: number | null;
  justCompletedId: number | null;
  zone2Entering: boolean;
  onOpenStation: (id: number) => void;
  onStart: (id: number) => void;
  onOpenMilestone: (id: LevelId) => void;
  onVisibleLevel: (id: LevelId) => void;
}
export interface JourneyMapHandle {
  goToCurrent: (smooth?: boolean) => void;
  goToLevel: (id: LevelId) => void;
  goToMilestone: (id: LevelId) => void;
}
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const boxStyle = (r: Rect): CSSProperties => ({
  left: r.x,
  top: r.y,
  width: r.w,
  height: r.h,
});

export const JourneyMap = forwardRef<JourneyMapHandle, Props>(
  function JourneyMap(
    {
      progress,
      unlockingId,
      justCompletedId,
      zone2Entering,
      onOpenStation,
      onStart,
      onOpenMilestone,
      onVisibleLevel,
    },
    ref,
  ) {
    const viewport = useRef<HTMLDivElement>(null);
    const world = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [crossing, setCrossing] = useState(false);
    const [edges, setEdges] = useState({ left: false, right: false });
    const visibleLevel = useRef<LevelId>(1);
    const crossingTimer = useRef<ReturnType<typeof setTimeout>>();
    const frame = useRef(0);
    const bootstrapped = useRef("");
    const drag = useRef<{
      x: number;
      left: number;
      active: boolean;
      moved: boolean;
    } | null>(null);
    const currentId = currentSessionId(progress.completed);

    useLayoutEffect(() => {
      const el = viewport.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        setSize((old) =>
          old.w === Math.round(width) && old.h === Math.round(height)
            ? old
            : { w: Math.round(width), h: Math.round(height) },
        );
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);
    const L = useMemo(
      () => (size.w && size.h ? computeLayout(size.w, size.h) : null),
      [size],
    );
    const S = useMemo(
      () => (L ? buildScenery(L, reservedRects(L, currentId)) : null),
      [L, currentId],
    );
    const road = useMemo(() => (L ? segsToPath(L.segs) : ""), [L]);
    const traveled = useMemo(() => {
      if (!L || progress.completed === 0) return "";
      if (progress.completed === 32) return road;
      const target = L.nodes.find(
        (n) => n.kind === "station" && n.id === progress.completed + 1,
      )!;
      return segsToPath(L.segs.filter((s) => s.b.x >= target.x));
    }, [L, progress.completed, road]);

    const center = useCallback(
      (point: Vec | undefined, smooth = true) => {
        if (point && viewport.current && L)
          viewport.current.scrollTo({
            left: point.x - L.viewportW / 2,
            top: 0,
            behavior: smooth && !reducedMotion() ? "smooth" : "instant",
          });
      },
      [L],
    );
    const goCurrent = useCallback(
      (smooth = true) =>
        center(
          L?.nodes.find((n) =>
            currentId
              ? n.kind === "station" && n.id === currentId
              : n.kind === "milestone" && n.level === 2,
          ),
          smooth,
        ),
      [L, currentId, center],
    );
    useImperativeHandle(
      ref,
      () => ({
        goToCurrent: goCurrent,
        goToLevel: (id) =>
          center(
            L?.nodes.find(
              (n) => n.kind === "station" && n.id === (id === 1 ? 1 : 17),
            ),
          ),
        goToMilestone: (id) =>
          center(
            L?.nodes.find((n) => n.kind === "milestone" && n.level === id),
          ),
      }),
      [L, center, goCurrent],
    );

    useLayoutEffect(() => {
      if (!L || progress.loading) return;
      const key = `${L.W}:${L.H}:${progress.studentId ?? "guest"}`;
      if (bootstrapped.current === key) return;
      bootstrapped.current = key;
      const target = L.nodes.find((n) =>
        progress.pendingCelebration
          ? n.kind === "milestone" && n.level === progress.pendingCelebration
          : currentId
            ? n.kind === "station" && n.id === currentId
            : n.kind === "milestone" && n.level === 2,
      );
      if (!target || !viewport.current) return;
      viewport.current.scrollLeft =
        target.x - L.viewportW / 2 + (reducedMotion() ? 0 : 34);
      const animation = requestAnimationFrame(() => center(target));
      return () => cancelAnimationFrame(animation);
    }, [
      L,
      progress.studentId,
      progress.loading,
      progress.pendingCelebration,
      currentId,
      center,
    ]);

    useEffect(() => {
      const el = viewport.current;
      if (!el) return;
      const wheel = (event: WheelEvent) => {
        if (event.ctrlKey) return; // Preserve the browser's pinch-to-zoom accessibility gesture.
        event.preventDefault();
        const scale =
          event.deltaMode === 1
            ? 24
            : event.deltaMode === 2
              ? el.clientWidth
              : 1;
        el.scrollLeft +=
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX * scale
            : -event.deltaY * scale;
      };
      el.addEventListener("wheel", wheel, { passive: false });
      return () => el.removeEventListener("wheel", wheel);
    }, []);
    useEffect(
      () => () => {
        clearTimeout(crossingTimer.current);
        cancelAnimationFrame(frame.current);
      },
      [],
    );

    const onScroll = () => {
      if (!L || !viewport.current || frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const el = viewport.current;
        if (!el) return;
        world.current?.style.setProperty(
          "--parallax-shift",
          `${Math.max(-80, Math.min(80, (el.scrollLeft - L.W + L.viewportW) * 0.035))}px`,
        );
        setEdges({
          left: el.scrollLeft < 3,
          right: el.scrollLeft > L.W - el.clientWidth - 3,
        });
        const level: LevelId =
          el.scrollLeft + el.clientWidth / 2 < L.splitX ? 2 : 1;
        if (level !== visibleLevel.current) {
          visibleLevel.current = level;
          onVisibleLevel(level);
          setCrossing(true);
          clearTimeout(crossingTimer.current);
          crossingTimer.current = setTimeout(
            () => setCrossing(false),
            reducedMotion() ? 0 : 1800,
          );
        }
      });
    };
    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType === "touch" ||
        event.button !== 0 ||
        (event.target as HTMLElement).closest("button, a, input")
      )
        return;
      drag.current = {
        x: event.clientX,
        left: event.currentTarget.scrollLeft,
        active: true,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d?.active) return;
      const dx = event.clientX - d.x;
      if (Math.abs(dx) > 6) {
        d.moved = true;
        event.currentTarget.classList.add("is-dragging");
      }
      if (d.moved) event.currentTarget.scrollLeft = d.left - dx;
    };
    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current) drag.current.active = false;
      event.currentTarget.classList.remove("is-dragging");
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        !L ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ![
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
          "PageDown",
          "PageUp",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const el = viewport.current!;
      const focused = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-station-button]",
      );
      if (
        focused &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        const next = Math.max(
          1,
          Math.min(
            32,
            Number(focused.dataset.stationButton) +
              (event.key === "ArrowLeft" ? 1 : -1),
          ),
        );
        const button = el.querySelector<HTMLButtonElement>(
          `[data-station-button="${next}"]`,
        );
        button?.focus({ preventScroll: true });
        center(L.nodes.find((n) => n.kind === "station" && n.id === next));
      } else if (event.key === "Home") center(L.start);
      else if (event.key === "End") center(L.end);
      else
        el.scrollBy({
          left:
            (event.key === "ArrowLeft" || event.key === "PageDown" ? -1 : 1) *
            (event.key.startsWith("Page") ? el.clientWidth * 0.75 : L.spacing),
          behavior: reducedMotion() ? "instant" : "smooth",
        });
    };

    const current = L?.nodes.find(
      (n) => n.kind === "station" && n.id === currentId,
    );
    return (
      <main
        className={`map-shell ${crossing || zone2Entering ? "is-crossing" : ""}`}
        aria-label="خارطة رحلتي"
      >
        <div
          ref={viewport}
          className="map-viewport"
          dir="ltr"
          role="region"
          aria-label="خارطة أفقية، تبدأ من اليمين وتتقدّم يسارًا. استخدم السحب أو عجلة الفأرة أو الأسهم."
          tabIndex={0}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          onClickCapture={(e) => {
            if (drag.current?.moved) {
              e.preventDefault();
              e.stopPropagation();
              drag.current = null;
            }
          }}
        >
          {L && S && (
            <div
              ref={world}
              className={`map-world ${L.compact ? "is-compact" : ""}`}
              dir="rtl"
              style={{ width: L.W, height: L.H }}
              data-map-width={L.W}
            >
              <svg
                className="scene"
                width={L.W}
                height={L.H}
                viewBox={`0 0 ${L.W} ${L.H}`}
                aria-hidden="true"
              >
                <defs>
                  <SceneryDefs L={L} />
                  <linearGradient
                    id="roadBase"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    x2={L.W}
                  >
                    <stop stopColor="#f7dca4" />
                    <stop offset=".48" stopColor="#fdf0d2" />
                    <stop offset="1" stopColor="#fdf0d2" />
                  </linearGradient>
                </defs>
                <FarLayer L={L} />
                <GroundLayer L={L} />
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path
                    d={road}
                    className="road-shadow"
                    strokeWidth={L.roadW + 12}
                    transform="translate(0 6)"
                  />
                  <path d={road} stroke="#ad7c42" strokeWidth={L.roadW + 5} />
                  <path d={road} stroke="#dcb978" strokeWidth={L.roadW + 2} />
                  <path
                    d={road}
                    stroke="url(#roadBase)"
                    strokeWidth={L.roadW - 3}
                  />
                  <path d={road} className="road-dash" />
                  {traveled && <path d={traveled} className="road-traveled" />}
                </g>
                <Bridge L={L} />
                <DecoLayer S={S} />
                <StartVillage L={L} />
                <WorldGate L={L} />
                {current && (
                  <path
                    className="current-tether"
                    d={`M${current.x} ${current.y + L.stationSize / 2 + 18}V${L.cardY - 12}`}
                  />
                )}
              </svg>
              {[1, 2].map((id) => {
                const level = id as LevelId,
                  info = getLevel(level),
                  r = L.signs[id - 1];
                return (
                  <div
                    key={id}
                    className={`world-sign world-sign-${level}`}
                    style={boxStyle(r)}
                    data-collision="world-sign"
                  >
                    <span>{info.shortName}</span>
                    <h3>{info.name}</h3>
                    <div>
                      <bdi>
                        الحصص {info.first}–{info.last}
                      </bdi>
                      <i />
                      <bdi>
                        {Math.max(
                          0,
                          Math.min(16, progress.completed - info.first + 1),
                        )}
                        /16 محطة مكتملة
                      </bdi>
                    </div>
                  </div>
                );
              })}
              {L.nodes
                .filter(
                  (n) => n.kind === "station" && (n.id === 1 || n.id === 17),
                )
                .map((n) => (
                  <span
                    key={n.id}
                    className="world-snap"
                    style={{ left: n.x }}
                  />
                ))}
              <div
                className="map-character sister-guide"
                style={boxStyle(sisterRect(L))}
                data-collision="sister"
              >
                <Character
                  who="sisterWave"
                  height={sisterRect(L).h}
                  decorative={false}
                />
              </div>
              <div
                className="speech sister-speech"
                style={boxStyle(sisterSpeechRect(L))}
                data-collision="sister-speech"
              >
                سأرافقك من أول خطوة!
              </div>
              {L.nodes.map((n) => {
                if (n.kind === "station")
                  return (
                    <Station
                      key={n.id}
                      session={SESSIONS[n.id - 1]}
                      status={statusOf(n.id, progress.completed)}
                      node={n}
                      layout={L}
                      unlocking={unlockingId === n.id}
                      justCompleted={justCompletedId === n.id}
                      onOpen={onOpenStation}
                    />
                  );
                const achieved = isLevelComplete(n.level, progress.completed),
                  title = MILESTONES[n.level - 1].title;
                const r = labelRect(n, L),
                  sami = samiRect(n, L);
                return (
                  <div key={`milestone-${n.level}`}>
                    <div
                      className={`milestone ${achieved ? "is-achieved" : "is-pending"}`}
                      style={{
                        left: n.x - L.milestoneSize / 2,
                        top: n.y - L.milestoneSize / 2,
                        width: L.milestoneSize,
                        height: L.milestoneSize,
                      }}
                      data-milestone={n.level}
                    >
                      <button
                        type="button"
                        className="milestone-btn"
                        onClick={() => onOpenMilestone(n.level)}
                        aria-label={`${title}، ${achieved ? "مكتمل" : "مغلق حتى اعتماد حصص المستوى"}`}
                      >
                        <span className="milestone-badge">
                          <Icon
                            name={n.level === 1 ? "medal" : "crown"}
                            size={51}
                          />
                        </span>
                        {!achieved && (
                          <span className="milestone-lock">
                            <Icon name="lock" size={16} />
                          </span>
                        )}
                      </button>
                    </div>
                    <div
                      className="milestone-label"
                      style={boxStyle(r)}
                      data-collision="milestone-label"
                    >
                      {title}
                      <small>
                        {achieved ? "إنجاز يستحق الفخر" : "جائزتك تنتظرك هنا"}
                      </small>
                    </div>
                    <div
                      className={`map-character sami-guide ${achieved ? "is-celebrating" : ""}`}
                      style={boxStyle(sami)}
                      data-collision="sami"
                    >
                      <Character
                        who={achieved ? "samiCheer" : "sami"}
                        height={sami.h}
                        decorative={false}
                      />
                    </div>
                  </div>
                );
              })}
              {current && (
                <>
                  <section
                    className="current-card"
                    style={boxStyle(currentCardRect(current, L))}
                    aria-labelledby="current-station-title"
                    data-collision="current-card"
                  >
                    <div className="current-card-kicker">
                      <span>
                        <i />
                        محطتك الآن
                      </span>
                      <bdi>الحصة {current.id}</bdi>
                    </div>
                    <h2 id="current-station-title">
                      {SESSIONS[current.id - 1].title}
                    </h2>
                    <button
                      type="button"
                      className="btn btn-start current-start"
                      onClick={() => onStart(current.id)}
                      disabled={!!unlockingId || progress.loading}
                    >
                      <Icon name="play" size={17} />
                      <span>ابدأ الحصة</span>
                      <Icon name="chevron-left" size={18} />
                    </button>
                  </section>
                  <div
                    className="map-character laila-guide"
                    style={boxStyle(guideRect(current, L))}
                    data-collision="laila"
                  >
                    <Character
                      who="lailaPoint"
                      height={guideRect(current, L).h}
                      flip
                      decorative={false}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="map-arrow map-arrow-left"
          data-hud="previous-view"
          aria-label="تقدّم يسارًا في الخارطة"
          disabled={edges.left}
          onClick={() =>
            viewport.current?.scrollBy({
              left: -(L?.spacing ?? 200) * 2,
              behavior: reducedMotion() ? "instant" : "smooth",
            })
          }
        >
          <Icon name="chevron-left" size={23} />
        </button>
        <button
          type="button"
          className="map-arrow map-arrow-right"
          data-hud="next-view"
          aria-label="ارجع يمينًا في الخارطة"
          disabled={edges.right}
          onClick={() =>
            viewport.current?.scrollBy({
              left: (L?.spacing ?? 200) * 2,
              behavior: reducedMotion() ? "instant" : "smooth",
            })
          }
        >
          <Icon name="chevron-right" size={23} />
        </button>
        {progress.loading && (
          <div className="map-loading" role="status">
            نحضّر رحلتك…
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {unlockingId
            ? `اعتمد المدرّب الحصة السابقة. المحطة ${unlockingId} متاحة الآن.`
            : ""}
        </span>
      </main>
    );
  },
);

export function mapNodeLabelPosition(L: Layout, id: number) {
  const n = L.nodes.find((node) => node.id === id && node.kind === "station");
  return n ? labelRect(n, L) : null;
}
