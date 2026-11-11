import { MILESTONES, getLevel, getSession, type LevelId } from "../data/sessions";
import { isLevelComplete, statusOf, type ProgressState } from "../lib/progress";
import { Character } from "./Character";
import { CheckIcon, LockIcon, PinIcon, PlayIcon, ReviewIcon } from "./icons";
import { Modal } from "./Modal";

export type SheetTarget = { kind: "station"; id: number } | { kind: "milestone"; level: LevelId } | null;

interface Props {
  target: SheetTarget;
  progress: ProgressState;
  onClose: () => void;
  onStart: (id: number, mode: "learn" | "review") => void;
  onGoToCurrent: () => void;
}

export function StationSheet({ target, progress, onClose, onStart, onGoToCurrent }: Props) {
  const open = target !== null;
  return (
    <Modal open={open} onClose={onClose} labelledBy="sheet-title" className="sheet">
      {target?.kind === "station" && (
        <StationContent id={target.id} progress={progress} onStart={onStart} onGoToCurrent={onGoToCurrent} onClose={onClose} />
      )}
      {target?.kind === "milestone" && <MilestoneContent level={target.level} progress={progress} onClose={onClose} />}
    </Modal>
  );
}

function StationContent({
  id,
  progress,
  onStart,
  onGoToCurrent,
  onClose,
}: {
  id: number;
  progress: ProgressState;
  onStart: Props["onStart"];
  onGoToCurrent: () => void;
  onClose: () => void;
}) {
  const s = getSession(id)!;
  const status = statusOf(id, progress.completed);
  const level = getLevel(s.level);

  if (status === "locked") {
    return (
      <div className={`sheet-body is-locked level-${s.level}`}>
        <div className="sheet-hero">
          <span className="sheet-disc sheet-disc--locked">
            <LockIcon size={38} />
          </span>
        </div>
        <span className="sheet-kicker">
          الحصة {s.id} · {level.name}
        </span>
        <h2 id="sheet-title" className="sheet-title">
          {s.title}
        </h2>
        <p className="sheet-locked-msg">هذه المحطة لم تُفتح بعد. أكمل رحلتك للوصول إليها</p>
        <p className="sheet-hint">ستُفتح لاحقًا عندما يعتمد مدرّبك إكمال المحطات التي قبلها 🔒</p>
        <div className="sheet-actions">
          <button type="button" className="btn btn-primary" onClick={onGoToCurrent}>
            <PinIcon size={18} /> اذهب إلى محطتي الحالية
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            حسنًا
          </button>
        </div>
      </div>
    );
  }

  const isDone = status === "completed";
  return (
    <div className={`sheet-body level-${s.level} ${isDone ? "is-completed" : "is-current"}`}>
      <div className="sheet-hero">
        <span className={`sheet-disc ${isDone ? "sheet-disc--done" : "sheet-disc--current"}`}>
          <span className="sheet-disc-icon" aria-hidden="true">
            {s.icon}
          </span>
          {isDone && (
            <span className="sheet-disc-check">
              <CheckIcon size={18} />
            </span>
          )}
        </span>
      </div>
      <span className={`sheet-status ${isDone ? "is-done" : "is-now"}`}>{isDone ? "✓ حصة مكتملة" : "✨ متاحة الآن"}</span>
      <span className="sheet-kicker">
        الحصة {s.id} من 32 · {level.name}
      </span>
      <h2 id="sheet-title" className="sheet-title">
        {s.title}
      </h2>
      <p className="sheet-desc">{s.desc}</p>
      <div className="sheet-actions">
        {isDone ? (
          <button type="button" className="btn btn-review" onClick={() => onStart(s.id, "review")}>
            <ReviewIcon size={20} /> مراجعة الحصة
          </button>
        ) : (
          <button type="button" className="btn btn-start" onClick={() => onStart(s.id, "learn")}>
            <PlayIcon size={20} /> ابدأ الحصة
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          العودة إلى الخارطة
        </button>
      </div>
    </div>
  );
}

function MilestoneContent({ level, progress, onClose }: { level: LevelId; progress: ProgressState; onClose: () => void }) {
  const m = MILESTONES.find((x) => x.level === level)!;
  const achieved = isLevelComplete(level, progress.completed);
  const lv = getLevel(level);
  return (
    <div className={`sheet-body milestone-sheet ${achieved ? "is-achieved" : "is-pending"}`}>
      <div className="sheet-hero sheet-hero--milestone">
        <Character who={achieved ? "samiCheer" : "sami"} height={150} className={achieved ? "hop-once" : ""} />
        <span className="sheet-trophy" aria-hidden="true">
          {m.icon}
        </span>
      </div>
      <span className="sheet-kicker">محطة إنجاز · نهاية {lv.shortName}</span>
      <h2 id="sheet-title" className="sheet-title">
        {m.title}
      </h2>
      {achieved ? (
        <p className="sheet-desc">{m.desc}</p>
      ) : (
        <p className="sheet-locked-msg">
          هذه الجائزة تنتظرك في نهاية {lv.shortName} «{lv.name}». أكمل محطاتك واحدة تلو الأخرى لتصل إليها!
        </p>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {achieved ? "رائع!" : "سأصل إليها!"}
        </button>
      </div>
    </div>
  );
}
