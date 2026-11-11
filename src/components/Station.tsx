import { Fragment } from "react";
import type { Session } from "../data/sessions";
import { labelRect, type Layout, type MapNode } from "../lib/mapLayout";
import type { StationStatus } from "../lib/progress";
import { Icon } from "./icons";

interface Props {
  session: Session;
  status: StationStatus;
  node: MapNode;
  layout: Layout;
  unlocking: boolean;
  justCompleted: boolean;
  onOpen: (id: number) => void;
}
const STATUS_TEXT: Record<StationStatus, string> = {
  completed: "مكتملة",
  current: "متاحة الآن",
  locked: "مغلقة",
};

export function Station({
  session,
  status,
  node,
  layout,
  unlocking,
  justCompleted,
  onOpen,
}: Props) {
  const size = layout.stationSize,
    label = labelRect(node, layout);
  return (
    <Fragment>
      <div
        className={`station is-${status} ${unlocking ? "is-unlocking" : ""} ${justCompleted ? "is-just-completed" : ""}`}
        data-station={session.id}
        style={{
          left: node.x - size / 2,
          top: node.y - size / 2,
          width: size,
          height: size,
        }}
      >
        {status === "current" && (
          <span className="station-you" aria-hidden="true">
            أنت هنا
          </span>
        )}
        <button
          type="button"
          className="station-btn"
          data-station-button={session.id}
          onClick={() => onOpen(session.id)}
          aria-label={`الحصة ${session.id}، ${STATUS_TEXT[status]}: ${session.title}`}
          aria-current={status === "current" ? "step" : undefined}
        >
          <span className="station-face">
            <Icon name={session.icon} size={layout.compact ? 34 : 33} />
          </span>
          <b className="station-number" aria-hidden="true">
            {session.id}
          </b>
          {(status === "locked" || unlocking) && (
            <span className="station-lock" aria-hidden="true">
              <Icon name="lock" size={17} />
            </span>
          )}
          {status === "completed" && (
            <span className="station-check" aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
          )}
        </button>
      </div>
      {status !== "current" && (
        <div
          className={`station-label is-${status}`}
          data-label={session.id}
          aria-hidden="true"
          style={{
            left: label.x,
            top: label.y,
            width: label.w,
            height: label.h,
          }}
        >
          {session.title}
        </div>
      )}
    </Fragment>
  );
}
