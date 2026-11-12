import {
  getLevel,
  getSession,
  MILESTONES,
  type LevelId,
} from "../data/sessions";
import { isLevelComplete, statusOf, type ProgressState } from "../lib/progress";
import { Character } from "./Character";
import { Icon } from "./icons";
import { Modal } from "./Modal";

export type SheetTarget =
  | { kind: "station"; id: number }
  | { kind: "milestone"; level: LevelId }
  | null;
interface Props {
  target: SheetTarget;
  progress: ProgressState;
  onClose: () => void;
  onStart: (id: number, mode?: "learn" | "review") => void;
  onGoToCurrent: () => void;
}

/** Map dialogs contain navigation/status only. Objectives, activities and challenges live exclusively in LessonView. */
export function StationSheet({
  target,
  progress,
  onClose,
  onStart,
  onGoToCurrent,
}: Props) {
  if (!target) return null;
  if (target.kind === "milestone") {
    const info = MILESTONES[target.level - 1],
      achieved = isLevelComplete(target.level, progress.completed);
    return (
      <Modal
        open
        onClose={onClose}
        labelledBy="sheet-title"
        className="station-sheet milestone-sheet"
      >
        <div className="sheet-characters">
          <Character who={achieved ? "samiCheer" : "sami"} height={140} />
          <span className="sheet-award">
            <Icon name={info.icon} size={70} />
          </span>
        </div>
        <span className="eyebrow">ختام {getLevel(target.level).shortName}</span>
        <h2 id="sheet-title">{info.title}</h2>
        <p className="muted">
          {achieved
            ? info.desc
            : "جائزتنا تنتظرنا هنا. نواصل الحصص معًا، خطوة بعد خطوة."}
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {achieved ? "إنجاز أفتخر به" : "سأصل إليها"}
        </button>
      </Modal>
    );
  }
  const session = getSession(target.id);
  if (!session) return null;
  const status = statusOf(session.id, progress.completed);
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="sheet-title"
      className="station-sheet"
    >
      <span
        className={`dialog-emblem ${status === "locked" ? "is-locked" : ""}`}
      >
        <Icon name={status === "locked" ? "lock" : session.icon} size={34} />
      </span>
      <span className="eyebrow">
        <bdi>
          الحصة {session.id} · {getLevel(session.level).name}
        </bdi>
      </span>
      <h2 id="sheet-title">{session.title}</h2>
      <p className="muted">
        {status === "locked"
          ? "هذه المحطة لم تُفتح بعد. بعد إنهاء الحصة الحالية من إدارة الحصص، تضيء المحطة التالية."
          : status === "completed"
            ? "خطوة أنجزتها بالفعل. يمكنك العودة إليها للمراجعة."
            : "بطاقة محطتك الحالية تنتظرك على الخارطة."}
      </p>
      {status === "completed" && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onStart(session.id, "review")}
        >
          <Icon name="review" size={19} />
          مراجعة الحصة
        </button>
      )}
      <button
        type="button"
        className={`btn ${status === "completed" ? "btn-ghost" : "btn-primary"}`}
        onClick={onGoToCurrent}
      >
        <Icon name="pin" size={19} />
        العودة إلى محطتي
      </button>
    </Modal>
  );
}
