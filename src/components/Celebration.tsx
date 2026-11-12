import { MILESTONES, type LevelId } from "../data/sessions";
import { Character } from "./Character";
import { Icon } from "./icons";
import { Modal } from "./Modal";

/** A short, quiet, finite celebration. No flashing lights, endless confetti or sounds. */
export function Celebration({
  level,
  onClose,
}: {
  level: LevelId | null;
  onClose: () => void;
}) {
  if (!level) return null;
  const milestone = MILESTONES[level - 1];
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="celebrate-title"
      className="celebrate"
    >
      <div className="celebrate-sprinkles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${8 + ((i * 29) % 84)}%`,
              top: `${10 + ((i * 17) % 56)}%`,
              animationDelay: `${i * 65}ms`,
              background: ["#c6a557", "#8daf8b", "#d9a391"][i % 3],
              transform: `rotate(${i * 27}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-stage">
        <Character who="lailaPoint" height={134} />
        <Character who="samiCheer" height={162} />
        <Character who="sisterWave" height={119} />
      </div>
      <span className="celebrate-medal">
        <Icon name={milestone.icon} size={56} />
      </span>
      <span className="eyebrow">يا لها من رحلة جميلة</span>
      <h2 id="celebrate-title">
        {level === 1 ? "أحسنت! أتممت المستوى الأول" : "رسالتك وصلت، وبك نفخر"}
      </h2>
      <p className="celebrate-award">
        حصلت على <strong>{milestone.title}</strong>
      </p>
      <p className="muted">
        {level === 1
          ? "ست عشرة خطوة صنعت متحدثًا واثقًا. نعبر الجسر معًا إلى عالم التأثير والتطبيق."
          : "اثنتان وثلاثون خطوة من التعلّم والشجاعة. أنت الآن متحدث واثق ومؤثر، وهذه حكايتك التي تستحق الاحتفال."}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onClose}
        data-autofocus
      >
        {level === 1 ? "هيا إلى العالم الثاني" : "أفتخر برحلتي"}
        <Icon name="chevron-left" size={19} />
      </button>
    </Modal>
  );
}
