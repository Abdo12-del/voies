import type { LevelId } from "../data/sessions";
import { Icon } from "./icons";

interface Props {
  visibleLevel: LevelId;
  onGoToCurrent: () => void;
  onLevel: (id: LevelId) => void;
  onManageLessons: () => void;
}

/** Three floating controls, not a footer strip. Lesson start stays on the current station. */
export function BottomBar({
  visibleLevel,
  onGoToCurrent,
  onLevel,
  onManageLessons,
}: Props) {
  return (
    <nav className="game-bar" aria-label="التحكم في الرحلة">
      <button
        type="button"
        className="bar-side my-station"
        data-hud="my-station"
        onClick={onGoToCurrent}
      >
        <Icon name="pin" size={23} />
        <span>محطتي</span>
      </button>
      <div
        className="level-navigation"
        data-hud="worlds"
        role="group"
        aria-label="موضعك في العالمين"
      >
        <div className="world-switch" role="group" aria-label="مبدّل المستوى">
          <button
            type="button"
            onClick={() => onLevel(1)}
            aria-pressed={visibleLevel === 1}
            className={visibleLevel === 1 ? "active" : ""}
          >
            <Icon name="leaf" size={17} />
            <span>المستوى الأول</span>
          </button>
          <button
            type="button"
            onClick={() => onLevel(2)}
            aria-pressed={visibleLevel === 2}
            className={visibleLevel === 2 ? "active" : ""}
          >
            <Icon name="sparkles" size={17} />
            <span>المستوى الثاني</span>
          </button>
        </div>
        <div className="world-position" aria-live="polite">
          <i className={visibleLevel === 1 ? "active" : ""} />
          <i className={visibleLevel === 2 ? "active" : ""} />
          <span className="sr-only">
            أنت تتصفح المستوى {visibleLevel === 1 ? "الأول" : "الثاني"}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="bar-side lessons-button"
        data-hud="lessons"
        aria-label="إدارة الحصص"
        onClick={onManageLessons}
      >
        <Icon name="book" size={23} />
        <span>الحصص</span>
      </button>
    </nav>
  );
}
