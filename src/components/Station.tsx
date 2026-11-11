import type { Session } from "../data/sessions";
import type { StationStatus } from "../lib/progress";
import { CheckIcon, LockIcon, PlayIcon } from "./icons";

interface Props {
  session: Session;
  status: StationStatus;
  x: number;
  y: number;
  size: number;
  /** إزاحة عنوان المحطة أفقيًا (لإبعاده عن منعطف الطريق) */
  labelShift: number;
  labelWidth: number;
  unlocking: boolean;
  justCompleted: boolean;
  introDelay: number;
  onOpen: (id: number) => void;
  onStart: (id: number) => void;
}

const STATUS_TEXT: Record<StationStatus, string> = {
  completed: "مكتملة",
  current: "متاحة الآن",
  locked: "مقفلة",
};

export function Station({
  session,
  status,
  x,
  y,
  size,
  labelShift,
  labelWidth,
  unlocking,
  justCompleted,
  introDelay,
  onOpen,
  onStart,
}: Props) {
  const cls = [
    "station",
    `is-${status}`,
    `level-${session.level}`,
    unlocking ? "is-unlocking" : "",
    justCompleted ? "is-just-completed" : "",
  ].join(" ");

  return (
    <div
      className={cls}
      data-station={session.id}
      style={
        {
          left: x,
          top: y,
          "--size": `${size}px`,
          "--intro-delay": `${introDelay}ms`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="station-btn"
        onClick={() => onOpen(session.id)}
        aria-label={`الحصة ${session.id}: ${session.title} — ${STATUS_TEXT[status]}`}
      >
        {status === "current" && (
          <>
            <span className="station-glow" aria-hidden="true" />
            <span className="station-sparkles" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </>
        )}
        <span className="puck">
          <span className="puck-face">
            {status === "locked" || unlocking ? (
              <>
                <span className="station-lock">
                  <LockIcon size={Math.round(size * 0.4)} />
                </span>
                {unlocking && <span className="station-num station-num--reveal">{session.id}</span>}
              </>
            ) : (
              <span className="station-num">{session.id}</span>
            )}
          </span>
        </span>
        <span className="station-icon" aria-hidden="true">
          {session.icon}
        </span>
        {status === "locked" && !unlocking && (
          <span className="station-badge-num" aria-hidden="true">
            {session.id}
          </span>
        )}
        {status === "completed" && (
          <span className="station-check" aria-hidden="true">
            <CheckIcon size={Math.round(size * 0.24)} />
          </span>
        )}
      </button>

      <div
        className="station-label"
        style={{
          width: labelWidth,
          transform: `translateX(calc(-50% + ${labelShift}px))`,
          // في أطراف الصفوف يلتصق العنوان بجهة المحطة (الاتجاه RTL: البداية = اليمين)
          alignItems: labelShift < 0 ? "flex-start" : labelShift > 0 ? "flex-end" : "center",
        }}
      >
        <button type="button" className="station-label-text" onClick={() => onOpen(session.id)} tabIndex={-1}>
          {status === "current" && <span className="station-label-now">محطتك الآن · الحصة {session.id}</span>}
          <span className="station-label-title">{session.title}</span>
        </button>
        {status === "current" && !unlocking && (
          <button type="button" className="btn btn-start btn-sm station-start" onClick={() => onStart(session.id)}>
            <PlayIcon size={15} />
            ابدأ الحصة
          </button>
        )}
      </div>
    </div>
  );
}
