import { useCallback, useEffect, useRef, useState } from "react";
import { BottomBar } from "./components/BottomBar";
import { Celebration } from "./components/Celebration";
import { Header } from "./components/Header";
import { JourneyMap, type JourneyMapHandle } from "./components/JourneyMap";
import { LessonView } from "./components/LessonView";
import { StationSheet, type SheetTarget } from "./components/StationSheet";
import { SpeakerWheel } from "./components/SpeakerWheel";
import { TeacherPanel } from "./components/TeacherPanel";
import type { LevelId } from "./data/sessions";
import {
  approveNext,
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
    [speakerOpen, setSpeakerOpen] = useState(false);
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
    // Update React in the same batch as completion. Waiting for hashchange can
    // otherwise let the review redirect reclaim the just-finished lesson.
    setRoute({ name: "map" });
    window.location.hash = "";
  }, []);
  const goToCurrent = useCallback(() => {
    setSheet(null);
    map.current?.goToCurrent();
  }, []);

  // Sequential navigation is a classroom convenience, not an account permission.
  useEffect(() => {
    if (route.name !== "lesson") return;
    const status = statusOf(route.id, progress.completed);
    if (status === "locked") {
      goMap();
      setSheet({ kind: "station", id: route.id });
    } else if (status === "completed" && route.mode !== "review")
      window.location.replace(`#/lesson/${route.id}?mode=review`);
    else if (status === "current" && route.mode === "review")
      window.location.replace(`#/lesson/${route.id}`);
  }, [route, progress.completed, goMap]);

  const startLesson = (id: number) => {
    if (statusOf(id, progress.completed) === "locked") {
      setSheet({ kind: "station", id });
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
      speakerOpen ||
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
    speakerOpen,
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
      speakerOpen ||
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
    speakerOpen,
    celebrating,
  ]);

  const lesson =
    route.name === "lesson" &&
    statusOf(route.id, progress.completed) !== "locked"
      ? route
      : null;
  return (
    <>
      {lesson ? (
        <div className="app lesson-app">
          <LessonView
            key={lesson.id}
            id={lesson.id}
            mode={
              statusOf(lesson.id, progress.completed) === "completed"
                ? "review"
                : "learn"
            }
            onBack={goMap}
            onPickSpeaker={() => setSpeakerOpen(true)}
            onComplete={() => {
              if (approveNext(progress.completed)) goMap();
            }}
          />
        </div>
      ) : (
        <div className="app">
          <Header
            progress={progress}
            onPickSpeaker={() => setSpeakerOpen(true)}
          />
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
            onManageLessons={() => setTeacherOpen(true)}
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
          <Celebration level={celebrating} onClose={closeCelebration} />
        </div>
      )}
      <SpeakerWheel open={speakerOpen} onClose={() => setSpeakerOpen(false)} />
    </>
  );
}
