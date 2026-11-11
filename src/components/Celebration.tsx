import { useMemo } from "react";
import { MILESTONES, getLevel, type LevelId } from "../data/sessions";
import { Character } from "./Character";
import { Modal } from "./Modal";

interface Props {
  level: LevelId | null;
  onClose: () => void;
}

const COLORS = ["#ffc93c", "#42a5f5", "#ff8fab", "#7c4dff", "#22b07d", "#ff8f3d"];

/** احتفال قصير وهادئ عند إتمام مستوى كامل */
export function Celebration({ level, onClose }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.round((i / 26) * 100 + (Math.random() * 4 - 2)),
        delay: Math.round(Math.random() * 700),
        dur: 2200 + Math.round(Math.random() * 900),
        color: COLORS[i % COLORS.length],
        rot: Math.round(Math.random() * 360),
        round: i % 3 === 0,
      })),
    [level],
  );

  if (!level) return null;
  const m = MILESTONES.find((x) => x.level === level)!;
  const lv = getLevel(level);
  const final = level === 2;

  return (
    <Modal open={!!level} onClose={onClose} labelledBy="celebrate-title" className="celebrate">
      <div className="confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className={`confetti-piece ${p.round ? "is-round" : ""}`}
            style={
              {
                left: `${p.left}%`,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.dur}ms`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="celebrate-stage">
        {final ? (
          <>
            <Character who="lailaPoint" height={150} className="slide-in-right" />
            <Character who="samiCheer" height={180} className="hop" />
            <Character who="sisterWave" height={140} className="slide-in-left" />
          </>
        ) : (
          <>
            <Character who="samiCheer" height={180} className="hop" />
            <Character who="lailaPoint" height={150} className="slide-in-left" />
          </>
        )}
      </div>

      <div className="celebrate-body">
        <div className="celebrate-medal" aria-hidden="true">
          {m.icon}
        </div>
        <h2 id="celebrate-title" className="celebrate-title">
          {final ? "أتممتَ الرحلة كلها!" : "أحسنت! أتممتَ المستوى الأول"}
        </h2>
        <p className="celebrate-sub">
          حصلتَ على <b>{m.title}</b> {final ? "بعد أن أتممتَ المستويين" : `في ختام «${lv.name}»`}
        </p>
        <p className="celebrate-text">
          {final
            ? "من متحدث صغير إلى متحدث واثق ومؤثر… رسالتك تصل! نحن فخورون بك."
            : "رحلتك تستمر الآن إلى منطقة «المتحدث المؤثر والمطبق». ليلى تشير إلى الطريق!"}
        </p>
        <button type="button" className="btn btn-start" onClick={onClose} data-autofocus>
          {final ? "رائع! 🎉" : "هيا نواصل الرحلة!"}
        </button>
      </div>
    </Modal>
  );
}
