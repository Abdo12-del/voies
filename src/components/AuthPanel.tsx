import { useState, type FormEvent } from "react";
import {
  loginStudent,
  loginTeacher,
  logout,
  refreshProgress,
  type ProgressState,
} from "../lib/progress";
import { Icon } from "./icons";
import { Modal } from "./Modal";

export function LoginForm({
  teacherOnly = false,
  onSuccess,
}: {
  teacherOnly?: boolean;
  onSuccess?: () => void;
}) {
  const [role, setRole] = useState<"student" | "teacher">(
    teacherOnly ? "teacher" : "student",
  );
  const [code, setCode] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (role === "teacher") await loginTeacher(email, password);
      else await loginStudent(code);
      setPassword("");
      setCode("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!teacherOnly && (
        <div className="auth-tabs" role="group" aria-label="نوع الحساب">
          <button
            type="button"
            className={role === "student" ? "active" : ""}
            aria-pressed={role === "student"}
            onClick={() => {
              setRole("student");
              setError("");
            }}
          >
            أنا تلميذ
          </button>
          <button
            type="button"
            className={role === "teacher" ? "active" : ""}
            aria-pressed={role === "teacher"}
            onClick={() => {
              setRole("teacher");
              setError("");
            }}
          >
            أنا مدرّب
          </button>
        </div>
      )}
      <form className="auth-form" onSubmit={submit}>
        {role === "student" ? (
          <>
            <p className="muted">
              أدخل الرمز الذي أعطاك إياه مدرّبك، ولنكمل حكايتك.
            </p>
            <label className="field">
              <span>رمز الدخول</span>
              <input
                className="code-input"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={16}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABCD2-EFGH3"
                required
                disabled={busy}
              />
            </label>
          </>
        ) : (
          <>
            <p className="muted">
              تسجيل الدخول بحساب المدرّب المعتمد في البرنامج.
            </p>
            <label className="field">
              <span>البريد الإلكتروني</span>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>كلمة المرور</span>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={busy}
              />
            </label>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Icon name="key" size={19} />
          {busy ? "نتحقّق من حسابك…" : "دخول آمن"}
        </button>
        {role === "teacher" && (
          <p className="form-note">
            ينشئ مسؤول البرنامج حساب المدرّب. لا يمنح أول دخول أي صلاحيات إدارية.
          </p>
        )}
      </form>
    </>
  );
}

export function AuthPanel({
  open,
  onClose,
  progress,
}: {
  open: boolean;
  onClose: () => void;
  progress: ProgressState;
}) {
  const [error, setError] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="account-title"
      className="account-panel"
    >
      <span className="dialog-emblem">
        <Icon name={progress.mode === "demo" ? "leaf" : "key"} size={30} />
      </span>
      <span className="eyebrow">المتحدث الصغير</span>
      <h2 id="account-title">
        {progress.mode === "demo"
          ? "هذه بداية الحكاية"
          : progress.profile
            ? `أهلًا، ${progress.profile.name}`
            : "رحلتك تنتظرك"}
      </h2>
      {progress.mode === "demo" ? (
        <div className="demo-note">
          <p>
            أنت في وضع تجريبي للعرض فقط. الحصة الأولى متاحة، ولا يمكن اعتماد
            الحصص أو تعديل التقدّم هنا.
          </p>
          <p>
            بعد إعداد Supabase، يدخل التلميذ برمز من مدرّبه، ويُحفظ تقدّمه بأمان
            عبر أجهزته.
          </p>
          {progress.error && <p className="form-error">{progress.error}</p>}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            لنستكشف الخارطة
          </button>
        </div>
      ) : progress.profile ? (
        <div className="account-summary">
          <p className="muted">
            نوع الحساب: {progress.profile.role === "teacher" ? "مدرّب" : "تلميذ"}{" "}
            ·{" "}
            {progress.connection === "live"
              ? "المزامنة الفورية متصلة"
              : "المزامنة غير متصلة حاليًا"}
          </p>
          {progress.error && (
            <p role="alert" className="form-error">
              {progress.error}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              void refreshProgress().catch(() =>
                setError("تعذّر التحديث. تحقّق من اتصالك."),
              );
            }}
          >
            <Icon name="review" size={18} />
            تحديث التقدّم
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void logout()
                .then(onClose)
                .catch(() => setError("تعذّر الخروج. حاول مجددًا."));
            }}
          >
            <Icon name="logout" size={18} />
            تسجيل الخروج
          </button>
        </div>
      ) : (
        <LoginForm onSuccess={onClose} />
      )}
    </Modal>
  );
}
