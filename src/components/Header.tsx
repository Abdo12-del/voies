import { getLevel } from "../data/sessions";
import { currentLevel, type ProgressState } from "../lib/progress";
import { Icon } from "./icons";

/** Two light, floating HUD groups; the landscape continues behind them. */
export function Header({
  progress,
  onPickSpeaker,
}: {
  progress: ProgressState;
  onPickSpeaker: () => void;
}) {
  const level = getLevel(currentLevel(progress.completed));
  return (
    <header className="app-header" aria-label="معلومات الرحلة">
      <div className="brand" data-hud="identity">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="mic" size={23} />
        </span>
        <div className="brand-text">
          <h1>رحلتي مع المتحدث الصغير</h1>
          <div className={`header-level level-${level.id}`}>
            <Icon name={level.id === 1 ? "leaf" : "sparkles"} size={15} />
            <span className="sr-only">{level.shortName}: </span>
            <strong>{level.name}</strong>
          </div>
        </div>
      </div>
      <div className="header-tools" data-hud="progress-and-wheel">
        <div className="header-progress">
          <div className="progress-caption">
            <bdi>أنجزنا {progress.completed} من 32 حصة</bdi>
          </div>
          <div
            className="journey-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={32}
            aria-valuenow={progress.completed}
            aria-label="تقدّم رحلتي"
            aria-valuetext={`أنجزنا ${progress.completed} من 32 حصة`}
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
                  <Icon name={part === 1 ? "medal" : "crown"} size={18} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="speaker-launch"
          onClick={onPickSpeaker}
          aria-label="مَن يتحدث؟"
          title="أسماء الطلبة وعجلة اختيار المتحدث"
        >
          <Icon name="wheel" size={20} />
          <span>مَن يتحدث؟</span>
        </button>
      </div>
    </header>
  );
}
