import { useCallback, useEffect, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { BottomBar } from "./components/BottomBar";
import { Celebration } from "./components/Celebration";
import { Header } from "./components/Header";
import { JourneyMap, type JourneyMapHandle } from "./components/JourneyMap";
import { LessonView } from "./components/LessonView";
import { StationSheet, type SheetTarget } from "./components/StationSheet";
import { TeacherPanel } from "./components/TeacherPanel";
import type { LevelId } from "./data/sessions";
import {
  clearPendingCelebration,
  clearPendingUnlock,
  statusOf,
  useProgress,
} from "./lib/progress";

type Route =
  { name: "map" } | { name: "lesson"; id: number; mode: "learn" | "review" };
function parseHash(): Route {
  const match = window.location.hash.match(
    /^#\/lesson\/(\d{1,2})(?:\?mode=(review|learn))?$/,
  );
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= 32)
    return {
      name: "lesson",
      id: Number(match[1]),
      mode: match[2] === "review" ? "review" : "learn",
    };
  return { name: "map" };
}
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const progress = useProgress();
  const [route, setRoute] = useState<Route>(parseHash);
  const [sheet, setSheet] = useState<SheetTarget>(null);
  const [teacherOpen, setTeacherOpen] = useState(false),
    [authOpen, setAuthOpen] = useState(false);
  const [celebrating, setCelebrating] = useState<LevelId | null>(null);
  const [visibleLevel, setVisibleLevel] = useState<LevelId>(1);
  const [unlockingId, setUnlockingId] = useState<number | null>(null),
    [justCompletedId, setJustCompletedId] = useState<number | null>(null);
  const [zone2Entering, setZone2Entering] = useState(false);
  const map = useRef<JourneyMapHandle>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastCompleted = useRef(progress.completed);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const goMap = useCallback(() => {
    window.location.hash = "";
  }, []);
  const goToCurrent = useCallback(() => {
    setSheet(null);
    map.current?.goToCurrent();
  }, []);

  // Guard both before rendering and on every authoritative progress/auth update.
  useEffect(() => {
    if (route.name !== "lesson" || progress.loading) return;
    if (progress.mode === "cloud" && !progress.profile) {
      goMap();
      setAuthOpen(true);
      return;
    }
    const status = statusOf(route.id, progress.completed);
    if (status === "locked") {
      goMap();
      setSheet({ kind: "station", id: route.id });
    } else if (status === "completed" && route.mode !== "review")
      window.location.replace(`#/lesson/${route.id}?mode=review`);
    else if (status === "current" && route.mode === "review")
      window.location.replace(`#/lesson/${route.id}`);
  }, [
    route,
    progress.completed,
    progress.loading,
    progress.mode,
    progress.profile,
    goMap,
  ]);

  const startLesson = (id: number) => {
    if (progress.loading) return;
    if (statusOf(id, progress.completed) === "locked") {
      setSheet({ kind: "station", id });
      return;
    }
    if (progress.mode === "cloud" && !progress.profile) {
      setAuthOpen(true);
      return;
    }
    setSheet(null);
    window.location.hash = `#/lesson/${id}${statusOf(id, progress.completed) === "completed" ? "?mode=review" : ""}`;
  };
  const openStation = (id: number) => {
    if (statusOf(id, progress.completed) === "current") {
      map.current?.goToCurrent();
      document
        .querySelector<HTMLButtonElement>(".current-start")
        ?.focus({ preventScroll: true });
    } else setSheet({ kind: "station", id });
  };

  useEffect(() => {
    if (progress.completed < lastCompleted.current) map.current?.goToCurrent();
    lastCompleted.current = progress.completed;
  }, [progress.completed]);
  useEffect(() => {
    if (
      route.name !== "map" ||
      !progress.pendingCelebration ||
      teacherOpen ||
      authOpen ||
      celebrating
    )
      return;
    const timer = setTimeout(
      () => {
        setSheet(null);
        setCelebrating(progress.pendingCelebration);
        map.current?.goToMilestone(progress.pendingCelebration!);
      },
      reducedMotion() ? 80 : 400,
    );
    return () => clearTimeout(timer);
  }, [
    route.name,
    progress.pendingCelebration,
    teacherOpen,
    authOpen,
    celebrating,
  ]);
  const closeCelebration = () => {
    const level = celebrating;
    setCelebrating(null);
    clearPendingCelebration();
    if (level === 1) {
      setZone2Entering(true);
      map.current?.goToLevel(2);
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(
        () => setZone2Entering(false),
        reducedMotion() ? 0 : 1900,
      );
    }
  };
  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    const id = progress.pendingUnlock;
    if (
      !id ||
      route.name !== "map" ||
      teacherOpen ||
      authOpen ||
      celebrating ||
      progress.pendingCelebration
    )
      return;
    let finish: ReturnType<typeof setTimeout>;
    const timer = setTimeout(
      () => {
        setSheet(null);
        map.current?.goToCurrent();
        setJustCompletedId(id - 1);
        setUnlockingId(id);
        finish = setTimeout(
          () => {
            setUnlockingId(null);
            setJustCompletedId(null);
            clearPendingUnlock();
          },
          reducedMotion() ? 120 : 1600,
        );
      },
      reducedMotion() ? 0 : 300,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(finish);
    };
  }, [
    route.name,
    progress.pendingUnlock,
    progress.pendingCelebration,
    teacherOpen,
    authOpen,
    celebrating,
  ]);

  if (
    route.name === "lesson" &&
    !progress.loading &&
    (progress.mode === "demo" || progress.profile) &&
    statusOf(route.id, progress.completed) !== "locked"
  ) {
    return (
      <div className="app lesson-app">
        <LessonView
          id={route.id}
          mode={
            statusOf(route.id, progress.completed) === "completed"
              ? "review"
              : "learn"
          }
          onBack={goMap}
        />
      </div>
    );
  }
  return (
    <div className="app">
      <Header progress={progress} onAccount={() => setAuthOpen(true)} />
      <JourneyMap
        ref={map}
        progress={progress}
        unlockingId={unlockingId}
        justCompletedId={justCompletedId}
        zone2Entering={zone2Entering}
        onOpenStation={openStation}
        onStart={startLesson}
        onOpenMilestone={(level) => setSheet({ kind: "milestone", level })}
        onVisibleLevel={setVisibleLevel}
      />
      <BottomBar
        visibleLevel={visibleLevel}
        onGoToCurrent={goToCurrent}
        onLevel={(id) => map.current?.goToLevel(id)}
        onTeacher={() => setTeacherOpen(true)}
      />
      <StationSheet
        target={sheet}
        progress={progress}
        onClose={() => setSheet(null)}
        onStart={startLesson}
        onGoToCurrent={goToCurrent}
      />
      <TeacherPanel
        open={teacherOpen}
        progress={progress}
        onClose={() => setTeacherOpen(false)}
        onApproved={() => setTeacherOpen(false)}
      />
      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        progress={progress}
      />
      <Celebration level={celebrating} onClose={closeCelebration} />
    </div>
  );
}
