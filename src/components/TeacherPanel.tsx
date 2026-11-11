import { useEffect, useState } from "react";
import { getSession } from "../data/sessions";
import {
  approveNext,
  resetProgress,
  undoLast,
  type ProgressState,
} from "../lib/progress";
import { Icon } from "./icons";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  progress: ProgressState;
  onClose: () => void;
  onApproved: () => void;
}

/** The existing trainer panel is now a simple classroom control, without accounts. */
export function TeacherPanel({ open, progress, onClose, onApproved }: Props) {
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    if (open) setResetting(false);
  }, [open]);
  const session = getSession(progress.completed + 1);
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="controls-title"
      className="lesson-controls"
    >
      <span className="eyebrow">
        <Icon name="book" size={19} /> رحلتنا في الصف
      </span>
      <h2 id="controls-title">إدارة الحصص</h2>
      <p className="muted">تحكّم بسيط في الحصة التي ندرسها معًا.</p>
      <div className="class-progress">
        <bdi>أنجزنا {progress.completed} من 32 حصة</bdi>
        <span>
          <i style={{ width: `${(progress.completed / 32) * 100}%` }} />
        </span>
      </div>
      {resetting ? (
        <div className="class-reset">
          <h3>نبدأ الرحلة من جديد؟</h3>
          <p>سنعود إلى الحصة الأولى. أسماء الطلبة تبقى محفوظة.</p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetProgress();
                onApproved();
              }}
            >
              نعم، رحلة جديدة
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setResetting(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="class-current">
            <span className="eyebrow">
              {session ? `الحصة الحالية · ${session.id}` : "أحسنتم جميعًا"}
            </span>
            <h3>{session?.title ?? "أتممنا الرحلة كاملة!"}</h3>
            {session && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (approveNext(progress.completed)) onApproved();
                }}
              >
                <Icon name="check" size={21} />
                {progress.completed === 31
                  ? "إنهاء الرحلة"
                  : "إنهاء الحصة وفتح التالية"}
              </button>
            )}
          </div>
          <div className="class-control-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={progress.completed === 0}
              onClick={() => {
                if (undoLast(progress.completed)) onApproved();
              }}
            >
              <Icon name="review" size={18} /> التراجع عن آخر حصة
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={progress.completed === 0}
              onClick={() => setResetting(true)}
            >
              بدء رحلة جديدة
            </button>
          </div>
        </>
      )}
      <p
        className="form-note classroom-save-note"
        role={progress.storageAvailable ? undefined : "status"}
      >
        {progress.storageAvailable
          ? "يُحفظ التقدّم تلقائيًا في هذا المتصفح، دون حسابات."
          : "الحفظ في المتصفح غير متاح. يمكنك المتابعة، لكن التقدّم سيبقى لهذه الجلسة فقط."}
      </p>
    </Modal>
  );
}
