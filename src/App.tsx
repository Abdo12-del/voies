import { useCallback, useEffect, useRef, useState } from "react";
import { Celebration } from "./components/Celebration";
import { Header } from "./components/Header";
import { JourneyMap } from "./components/JourneyMap";
import { LessonView } from "./components/LessonView";
import { StationSheet, type SheetTarget } from "./components/StationSheet";
import { TeacherPanel } from "./components/TeacherPanel";
import { CheckIcon, KeyIcon, LockIcon } from "./components/icons";
import type { LevelId } from "./data/sessions";
import {
  clearPendingCelebration,
  clearPendingUnlock,
  currentSessionId,
  statusOf,
  useProgress,
} from "./lib/progress";

type Route = { name: "map" } | { name: "lesson"; id: number; mode: "learn" | "review" };

function parseHash(): Route {
  const m = window.location.hash.match(/^#\/lesson\/(\d{1,2})(?:\?mode=(review|learn))?$/);
  if (m) {
    const id = Number(m[1]);
    if (id >= 1 && id <= 32) return { name: "lesson", id, mode: (m[2] as "review" | "learn") || "learn" };
  }
  return { name: "map" };
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function scrollToStation(id: number, smooth = true) {
  const el = document.querySelector(`[data-station="${id}"]`);
  el?.scrollIntoView({ block: "center", behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
}

export default function App() {
  const progress = useProgress();
  const [route, setRoute] = useState<Route>(parseHash);
  const [sheet, setSheet] = useState<SheetTarget>(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [celebrating, setCelebrating] = useState<LevelId | null>(null);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<number | null>(null);
  const [zone2Entering, setZone2Entering] = useState(false);
  const firstMapMount = useRef(true);

  // ── التوجيه عبر الرابط (#/lesson/5) مع منع فتح الحصص المقفلة ──
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (route.name !== "lesson") return;
    const st = statusOf(route.id, progress.completed);
    if (st === "locked") {
      // لا يمكن الدخول إلى حصة مقفلة حتى عبر الرابط المباشر
      window.location.hash = "";
      setSheet({ kind: "station", id: route.id });
    } else if (st === "completed" && route.mode !== "review") {
      window.location.replace(`#/lesson/${route.id}?mode=review`);
    } else if (st === "current" && route.mode === "review") {
      window.location.replace(`#/lesson/${route.id}`);
    }
  }, [route, progress.completed]);

  const goMap = useCallback(() => {
    window.location.hash = "";
  }, []);

  const startLesson = useCallback(
    (id: number, mode?: "learn" | "review") => {
      const st = statusOf(id, progress.completed);
      if (st === "locked") {
        setSheet({ kind: "station", id });
        return;
      }
      setSheet(null);
      const m = mode ?? (st === "completed" ? "review" : "learn");
      window.location.hash = `#/lesson/${id}${m === "review" ? "?mode=review" : ""}`;
    },
    [progress.completed],
  );

  const goToCurrent = useCallback(() => {
    setSheet(null);
    const id = currentSessionId(progress.completed);
    if (route.name !== "map") {
      window.location.hash = "";
      setTimeout(() => id && scrollToStation(id), 120);
    } else if (id) {
      setTimeout(() => scrollToStation(id), 60);
    }
  }, [progress.completed, route.name]);

  // ── عند فتح الخارطة: الانتقال بهدوء إلى المحطة الحالية ──
  useEffect(() => {
    if (route.name !== "map") return;
    const id = currentSessionId(progress.completed);
    const delay = firstMapMount.current ? 1100 : 150;
    firstMapMount.current = false;
    if (!id || id === 1 || progress.pendingUnlock) return;
    const t = setTimeout(() => scrollToStation(id), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.name]);

  // ── احتفال إتمام مستوى ──
  useEffect(() => {
    if (route.name === "map" && progress.pendingCelebration && !teacherOpen && !celebrating) {
      const t = setTimeout(() => setCelebrating(progress.pendingCelebration), 350);
      return () => clearTimeout(t);
    }
  }, [route.name, progress.pendingCelebration, teacherOpen, celebrating]);

  const closeCelebration = () => {
    const lvl = celebrating;
    setCelebrating(null);
    clearPendingCelebration();
    if (lvl === 1) {
      setZone2Entering(true);
      setTimeout(() => setZone2Entering(false), 2200);
    }
  };

  // ── تأثير فتح القفل ثم إضاءة المحطة ──
  useEffect(() => {
    const id = progress.pendingUnlock;
    if (route.name !== "map" || !id || teacherOpen || celebrating || progress.pendingCelebration) return;
    if (statusOf(id, progress.completed) !== "current") {
      clearPendingUnlock();
      return;
    }
    let t2: ReturnType<typeof setTimeout>;
    const t1 = setTimeout(() => {
      scrollToStation(id);
      setJustCompletedId(id - 1);
      setUnlockingId(id);
      t2 = setTimeout(
        () => {
          setUnlockingId(null);
          clearPendingUnlock();
          setTimeout(() => setJustCompletedId(null), 1200);
        },
        reducedMotion() ? 300 : 1700,
      );
    }, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [route.name, progress.pendingUnlock, progress.completed, teacherOpen, celebrating, progress.pendingCelebration]);

  if (route.name === "lesson" && statusOf(route.id, progress.completed) !== "locked") {
    return (
      <div className="app">
        <LessonView id={route.id} mode={route.mode} onBack={goMap} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header progress={progress} onGoToCurrent={goToCurrent} />

      <div className="legend" aria-label="دليل الألوان">
        <span className="legend-item">
          <i className="lg lg-current" /> متاحة الآن
        </span>
        <span className="legend-item">
          <i className="lg lg-done">
            <CheckIcon size={11} />
          </i>{" "}
          مكتملة
        </span>
        <span className="legend-item">
          <i className="lg lg-locked">
            <LockIcon size={11} />
          </i>{" "}
          مقفلة
        </span>
        <span className="legend-item">
          <i className="lg lg-milestone">★</i> محطة إنجاز
        </span>
      </div>

      <JourneyMap
        progress={progress}
        unlockingId={unlockingId}
        justCompletedId={justCompletedId}
        zone2Entering={zone2Entering}
        onOpenStation={(id) => setSheet({ kind: "station", id })}
        onStart={(id) => startLesson(id)}
        onOpenMilestone={(level) => setSheet({ kind: "milestone", level })}
      />

      <footer className="app-footer">
        <p>🎤 المتحدث الصغير — 32 محطة في مستويين، تُفتح واحدة تلو الأخرى.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTeacherOpen(true)}>
          <KeyIcon size={16} /> لوحة المدرّب
        </button>
      </footer>

      <button type="button" className="teacher-fab" onClick={() => setTeacherOpen(true)} aria-label="لوحة المدرّب" title="لوحة المدرّب">
        <KeyIcon size={20} />
      </button>

      <StationSheet
        target={sheet}
        progress={progress}
        onClose={() => setSheet(null)}
        onStart={(id, mode) => startLesson(id, mode)}
        onGoToCurrent={goToCurrent}
      />

      <TeacherPanel
        open={teacherOpen}
        progress={progress}
        onClose={() => setTeacherOpen(false)}
        onApproved={() => setTeacherOpen(false)}
      />

      <Celebration level={celebrating} onClose={closeCelebration} />
    </div>
  );
}
