import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { SESSIONS, type LevelId } from "../data/sessions";
import { CITY_MILESTONES, CITY_ROUTE } from "../lib/cityRoute";
import { currentSessionId, isLevelComplete, statusOf, type ProgressState } from "../lib/progress";
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
const WIDTH = 1584;
const HEIGHT = 672;
const ZOOM_LEVELS = [100, 125, 150, 175, 200] as const;
const point = ([x, y]: readonly [number, number]) => `${x * WIDTH / 100},${y * HEIGHT / 100}`;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const JourneyMap = forwardRef<JourneyMapHandle, Props>(function JourneyMap(
  { progress, unlockingId, justCompletedId, onOpenStation, onStart, onOpenMilestone, onVisibleLevel }, ref,
) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex] / 100;
  const zoomAnchor = useRef<readonly [number, number] | null>(null);
  const scrollFrame = useRef(0);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const currentId = currentSessionId(progress.completed);
  const current = currentId ? SESSIONS[currentId - 1] : null;
  const center = useCallback((coords: readonly [number, number], smooth = true) => {
    const el = viewport.current;
    const map = world.current;
    if (!el || !map) return;
    el.scrollTo({ left: map.offsetLeft + coords[0] * map.offsetWidth / 100 - el.clientWidth / 2, top: map.offsetTop + coords[1] * map.offsetHeight / 100 - el.clientHeight / 2, behavior: smooth && !reducedMotion() ? "smooth" : "instant" });
  }, []);
  const goCurrent = useCallback((smooth = true) => {
    center(currentId ? CITY_ROUTE[currentId - 1] : CITY_MILESTONES[1], smooth);
    onVisibleLevel(currentId && currentId <= 16 ? 1 : 2);
  }, [center, currentId, onVisibleLevel]);
  useImperativeHandle(ref, () => ({
    goToCurrent: goCurrent,
    goToLevel: (id) => { center(CITY_ROUTE[id === 1 ? 0 : 16]); onVisibleLevel(id); },
    goToMilestone: (id) => { center(CITY_MILESTONES[id - 1]); onVisibleLevel(id); },
  }), [center, goCurrent, onVisibleLevel]);
  useLayoutEffect(() => { goCurrent(false); }, [goCurrent]);
  // Preserve the location at the centre of the viewport while zoom changes.
  const changeZoom = (step: number) => {
    const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIndex + step));
    const el = viewport.current, map = world.current;
    if (!el || !map || next === zoomIndex) return;
    zoomAnchor.current = [
      (el.scrollLeft + el.clientWidth / 2 - map.offsetLeft) / map.offsetWidth * 100,
      (el.scrollTop + el.clientHeight / 2 - map.offsetTop) / map.offsetHeight * 100,
    ];
    setZoomIndex(next);
  };
  useLayoutEffect(() => {
    if (!zoomAnchor.current) return;
    center(zoomAnchor.current, false);
    zoomAnchor.current = null;
  }, [zoomIndex, center]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      // Ordinary wheel scroll explores vertically; shift-wheel and trackpads explore horizontally.
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? el.clientHeight : 1;
      if (event.shiftKey && !event.deltaX) el.scrollLeft += event.deltaY * unit;
      else { el.scrollLeft += event.deltaX * unit; el.scrollTop += event.deltaY * unit; }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);
  const onScroll = () => {
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const el = viewport.current;
      const map = world.current;
      if (!el || !map || el.scrollWidth - el.clientWidth < el.clientWidth * 0.4) return;
      const x = el.scrollLeft + el.clientWidth / 2 - map.offsetLeft, y = el.scrollTop + el.clientHeight / 2 - map.offsetTop;
      let closest = 0, distance = Infinity;
      CITY_ROUTE.forEach(([px, py], index) => {
        const d = Math.hypot(px * map.offsetWidth / 100 - x, py * map.offsetHeight / 100 - y);
        if (d < distance) { closest = index; distance = d; }
      });
      onVisibleLevel(closest < 16 ? 1 : 2);
    });
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-station-button]");
    if (!button || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const id = Math.max(1, Math.min(32, Number(button.dataset.stationButton) + (event.key === "ArrowRight" ? 1 : -1)));
    viewport.current?.querySelector<HTMLButtonElement>(`[data-station-button="${id}"]`)?.focus({ preventScroll: true });
    center(CITY_ROUTE[id - 1]);
    onVisibleLevel(id <= 16 ? 1 : 2);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    if (d.moved) { event.currentTarget.scrollLeft = d.left - dx; event.currentTarget.scrollTop = d.top - dy; }
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <main className="city-shell" aria-label="مدينة المتحدث الصغير">
      <div className="map-viewport city-viewport" ref={viewport} tabIndex={0} role="region" aria-label="خريطة المدينة، اسحب للاستكشاف" onKeyDown={handleKey} onScroll={onScroll} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="city-canvas" style={{ width: `max(100%, ${WIDTH * zoom}px)`, height: `max(100%, ${HEIGHT * zoom}px)` }}>
        <div ref={world} className="city-world" style={{ width: WIDTH * zoom, height: HEIGHT * zoom }}>
          <img src="/city/city-map.webp" alt="" draggable={false} className="city-art" />
          <svg className="city-route" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
            <polyline className="city-route-outline" points={CITY_ROUTE.map(point).join(" ")} />
            <polyline className="city-route-dashes" points={CITY_ROUTE.map(point).join(" ")} />
            {progress.completed > 0 && <polyline className="city-route-complete" points={CITY_ROUTE.slice(0, Math.min(32, progress.completed + 1)).map(point).join(" ")} />}
          </svg>
          {SESSIONS.map((session, index) => {
            const status = statusOf(session.id, progress.completed);
            return <div key={session.id} className={`city-stop station is-${status} ${unlockingId === session.id ? "is-unlocking" : ""} ${justCompletedId === session.id ? "is-just-completed" : ""}`} data-station={session.id} style={{ left: `${CITY_ROUTE[index][0]}%`, top: `${CITY_ROUTE[index][1]}%` }}>
              {status === "current" && <span className="city-stop-here">محطتك هنا</span>}
              <button type="button" className="city-stop-button" data-station-button={session.id} onClick={() => onOpenStation(session.id)} aria-label={`الحصة ${session.id}، ${status === "current" ? "متاحة الآن" : status === "completed" ? "مكتملة" : "مغلقة"}: ${session.title}`} aria-current={status === "current" ? "step" : undefined}>
                {status === "completed" ? <Icon name="check" size={21} /> : <span>{session.id}</span>}
              </button>
            </div>;
          })}
          {CITY_MILESTONES.map((coords, index) => {
            const level = (index + 1) as LevelId;
            return <button key={level} className={`city-milestone ${isLevelComplete(level, progress.completed) ? "is-achieved" : ""}`} style={{ left: `${coords[0]}%`, top: `${coords[1]}%` }} onClick={() => onOpenMilestone(level)} aria-label={`إنجاز المستوى ${level === 1 ? "الأول" : "الثاني"}`}><Icon name={level === 1 ? "medal" : "crown"} size={24} /></button>;
          })}
        </div>
        </div>
      </div>
      <div className="city-zoom" role="group" aria-label="تقريب الخريطة وإبعادها" dir="rtl">
        <button type="button" onClick={() => changeZoom(1)} disabled={zoomIndex === ZOOM_LEVELS.length - 1} aria-label="تقريب الخريطة" title="تقريب الخريطة">+</button>
        <output aria-live="polite" aria-label="مستوى التكبير">{ZOOM_LEVELS[zoomIndex]}٪</output>
        <button type="button" onClick={() => changeZoom(-1)} disabled={zoomIndex === 0} aria-label="إبعاد الخريطة" title="إبعاد الخريطة">−</button>
      </div>
      <div className="city-intro" dir="rtl"><span>✦ مدينة المتحدث الصغير</span><strong>كل خطوة، حكاية جديدة</strong><small>اسحب الخريطة لتستكشف المدينة · المسار ومواقع الحصص تجريبية</small></div>
      {current ? <section className="city-current current-card" dir="rtl" aria-labelledby="current-station-title">
        <div className="city-current-icon"><Icon name={current.icon} size={25} /></div>
        <div className="city-current-copy"><span>محطتنا القادمة · الحصة {current.id}</span><h2 id="current-station-title">{current.title}</h2></div>
        <button type="button" className="city-start current-start" onClick={() => onStart(current.id)} disabled={!!unlockingId}><Icon name="play" size={17} /> ابدأ الحصة</button>
      </section> : <div className="city-current city-finished" dir="rtl">✦ أكملت رحلتك في المدينة!</div>}
    </main>
  );
});
