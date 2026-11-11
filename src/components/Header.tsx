import { TOTAL_SESSIONS, getLevel, getSession } from "../data/sessions";
import { currentLevel, currentSessionId, type ProgressState } from "../lib/progress";
import { MicIcon } from "./icons";

interface Props {
  progress: ProgressState;
}

export function Header({ progress }: Props) {
  const { completed, childName } = progress;
  const level = getLevel(currentLevel(completed));
  const currentId = currentSessionId(completed);
  const current = currentId ? getSession(currentId) : null;
  const pct = Math.round((completed / TOTAL_SESSIONS) * 100);

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-mic" aria-hidden="true">
            <MicIcon size={28} />
          </span>
          <div className="brand-text">
            <span className="brand-program">المتحدث الصغير</span>
            <h1 className="brand-title">{childName ? `رحلة ${childName} مع المتحدث الصغير` : "رحلتي مع المتحدث الصغير"}</h1>
          </div>
        </div>

        <div className="header-stats">
          <div className={`stat-chip level-chip level-${level.id}`}>
            <span className="stat-label">المستوى الحالي</span>
            <span className="stat-value">
              {level.id === 1 ? "الأول" : "الثاني"} · {level.name}
            </span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">الحصة الحالية</span>
            <span className="stat-value">{current ? `الحصة ${current.id}` : "أتممت الرحلة 🎉"}</span>
          </div>
        </div>

        <div className="header-progress">
          <div className="progress-row">
            <span className="progress-text">
              الحصص المكتملة: <b className="progress-count">{completed} / {TOTAL_SESSIONS}</b>
            </span>
          </div>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL_SESSIONS}
            aria-valuenow={completed}
            aria-label={`أكملت ${completed} من ${TOTAL_SESSIONS} حصة`}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
            <div className="progress-mid" title="نهاية المستوى الأول" />
          </div>
        </div>
      </div>
    </header>
  );
}
