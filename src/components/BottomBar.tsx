import { getSession } from "../data/sessions";
import { currentSessionId, type ProgressState } from "../lib/progress";
import { KeyIcon, PinIcon, PlayIcon } from "./icons";

interface Props {
  progress: ProgressState;
  busy: boolean;
  onStart: (id: number) => void;
  onGoToCurrent: () => void;
  onTeacher: () => void;
  onFinale: () => void;
}

/** شريط التحكم السفلي على طريقة الألعاب: زر كبير لبدء الحصة الحالية */
export function BottomBar({ progress, busy, onStart, onGoToCurrent, onTeacher, onFinale }: Props) {
  const id = currentSessionId(progress.completed);
  const session = id ? getSession(id) : null;

  return (
    <nav className="game-bar" aria-label="التحكم في الرحلة">
      <div className="game-bar-inner">
        <button type="button" className="bar-side" onClick={onGoToCurrent} disabled={!session}>
          <span className="bar-side-icon">
            <PinIcon size={22} />
          </span>
          <span className="bar-side-text">محطتي</span>
        </button>

        {session ? (
          <button type="button" className="bar-main" onClick={() => onStart(session.id)} disabled={busy}>
            <span className="bar-main-title">
              <PlayIcon size={20} /> ابدأ الحصة
            </span>
            <span className="bar-main-sub">
              الحصة {session.id}: {session.title}
            </span>
          </button>
        ) : (
          <button type="button" className="bar-main is-finale" onClick={onFinale}>
            <span className="bar-main-title">🏆 أتممت الرحلة!</span>
            <span className="bar-main-sub">32 / 32 حصة مكتملة</span>
          </button>
        )}

        <button type="button" className="bar-side" onClick={onTeacher}>
          <span className="bar-side-icon">
            <KeyIcon size={21} />
          </span>
          <span className="bar-side-text">المدرّب</span>
        </button>
      </div>
    </nav>
  );
}
