import { getLevel } from "../data/sessions";
import { currentLevel, type ProgressState } from "../lib/progress";
import { Icon } from "./icons";

export function Header({
  progress,
  onAccount,
}: {
  progress: ProgressState;
  onAccount: () => void;
}) {
  const level = getLevel(currentLevel(progress.completed));
  const status =
    progress.mode === "demo"
      ? "وضع تجريبي"
      : progress.profile
        ? progress.connection === "offline"
          ? "المزامنة غير متصلة"
          : progress.profile.name
        : "دخول التلميذ";
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="mic" size={29} />
          <i />
        </span>
        <div className="brand-text">
          <span className="brand-eyebrow">صوت صغير، أثر كبير</span>
          <h1>رحلتي مع المتحدث الصغير</h1>
        </div>
      </div>
      <div className={`header-level level-${level.id}`}>
        <span className="level-leaf">
          <Icon name={level.id === 1 ? "leaf" : "sparkles"} size={24} />
        </span>
        <div>
          <span>{level.shortName}</span>
          <strong>{level.name}</strong>
        </div>
      </div>
      <div className="header-progress">
        <div className="progress-caption">
          <bdi>أنجزت {progress.completed} من 32 حصة</bdi>
          <span>{Math.round((progress.completed / 32) * 100)}٪</span>
        </div>
        <div
          className="journey-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={32}
          aria-valuenow={progress.completed}
          aria-label="تقدّم رحلتي"
          aria-valuetext={`أنجزت ${progress.completed} من 32 حصة`}
        >
          {[1, 2].map((part) => (
            <div key={part} className={`progress-part part-${part}`}>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(Math.max(0, Math.min(16, progress.completed - (part - 1) * 16)) / 16) * 100}%`,
                  }}
                />
              </div>
              <span
                className={`progress-award ${progress.completed >= part * 16 ? "achieved" : ""}`}
              >
                <Icon name={part === 1 ? "medal" : "crown"} size={21} />
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`account-status ${progress.mode === "demo" ? "is-demo" : ""}`}
          onClick={onAccount}
        >
          <Icon
            name={
              progress.mode === "demo"
                ? "info"
                : progress.profile
                  ? "wifi"
                  : "key"
            }
            size={13}
          />
          <span>{status}</span>
        </button>
      </div>
    </header>
  );
}
