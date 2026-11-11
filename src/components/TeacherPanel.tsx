import { useEffect, useState, type FormEvent } from "react";
import { getSession } from "../data/sessions";
import {
  addStudent,
  approveNext,
  logout,
  refreshProgress,
  selectStudent,
  undoLast,
  type ProgressState,
} from "../lib/progress";
import { LoginForm } from "./AuthPanel";
import { Icon } from "./icons";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  progress: ProgressState;
  onClose: () => void;
  onApproved: () => void;
}
type Confirm = {
  action: "approve" | "undo";
  id: string;
  name: string;
  count: number;
} | null;

/** The browser never assigns roles or edits counts: all mutations are verified again in Postgres. */
export function TeacherPanel({ open, progress, onClose, onApproved }: Props) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [adding, setAdding] = useState(false),
    [name, setName] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const student = progress.students.find((s) => s.id === progress.studentId);
  useEffect(() => {
    if (open) {
      setConfirm(null);
      setAdding(false);
      setNewCode(null);
      setName("");
      setError("");
      setToast("");
    }
  }, [open]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await addStudent(name);
      setNewCode(data.login_code);
      setAdding(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّرت الإضافة.");
    } finally {
      setBusy(false);
    }
  };
  const mutate = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    setError("");
    try {
      if (confirm.action === "approve")
        await approveNext(confirm.id, confirm.count);
      else await undoLast(confirm.id, confirm.count);
      setConfirm(null);
      if (confirm.action === "approve") onApproved();
      else setToast("تم التراجع عن آخر اعتماد فقط.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر الاعتماد.");
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="teacher-title"
      className={`teacher-panel ${progress.profile?.role === "teacher" ? "is-dashboard" : ""}`}
      dismissible={!busy}
    >
      <span className="eyebrow">
        <Icon name="teacher" size={19} /> مساحة المدرّب
      </span>
      <h2 id="teacher-title">
        {progress.profile?.role === "teacher"
          ? "خطوات صغيرة، إنجازات كبيرة"
          : "دخول المدرّب"}
      </h2>
      {progress.mode === "demo" ? (
        <div className="demo-note">
          <span className="demo-label">
            <Icon name="info" size={18} /> لوحة تجريبية للعرض فقط
          </span>
          <p>
            الاعتماد وإضافة التلاميذ يتطلبان حساب مدرّب حقيقيًا بعد إعداد
            Supabase. لا توجد كلمة مرور ينشئها أول زائر، ولا يمكن تغيير التقدّم
            من هذه المعاينة.
          </p>
          <div className="student-demo">
            <span className="student-avatar">ت</span>
            <div>
              <strong>تلميذ تجريبي</strong>
              <p>
                <bdi>0 من 32 حصة مكتملة</bdi>
              </p>
            </div>
            <Icon name="lock" size={22} />
          </div>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            العودة إلى الخارطة
          </button>
        </div>
      ) : progress.profile?.role !== "teacher" ? (
        <>
          <LoginForm teacherOnly />
          {progress.error && (
            <p className="form-error" role="alert">
              {progress.error}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="teacher-toolbar">
            <p className="muted">
              أهلًا {progress.profile.name}، الاعتماد يفتح حصة واحدة فقط.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => {
                setAdding(!adding);
                setNewCode(null);
                setConfirm(null);
                setError("");
              }}
            >
              <Icon name="plus" size={17} />
              إضافة تلميذ
            </button>
          </div>
          {(error || progress.error) && (
            <p className="form-error" role="alert">
              {error || progress.error}
            </p>
          )}
          {toast && (
            <p className="success-note" role="status">
              <Icon name="check" size={18} />
              {toast}
            </p>
          )}
          {adding ? (
            <form className="add-student-form" onSubmit={create}>
              <h3>رفيق جديد في الرحلة</h3>
              <label className="field">
                <span>اسم التلميذ</span>
                <input
                  value={name}
                  maxLength={60}
                  required
                  autoComplete="off"
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <p className="muted">
                سننشئ له رمز دخول خاصًا، وتبدأ رحلته بالحصة الأولى فقط.
              </p>
              <div className="row-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                >
                  {busy ? "نجهّز الرحلة…" : "إضافة وتوليد رمز الدخول"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setAdding(false)}
                  disabled={busy}
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : newCode ? (
            <div className="new-code">
              <Icon name="key" size={34} />
              <h3>رحلة جديدة جاهزة!</h3>
              <p>رمز دخول التلميذ — يظهر هنا مرة واحدة</p>
              <bdi dir="ltr" className="generated-code">
                {newCode}
              </bdi>
              <p className="form-note">
                احفظه وشاركه مع التلميذ فقط. يتيح الرمز قراءة تقدّمه ولا يمنحه
                صلاحية الاعتماد.
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(newCode)
                      .then(() => setToast("تم نسخ الرمز."))
                      .catch(() => setError("انسخ الرمز الظاهر يدويًا."));
                  }}
                >
                  <Icon name="copy" size={18} />
                  نسخ الرمز
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setNewCode(null)}
                >
                  حفظت الرمز
                </button>
              </div>
            </div>
          ) : confirm ? (
            <div className="teacher-confirm">
              <span className="confirm-symbol">
                <Icon
                  name={confirm.action === "approve" ? "check" : "review"}
                  size={32}
                />
              </span>
              <h3>
                {confirm.action === "approve"
                  ? `هل أكمل ${confirm.name} الحصة ${confirm.count + 1}؟`
                  : `التراجع عن اعتماد الحصة ${confirm.count}؟`}
              </h3>
              <div className="confirm-card">
                <strong>
                  {
                    getSession(
                      confirm.action === "approve"
                        ? confirm.count + 1
                        : confirm.count,
                    )?.title
                  }
                </strong>
                <p>
                  {confirm.action === "undo"
                    ? "تُلغى آخر خطوة فقط، وتُغلق الحصة التالية من جديد."
                    : confirm.count === 31
                      ? "سيكتمل المستوى الثاني وتُمنح جائزة ختام الرحلة."
                      : confirm.count === 15
                        ? "سيُمنح وسام المستوى الأول وتُفتح الحصة 17، دون قفز."
                        : `ستُفتح الحصة ${confirm.count + 2} فقط بعد هذا الاعتماد.`}
                </p>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    void mutate();
                  }}
                >
                  {busy
                    ? "نحفظ الاعتماد…"
                    : confirm.action === "approve"
                      ? "نعم، اعتمد الحصة"
                      : "نعم، تراجع خطوة واحدة"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    setConfirm(null);
                    setError("");
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div className="teacher-dashboard">
              <section className="students-list" aria-label="تلاميذي">
                <h3>
                  تلاميذي <span>{progress.students.length}</span>
                </h3>
                {progress.students.length === 0 && (
                  <p className="empty-state">
                    لا تلاميذ بعد. أضف تلميذك الأول لنبدأ.
                  </p>
                )}
                {progress.students.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`student-row ${s.id === progress.studentId ? "active" : ""}`}
                    aria-pressed={s.id === progress.studentId}
                    onClick={() => {
                      selectStudent(s.id);
                      setError("");
                    }}
                  >
                    <span className="student-avatar">{s.name.slice(0, 1)}</span>
                    <span className="student-row-info">
                      <strong>{s.name}</strong>
                      <span className="student-mini-track">
                        <i style={{ width: `${(s.completed / 32) * 100}%` }} />
                      </span>
                    </span>
                    <bdi>{s.completed}/32</bdi>
                  </button>
                ))}
              </section>
              <section
                className="student-detail"
                aria-label="متابعة التلميذ المحدد"
              >
                {student ? (
                  <>
                    <span className="eyebrow">رحلة {student.name}</span>
                    <h3>
                      {student.completed === 32
                        ? "اكتملت الحكاية بنجاح"
                        : `الحصة ${student.completed + 1}`}
                    </h3>
                    <p className="student-session-title">
                      {student.completed < 32
                        ? getSession(student.completed + 1)?.title
                        : "متحدث واثق ومؤثر"}
                    </p>
                    <p className="teacher-count">
                      <bdi>{student.completed} من 32 حصة معتمدة</bdi>
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-approve"
                      disabled={student.completed >= 32 || busy}
                      onClick={() => {
                        setConfirm({
                          action: "approve",
                          id: student.id,
                          name: student.name,
                          count: student.completed,
                        });
                        setError("");
                      }}
                    >
                      <Icon
                        name={student.completed === 32 ? "crown" : "check"}
                        size={22}
                      />
                      {student.completed === 32
                        ? "جميع الحصص معتمدة"
                        : "اعتماد الحصة التالية"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={student.completed === 0 || busy}
                      onClick={() => {
                        setConfirm({
                          action: "undo",
                          id: student.id,
                          name: student.name,
                          count: student.completed,
                        });
                        setError("");
                      }}
                    >
                      <Icon name="review" size={17} />
                      التراجع عن آخر اعتماد
                    </button>
                    {student.updated_at && (
                      <p className="form-note">
                        آخر تحديث:{" "}
                        <bdi>
                          {new Date(student.updated_at).toLocaleDateString(
                            "ar",
                            { day: "numeric", month: "long" },
                          )}
                        </bdi>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="empty-detail">
                    <Icon name="leaf" size={40} />
                    <p>كل رحلة تبدأ بخطوة.</p>
                  </div>
                )}
              </section>
            </div>
          )}
          <div className="teacher-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                void refreshProgress()
                  .then(() => setToast("التقدّم محدّث."))
                  .catch(() => setError("تعذّر التحديث."));
              }}
            >
              <Icon name="review" size={16} />
              تحديث
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                void logout()
                  .then(onClose)
                  .catch(() => setError("تعذّر تسجيل الخروج."));
              }}
            >
              <Icon name="logout" size={16} />
              تسجيل خروج المدرّب
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
