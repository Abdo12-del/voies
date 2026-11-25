import { useCallback, useEffect, useRef, useState } from "react";
import { BottomBar } from "./components/BottomBar";
import { Celebration } from "./components/Celebration";
import { Header } from "./components/Header";
import { HouseEntry } from "./components/HouseEntry";
import { SchoolEntry, SchoolHall, SchoolClassroom } from "./components/SchoolEntry";
import { JourneyMap, type JourneyMapHandle } from "./components/JourneyMap";
import { JourneyWelcome } from "./components/JourneyWelcome";
import { LessonView } from "./components/LessonView";
import { SistersLesson } from "./components/SistersLesson";
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
  { name: "welcome" } | { name: "map" } | { name: "lesson"; id: number; mode: "learn" | "review" };
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
  return window.location.hash ? { name: "map" } : { name: "welcome" };
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
  const houseTimer = useRef<ReturnType<typeof setTimeout>>();
  const houseDestination = useRef<string | null>(null);
  const [enteringHouse, setEnteringHouse] = useState(false);
  const schoolTimer = useRef<ReturnType<typeof setTimeout>>();
  const schoolDestination = useRef<string | null>(null);
  const [schoolPhase, setSchoolPhase] = useState<"approach" | "hall" | "enter" | null>(null);
  const [classroomIntro, setClassroomIntro] = useState(true);
  const [arrivingInRoom, setArrivingInRoom] = useState(false);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout>>();
  const focusMapAfterArrival = useRef(false);
  const [enteringMap, setEnteringMap] = useState(false);
  const lastCompleted = useRef(progress.completed);
  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      if (next.name !== "lesson" || next.id !== 1) setArrivingInRoom(false);
      if (houseDestination.current) {
        clearTimeout(houseTimer.current);
        houseDestination.current = null;
        setEnteringHouse(false);
      }
      if (schoolDestination.current) {
        clearTimeout(schoolTimer.current);
        schoolDestination.current = null;
        setSchoolPhase(null);
      }
      if (next.name !== "lesson" || next.id !== 2) setClassroomIntro(true);
      if (next.name !== "map") {
        clearTimeout(arrivalTimer.current);
        focusMapAfterArrival.current = false;
        setEnteringMap(false);
      }
      setRoute(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const goMap = useCallback(() => {
    // Update React in the same batch as completion. Waiting for hashchange can
    // otherwise let the review redirect reclaim the just-finished lesson.
    setArrivingInRoom(false);
    setRoute({ name: "map" });
    window.location.hash = "#/map";
  }, []);
  const beginJourney = useCallback(() => {
    focusMapAfterArrival.current = true;
    if (reducedMotion()) {
      goMap();
      return;
    }
    setEnteringMap(true);
    goMap();
    clearTimeout(arrivalTimer.current);
    arrivalTimer.current = setTimeout(() => setEnteringMap(false), 1550);
  }, [goMap]);
  useEffect(() => {
    if (route.name === "map" && !enteringMap && focusMapAfterArrival.current) {
      focusMapAfterArrival.current = false;
      document.querySelector<HTMLElement>(".map-viewport")?.focus({ preventScroll: true });
    }
  }, [route.name, enteringMap]);
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

  const finishHouseEntry = useCallback(() => {
    const destination = houseDestination.current;
    if (!destination) return;
    clearTimeout(houseTimer.current);
    houseDestination.current = null;
    // Swap the final bedroom frame for the lesson in one render. Waiting for
    // hashchange leaves a frame of the map visible between the two scenes.
    window.location.hash = destination;
    setArrivingInRoom(true);
    setRoute(parseHash());
    setEnteringHouse(false);
  }, []);
  const finishSchoolEntry = useCallback(() => {
    const destination = schoolDestination.current;
    if (!destination) return;
    clearTimeout(schoolTimer.current);
    schoolDestination.current = null;
    window.location.hash = destination;
    setClassroomIntro(true);
    setRoute(parseHash());
    setSchoolPhase(null);
  }, []);
  const reachSchoolHall = useCallback(() => {
    if (!schoolDestination.current) return;
    clearTimeout(schoolTimer.current);
    setSchoolPhase("hall");
  }, []);
  const enterSchoolClassroom = useCallback(() => {
    if (!schoolDestination.current) return;
    if (reducedMotion()) { finishSchoolEntry(); return; }
    setSchoolPhase("enter");
    clearTimeout(schoolTimer.current);
    schoolTimer.current = setTimeout(finishSchoolEntry, 10000);
  }, [finishSchoolEntry]);
  const cancelSchoolEntry = useCallback(() => {
    clearTimeout(schoolTimer.current);
    schoolDestination.current = null;
    setSchoolPhase(null);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".current-start")?.focus({ preventScroll: true }));
  }, []);
  useEffect(() => {
    // Begin loading the frames while the user explores the map.
    if (route.name !== "map") return;
    for (const path of ["/house-entry/01-approach.webp", "/house-entry/02-doorway.webp", "/house-entry/03-inside.webp", "/sisters-story/hallway.webp", "/sisters-story/bedroom-door.webp", "/sisters-story/bedroom-hd.webp", "/sisters-story/solo/young-worried.webp", "/school-entry/exterior.webp", "/school-entry/hall.webp", "/school-entry/classroom.webp", "/school-entry/friend.webp", "/sisters-story/solo/young-greet.webp"]) {
      const image = new Image();
      image.src = path;
    }
  }, [route.name]);
  const startLesson = (id: number) => {
    if (statusOf(id, progress.completed) === "locked") {
      setSheet({ kind: "station", id });
      return;
    }
    if (houseDestination.current || schoolDestination.current) return;
    setSheet(null);
    const destination = `#/lesson/${id}${statusOf(id, progress.completed) === "completed" ? "?mode=review" : ""}`;
    if ((id !== 1 && id !== 2) || (id === 1 && reducedMotion()) || route.name !== "map") {
      window.location.hash = destination;
      return;
    }
    if (id === 2) {
      map.current?.goToStation(2, false);
      const viewport = document.querySelector<HTMLElement>(".city-viewport");
      const world = document.querySelector<HTMLElement>(".city-world");
      if (viewport && world) {
        const view = viewport.getBoundingClientRect(), image = world.getBoundingClientRect();
        viewport.style.transformOrigin = `${image.left - view.left + image.width * 418 / 1584}px ${image.top - view.top + image.height * 260 / 672}px`;
      }
      schoolDestination.current = destination;
      if (reducedMotion()) setSchoolPhase("hall");
      else {
        setSchoolPhase("approach");
        schoolTimer.current = setTimeout(reachSchoolHall, 10000);
      }
      return;
    }
    // Start from the actual house on the map, even if the user had scrolled away.
    map.current?.goToLevel(1, false);
    const viewport = document.querySelector<HTMLElement>(".city-viewport");
    const world = document.querySelector<HTMLElement>(".city-world");
    if (viewport && world) {
      const view = viewport.getBoundingClientRect(), image = world.getBoundingClientRect();
      viewport.style.transformOrigin = `${image.left - view.left + image.width * 155 / 1584}px ${image.top - view.top + image.height * 145 / 672}px`;
    }
    houseDestination.current = destination;
    setEnteringHouse(true);
    // Normally the room animation finishes the handoff. This fallback covers
    // a canceled animation without cutting it short under a busy browser.
    houseTimer.current = setTimeout(finishHouseEntry, 15000);
  };
  const openStation = (id: number) => {
    if (statusOf(id, progress.completed) === "current") {
      if (id === 1) { startLesson(id); return; }
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
      enteringMap ||
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
    enteringMap,
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
  useEffect(() => () => {
    clearTimeout(transitionTimer.current);
    clearTimeout(arrivalTimer.current);
    clearTimeout(houseTimer.current);
    clearTimeout(schoolTimer.current);
  }, []);
  useEffect(() => {
    const id = progress.pendingUnlock;
    if (
      !id ||
      route.name !== "map" ||
      enteringMap ||
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
    enteringMap,
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
  const LessonComponent = lesson?.id === 1 ? SistersLesson : LessonView;
  return (
    <>
      {route.name === "welcome" ? (
        <JourneyWelcome onStart={beginJourney} />
      ) : lesson ? (
        <div key="lesson" className={`app lesson-app${arrivingInRoom && lesson.id === 1 ? " is-room-arriving" : ""}`}>
          {lesson.id === 2 && classroomIntro ? <SchoolClassroom onBack={goMap} onContinue={() => setClassroomIntro(false)} review={statusOf(lesson.id, progress.completed) === "completed"} /> : <LessonComponent
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
          />}
        </div>
      ) : (
        <div
          key="map"
          className={`app city-app${enteringMap ? " is-map-arriving" : ""}${enteringHouse ? " house-departing" : ""}${schoolPhase ? " school-departing" : ""}`}
          ref={(element) => { if (element) element.inert = enteringMap || enteringHouse || !!schoolPhase; }}
          aria-hidden={enteringMap || enteringHouse || !!schoolPhase || undefined}
        >
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
      {enteringMap && route.name === "map" && <JourneyWelcome onStart={beginJourney} exiting />}
      {enteringHouse && route.name === "map" && <HouseEntry onSkip={finishHouseEntry} onComplete={finishHouseEntry} />}
      {schoolPhase === "approach" && route.name === "map" && <SchoolEntry onSkip={reachSchoolHall} onComplete={reachSchoolHall} />}
      {(schoolPhase === "hall" || schoolPhase === "enter") && route.name === "map" && <SchoolHall entering={schoolPhase === "enter"} onEnter={enterSchoolClassroom} onBack={cancelSchoolEntry} onComplete={finishSchoolEntry} />}
      <SpeakerWheel open={speakerOpen} onClose={() => setSpeakerOpen(false)} />
    </>
  );
}
