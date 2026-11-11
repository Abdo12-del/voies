import { useEffect, useRef, useState } from "react";
import { TOTAL_SESSIONS, getSession } from "../data/sessions";
import {
  approveNext,
  lastApprovalLabel,
  resetJourney,
  setChildName,
  setPinHash,
  undoLast,
  type ProgressState,
} from "../lib/progress";
import { hashPin, isValidPin } from "../lib/pin";
import { CheckIcon, KeyIcon, LockIcon } from "./icons";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  progress: ProgressState;
  onClose: () => void;
  onApproved: () => void;
}

type View = "auth" | "setup" | "home" | "confirm-approve" | "confirm-undo" | "confirm-reset" | "change-pin";

const MAX_TRIES = 5;
const COOLDOWN_MS = 30_000;

/**
 * لوحة المدرّب/المسؤول — محمية برمز.
 * هي المكان الوحيد الذي يمكن منه اعتماد إكمال الحصة وفتح التي تليها.
 */
export function TeacherPanel({ open, progress, onClose, onApproved }: Props) {
  const [view, setView] = useState<View>("auth");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState(progress.childName);
  const [toast, setToast] = useState("");
  const tries = useRef(0);
  const lockedUntil = useRef(0);

  useEffect(() => {
    if (open) {
      setView(progress.pinHash ? "auth" : "setup");
      setPin("");
      setPin2("");
      setError("");
      setToast("");
      setName(progress.childName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const completed = progress.completed;
  const currentId = completed < TOTAL_SESSIONS ? completed + 1 : null;
  const current = currentId ? getSession(currentId) : null;
  const next = currentId && currentId < TOTAL_SESSIONS ? getSession(currentId + 1) : null;
  const lastDone = completed > 0 ? getSession(completed) : null;

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    const now = Date.now();
    if (now < lockedUntil.current) {
      setError(`محاولات كثيرة. انتظر ${Math.ceil((lockedUntil.current - now) / 1000)} ثانية.`);
      return;
    }
    if ((await hashPin(pin)) === progress.pinHash) {
      tries.current = 0;
      setPin("");
      setError("");
      setView("home");
    } else {
      tries.current += 1;
      setPin("");
      if (tries.current >= MAX_TRIES) {
        lockedUntil.current = Date.now() + COOLDOWN_MS;
        tries.current = 0;
        setError("الرمز غير صحيح. أُوقفت المحاولة 30 ثانية.");
      } else {
        setError("الرمز غير صحيح، حاول مرة أخرى.");
      }
    }
  }

  async function submitNewPin(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPin(pin)) return setError("الرمز من 4 إلى 8 أرقام.");
    if (pin !== pin2) return setError("الرمزان غير متطابقين.");
    setPinHash(await hashPin(pin));
    setPin("");
    setPin2("");
    setError("");
    setToast("تم حفظ رمز المدرّب ✓");
    setView("home");
  }

  function doApprove() {
    if (approveNext()) {
      onApproved();
    }
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="teacher-title" className="teacher">
      <div className="teacher-head">
        <span className="teacher-badge">
          <KeyIcon size={18} /> لوحة المدرّب
        </span>
        <h2 id="teacher-title" className="teacher-title">
          {view === "setup" ? "إنشاء رمز المدرّب" : view === "auth" ? "دخول المدرّب" : "متابعة رحلة الطفل"}
        </h2>
      </div>

      {view === "setup" && (
        <form className="teacher-form" onSubmit={submitNewPin}>
          <p className="teacher-note">
            هذه اللوحة للمدرّب أو المسؤول فقط. أنشئ رمزًا سريًا (4–8 أرقام) لا يعرفه الطفل؛ سيُطلب في كل مرة لاعتماد الحصص.
          </p>
          <PinField label="الرمز الجديد" value={pin} onChange={setPin} autoFocus />
          <PinField label="تأكيد الرمز" value={pin2} onChange={setPin2} />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit">
            حفظ الرمز والمتابعة
          </button>
        </form>
      )}

      {view === "auth" && (
        <form className="teacher-form" onSubmit={submitAuth}>
          <p className="teacher-note">أدخل رمز المدرّب لاعتماد إكمال الحصص.</p>
          <PinField label="رمز المدرّب" value={pin} onChange={setPin} autoFocus />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={pin.length < 4}>
            دخول
          </button>
        </form>
      )}

      {view === "change-pin" && (
        <form className="teacher-form" onSubmit={submitNewPin}>
          <PinField label="الرمز الجديد" value={pin} onChange={setPin} autoFocus />
          <PinField label="تأكيد الرمز" value={pin2} onChange={setPin2} />
          {error && <p className="form-error">{error}</p>}
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">
              حفظ
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setView("home")}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {view === "home" && (
        <div className="teacher-home">
          {toast && <div className="teacher-toast">{toast}</div>}

          <div className="teacher-status">
            <div>
              <span className="ts-label">الحصص المكتملة</span>
              <span className="ts-value">
                {completed} / {TOTAL_SESSIONS}
              </span>
            </div>
            <div>
              <span className="ts-label">الحصة الحالية</span>
              <span className="ts-value">{current ? `${current.id}. ${current.title}` : "أتمّ الطفل الرحلة 🎉"}</span>
            </div>
          </div>

          {current ? (
            <button type="button" className="btn btn-approve" onClick={() => setView("confirm-approve")}>
              <CheckIcon size={22} />
              <span>
                اعتماد إكمال الحصة {current.id}
                <small>{next ? `وفتح الحصة ${next.id}` : "وإتمام الرحلة"}</small>
              </span>
            </button>
          ) : (
            <p className="teacher-note is-success">جميع الحصص الـ32 معتمدة. 🏆</p>
          )}

          <label className="field">
            <span>اسم الطفل (يظهر في أعلى الخارطة — اختياري)</span>
            <div className="row-actions">
              <input
                type="text"
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سارة"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setChildName(name);
                  flash("تم حفظ الاسم ✓");
                }}
              >
                حفظ
              </button>
            </div>
          </label>

          {lastApprovalLabel(progress) && (
            <p className="teacher-last">
              آخر اعتماد: <span>{lastApprovalLabel(progress)}</span>
            </p>
          )}

          <div className="teacher-secondary">
            <button type="button" className="btn btn-ghost btn-sm" disabled={!lastDone} onClick={() => setView("confirm-undo")}>
              ↶ تراجع عن آخر اعتماد
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setError(""); setView("change-pin"); }}>
              <KeyIcon size={16} /> تغيير الرمز
            </button>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setView("confirm-reset")}>
              إعادة ضبط الرحلة
            </button>
          </div>

          <button type="button" className="btn btn-ghost lock-panel" onClick={onClose}>
            <LockIcon size={16} /> قفل اللوحة والعودة إلى الخارطة
          </button>
        </div>
      )}

      {view === "confirm-approve" && current && (
        <div className="teacher-confirm">
          <p className="confirm-q">هل أكمل الطفل هذه الحصة فعلًا؟</p>
          <div className="confirm-card">
            <span className="confirm-done">
              ✓ الحصة {current.id}: {current.title}
            </span>
            {next ? (
              <span className="confirm-next">
                🔓 ستُفتح: الحصة {next.id}: {next.title}
              </span>
            ) : (
              <span className="confirm-next">🏆 سيتم إتمام الرحلة كاملة</span>
            )}
            {current.id === 16 && <span className="confirm-next">🏅 وسيُمنح وسام المتحدث الواثق ويُفتح المستوى الثاني</span>}
          </div>
          <div className="row-actions">
            <button type="button" className="btn btn-approve btn-approve--sm" onClick={doApprove}>
              نعم، اعتمد وافتح التالية
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("home")}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {view === "confirm-undo" && lastDone && (
        <div className="teacher-confirm">
          <p className="confirm-q">التراجع عن اعتماد الحصة {lastDone.id}؟</p>
          <p className="teacher-note">
            ستعود الحصة {lastDone.id} «{lastDone.title}» حصةً حالية، وتُقفل الحصة التي بعدها.
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                undoLast();
                flash("تم التراجع ✓");
                setView("home");
              }}
            >
              نعم، تراجع
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("home")}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {view === "confirm-reset" && (
        <div className="teacher-confirm">
          <p className="confirm-q">إعادة الرحلة من البداية؟</p>
          <p className="teacher-note">ستُقفل جميع الحصص ما عدا الحصة الأولى، ويُمحى سجل الاعتمادات. (يبقى رمز المدرّب كما هو.)</p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                resetJourney();
                flash("أُعيد ضبط الرحلة ✓");
                setView("home");
              }}
            >
              نعم، أعد الضبط
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("home")}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d*"
        maxLength={8}
        value={value}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="pin-input"
        dir="ltr"
      />
    </label>
  );
}
