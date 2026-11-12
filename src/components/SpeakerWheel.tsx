import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  eligibleNames,
  getClassroom,
  MAX_STUDENTS,
  MAX_NAME_LENGTH,
  parseNames,
  recordSpeaker,
  resetRound,
  saveNames,
  setNoRepeat,
  useClassroom,
} from "../lib/classroom";
import { castFor } from "../lib/lessonCast";
import { nextRotation, randomIndex, sectorPath } from "../lib/speakerWheel";
import { Character } from "./Character";
import { Icon } from "./icons";
import { Modal } from "./Modal";

const colors = [
  "#ffdf76",
  "#a9ddff",
  "#bce98e",
  "#f8c3a0",
  "#cad5ff",
  "#9cddd2",
];
export function SpeakerWheel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const classroom = useClassroom();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [duration, setDuration] = useState(3800);
  const [error, setError] = useState("");
  const pending = useRef<{
    name: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const available = eligibleNames(classroom);
  useEffect(() => {
    if (open) {
      const names = getClassroom().names;
      setDraft(names.join("\n"));
      setEditing(names.length === 0);
      setError("");
    } else {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      setSpinning(false);
    }
    // Opening a dialog starts a fresh editor, not a second source of saved names.
  }, [open]);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (spinning) return;
    const names = saveNames(draft);
    setDraft(names.join("\n"));
    setEditing(names.length === 0);
    setDuration(0);
    setRotation(0);
    setError("");
  };
  const spin = () => {
    if (pending.current || !available.length || editing) return;
    try {
      const name = available[randomIndex(available.length)];
      const index = classroom.names.indexOf(name);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setDuration(reduced ? 0 : 3800);
      setError("");
      setSpinning(true);
      setRotation((previous) =>
        nextRotation(previous, index, classroom.names.length),
      );
      const timer = setTimeout(
        () => {
          if (pending.current?.name !== name) return;
          pending.current = null;
          recordSpeaker(name);
          setSpinning(false);
        },
        reduced ? 100 : 3860,
      );
      pending.current = { name, timer };
    } catch {
      setError("تعذّرت القرعة. حاول تدوير العجلة مرة أخرى.");
      setSpinning(false);
    }
  };
  if (!open) return null;
  const segments = classroom.names.length || 6;
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="speaker-title"
      className="speaker-panel"
    >
      <div className="speaker-heading">
        {/* «مَن يتحدث؟» ← وضعية التفكير من مكتبة شخصيات المتحدث */}
        <span className="speaker-thinker" aria-hidden="true">
          <Character
            who={castFor("speaker", { sessionId: 0 })[0]}
            height={88}
          />
        </span>
        <div>
          <span className="eyebrow">
            <Icon name="wheel" size={19} /> لكل صوت فرصة
          </span>
          <h2 id="speaker-title" tabIndex={-1} data-autofocus>
            مَن يتحدث الآن؟
          </h2>
          <p className="muted">أضف الأسماء، وأدر العجلة لاختيار المتحدث.</p>
        </div>
      </div>
      <div className="speaker-content">
        <section className="classroom-names" aria-labelledby="names-title">
          <div className="names-heading">
            <h3 id="names-title">
              أسماء الطلبة <bdi>{classroom.names.length}</bdi>
            </h3>
            {!editing && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={spinning}
                onClick={() => {
                  setDraft(classroom.names.join("\n"));
                  setEditing(true);
                }}
              >
                تعديل الأسماء
              </button>
            )}
          </div>
          {editing ? (
            <form className="names-form" onSubmit={save}>
              <label className="field" htmlFor="classroom-names">
                اسم واحد في كل سطر
              </label>
              <textarea
                id="classroom-names"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={7}
                maxLength={4000}
                placeholder={"مثال:\nليان\nسامي\nمريم"}
                autoComplete="off"
                spellCheck={false}
                disabled={spinning}
                aria-describedby="names-help"
              />
              <p id="names-help" className="form-note">
                حتى {MAX_STUDENTS} اسمًا، و{MAX_NAME_LENGTH} حرفًا للاسم. نتجاهل
                الأسطر الفارغة والأسماء المكررة.
              </p>
              <div className="row-actions">
                <button type="submit" className="btn btn-primary">
                  حفظ الأسماء
                </button>
                {classroom.names.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEditing(false)}
                  >
                    إلغاء
                  </button>
                )}
              </div>
              <span className="names-counter">
                <bdi>{parseNames(draft).length} اسمًا</bdi>
              </span>
            </form>
          ) : (
            <ol
              className="names-list"
              aria-label="قائمة أسماء الطلبة"
              role="list"
              tabIndex={0}
            >
              {classroom.names.map((name, index) => (
                <li
                  key={name}
                  className={
                    classroom.spoken.includes(name) ? "has-spoken" : ""
                  }
                >
                  <span className="name-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <bdi>{name}</bdi>
                  {classroom.spoken.includes(name) && (
                    <>
                      <Icon name="check" size={17} />
                      <span className="sr-only">شارك في هذه الجولة</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p
            className="form-note names-privacy"
            role={classroom.storageAvailable ? undefined : "status"}
          >
            {classroom.storageAvailable
              ? "الأسماء اختيارية، ومحفوظة في هذا المتصفح فقط. لا حسابات ولا تسجيل دخول."
              : "الحفظ غير متاح؛ ستبقى الأسماء لهذه الجلسة فقط."}
          </p>
        </section>
        <section
          className={`wheel-playground ${spinning ? "is-spinning" : ""}`}
          aria-label="عجلة اختيار المتحدث"
        >
          <div className="speaker-wheel" aria-hidden="true">
            <svg viewBox="0 0 360 360" className="wheel-art">
              <circle cx="180" cy="180" r="176" fill="#ffffff" />
              <g
                className="wheel-disc"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transitionDuration: `${duration}ms`,
                }}
              >
                {Array.from({ length: segments }, (_, index) => {
                  const name = classroom.names[index];
                  const spoken =
                    classroom.noRepeat && classroom.spoken.includes(name);
                  const label =
                    segments > 18
                      ? String(index + 1)
                      : name &&
                        (Array.from(name).length > 13
                          ? `${Array.from(name).slice(0, 12).join("")}…`
                          : name);
                  return (
                    <g key={index}>
                      <path
                        d={sectorPath(index, segments)}
                        fill={
                          spoken ? "#e8edf5" : colors[index % colors.length]
                        }
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {label && (
                        <g
                          transform={`rotate(${((index + 0.5) * 360) / segments} 180 180)`}
                        >
                          <text
                            x="180"
                            y="66"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform="rotate(90 180 66)"
                            fill={spoken ? "#536278" : "#1b2a4e"}
                            fontSize={segments > 12 ? 12 : 15}
                            fontWeight="700"
                          >
                            {label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
              <circle
                cx="180"
                cy="180"
                r="33"
                fill="#fff5d4"
                stroke="#dba62f"
                strokeWidth="3"
              />
            </svg>
            <span className="wheel-hub">
              <Icon name="mic" size={28} />
            </span>
            <span className="wheel-pointer" />
          </div>
          <div
            className="speaker-result"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {spinning ? (
              <p>تدور العجلة… مَن سيكون المتحدث؟</p>
            ) : classroom.lastSpeaker ? (
              <>
                <span>المتحدث الآن</span>
                <strong>
                  <bdi>{classroom.lastSpeaker}</bdi>
                </strong>
              </>
            ) : (
              <p>
                {classroom.names.length
                  ? "جاهزون؟ لنسمع صوتًا جديدًا!"
                  : "أضف أسماء الطلبة لتبدأ"}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-start spin-button"
            onClick={spin}
            disabled={spinning || editing || !available.length}
          >
            <Icon name="wheel" size={22} />{" "}
            {spinning ? "العجلة تدور…" : "أدر العجلة"}
          </button>
          <label className="wheel-option">
            <input
              type="checkbox"
              checked={classroom.noRepeat}
              disabled={spinning || editing}
              onChange={(event) => setNoRepeat(event.target.checked)}
            />
            <span>دون تكرار حتى يشارك الجميع</span>
          </label>
          {classroom.names.length > 0 && (
            <div className="round-tools">
              <span>
                {classroom.noRepeat
                  ? available.length
                    ? `متبقٍ ${available.length} من ${classroom.names.length}`
                    : "شارك الجميع! نبدأ جولة جديدة؟"
                  : "يمكن اختيار الاسم أكثر من مرة"}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={spinning || editing || classroom.spoken.length === 0}
                onClick={resetRound}
              >
                <Icon name="review" size={16} /> جولة جديدة
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
