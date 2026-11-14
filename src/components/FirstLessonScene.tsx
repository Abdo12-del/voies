import type { CSSProperties, ReactNode, Ref } from "react";
import "../firstLessonPresentation.css";
import type { Session } from "../data/sessions";
import type { GuidedCard, GuidedSlide, LessonSlide } from "../lib/lessonSlides";
import { Character, type CharacterKey } from "./Character";
import { Icon, type IconName } from "./icons";

interface Props {
  slide: LessonSlide;
  session: Session;
  review: boolean;
  live: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  onComplete: () => void;
}

function SceneActor({
  artwork,
  character,
  pose,
  className = "",
  label,
}: {
  artwork?: string;
  character?: CharacterKey;
  pose: string;
  className?: string;
  label?: string;
}) {
  return (
    <figure className={`first-actor ${className}`} role="img" aria-label={label ?? pose}>
      {artwork ? (
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="first-lesson-art"
        />
      ) : (
        <Character who={character ?? "lailaWave"} height={720} />
      )}
    </figure>
  );
}

function SceneSpeech({
  children,
  className = "",
  tail = "bottom-left",
}: {
  children: ReactNode;
  className?: string;
  tail?: "bottom-left" | "bottom-right" | "top-center";
}) {
  if (!children) return null;
  const bubblePath =
    tail === "top-center"
      ? "M34 27H128C141 27 149 19 160 7C171 19 179 27 192 27H284C301 27 313 39 313 56V88C313 105 301 117 284 117H34C17 117 7 105 7 88V56C7 39 17 27 34 27Z"
      : "M34 7H284C301 7 313 19 313 36V68C313 85 301 97 284 97H82C70 97 61 105 48 118C52 109 54 103 55 97H34C17 97 7 85 7 68V36C7 19 17 7 34 7Z";
  const flipTail = tail === "bottom-right";
  return (
    <p className={`first-speech ${className}`}>
      <svg
        className="first-speech-shape"
        viewBox="0 0 320 124"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <g transform={flipTail ? "translate(320 0) scale(-1 1)" : undefined}>
          <path
            className="first-speech-shadow"
            d={bubblePath}
            transform="translate(0 5)"
          />
          <path className="first-speech-outline" d={bubblePath} />
        </g>
      </svg>
      <span className="first-speech-copy">{children}</span>
    </p>
  );
}

function SceneHeading({
  children,
  live,
  headingRef,
  className = "",
}: {
  children: ReactNode;
  live: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}) {
  return (
    <h2
      ref={live ? headingRef : undefined}
      tabIndex={live ? -1 : undefined}
      className={`first-scene-heading ${className}`}
    >
      {children}
    </h2>
  );
}

const ideaIcons: IconName[] = ["teacher", "school", "star", "palette"];
const interestIcons: IconName[] = ["palette", "book", "star", "leaf"];
const reflectionIcons: IconName[] = ["chat", "lock", "bricks", "ear"];
const turnIcons: IconName[] = ["hand-up", "lock", "star"];
const listenIcons: IconName[] = ["eye", "ear", "sparkles"];

function IconIdea({
  item,
  icon,
  index,
  className = "",
}: {
  item: GuidedCard;
  icon: IconName;
  index: number;
  className?: string;
}) {
  return (
    <article
      className={`idea-orbit idea-orbit-${index + 1} tone-${item.tone ?? "blue"} ${className}`}
      style={{ "--scene-order": index } as CSSProperties}
    >
      <span className="idea-orbit-icon" aria-hidden="true">
        <Icon name={icon} size={34} />
      </span>
      <strong>{item.title}</strong>
      <span className="idea-orbit-copy">{item.text}</span>
    </article>
  );
}

function ActorSpeech({ speech, className = "" }: { speech?: string; className?: string }) {
  return speech ? <SceneSpeech className={className}>{speech}</SceneSpeech> : null;
}

function GuidedScene({
  slide,
  live,
  headingRef,
}: {
  slide: GuidedSlide;
  live: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const cards = slide.cards ?? [];
  const actor = slide.illustration;
  const heading = (
    <SceneHeading live={live} headingRef={headingRef}>
      {slide.title}
    </SceneHeading>
  );

  switch (slide.id) {
    case "today":
      return (
        <div className="first-scene scene-journey" data-purpose={slide.purpose}>
          <div className="journey-copy">
            {heading}
            <p className="journey-lead">{slide.body}</p>
            {slide.prompt && <p className="journey-prompt">{slide.prompt}</p>}
          </div>
          <svg className="journey-trail" viewBox="0 0 1000 330" aria-hidden="true">
            <path d="M20 230C140 20 250 20 350 190s160 145 245-20 185-150 250 10 100 70 140-20" />
          </svg>
          <ol className="journey-stops">
            {cards.map((item, index) => (
              <li
                key={item.title}
                className={`journey-stop journey-stop-${index + 1}`}
                style={{ "--scene-order": index } as CSSProperties}
              >
                <span className="journey-stop-number">{index + 1}</span>
                <span className="journey-stop-title">{item.title}</span>
                <span className="journey-stop-time">{item.text}</span>
              </li>
            ))}
          </ol>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "الأخت الصغيرة تقود رحلة الحصة."}
            className="journey-actor"
          />
        </div>
      );

    case "opening-question":
      return (
        <div className="first-scene scene-question" data-purpose={slide.purpose}>
          <div className="question-copy">
            {heading}
            {slide.body && <p className="question-context">{slide.body}</p>}
            {slide.prompt && <p className="question-prompt">{slide.prompt}</p>}
            {slide.note && <p className="question-note">{slide.note}</p>}
          </div>
          <span className="question-mark" aria-hidden="true">؟</span>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يفكر قبل الإجابة."}
            className="question-actor"
          />
          <ActorSpeech speech={actor?.speech} className="question-speech" />
        </div>
      );

    case "meaning":
      return (
        <div className="first-scene scene-meaning" data-purpose={slide.purpose}>
          <div className="meaning-copy">
            {heading}
            <p className="meaning-statement">{slide.body}</p>
            {slide.example && (
              <div className="meaning-example">
                <span>{slide.example.label}</span>
                <p>{slide.example.text}</p>
              </div>
            )}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "ليلى تشرح معنى التعريف بنفسها."}
            className="meaning-actor"
          />
          <ActorSpeech speech={actor?.speech} className="meaning-speech" />
        </div>
      );

    case "what-to-share":
    case "step-interests":
      return (
        <div
          className={`first-scene scene-orbits scene-${slide.id}`}
          data-purpose={slide.purpose}
        >
          <div className="orbits-copy">
            {heading}
            {slide.body && <p className="orbits-lead">{slide.body}</p>}
          </div>
          <div className="orbits-field">
            {cards.map((item, index) => (
              <IconIdea
                key={item.title}
                item={item}
                icon={
                  slide.id === "step-interests"
                    ? interestIcons[index % interestIcons.length]
                    : ideaIcons[index % ideaIcons.length]
                }
                index={index}
                className={slide.id === "step-interests" ? "is-interest" : ""}
              />
            ))}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "الشخصية تستحضر أشياء تحبها."}
            className="orbits-actor"
          />
          <ActorSpeech speech={actor?.speech} className="orbits-speech" />
        </div>
      );

    case "safe-sharing":
      return (
        <div className="first-scene scene-safety" data-purpose={slide.purpose}>
          <div className="safety-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="safety-choices">
            {cards.map((item, index) => (
              <section
                key={item.title}
                className={`safety-choice safety-choice-${index + 1}`}
              >
                <span className="safety-choice-icon" aria-hidden="true">
                  <Icon name={index === 0 ? "check" : "lock"} size={42} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </section>
            ))}
          </div>
          {slide.prompt && <p className="safety-prompt">{slide.prompt}</p>}
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "ليلى تساعد الطفل على اختيار ما يشاركه."}
            className="safety-actor"
          />
          <ActorSpeech speech={actor?.speech} className="safety-speech" />
        </div>
      );

    case "step-name":
      return (
        <div className="first-scene scene-step-name" data-purpose={slide.purpose}>
          <div className="step-copy">
            {heading}
            <p className="step-lead">{slide.body}</p>
            {slide.example && (
              <p className="step-example step-example-name">{slide.example.text}</p>
            )}
            {slide.prompt && <p className="step-prompt">{slide.prompt}</p>}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "ليلى تقدم اسمها للصف."}
            className="step-actor step-actor-name"
          />
          <ActorSpeech speech={actor?.speech} className="step-speech" />
        </div>
      );

    case "step-simple-fact":
      return (
        <div className="first-scene scene-step-fact" data-purpose={slide.purpose}>
          <div className="step-copy">
            {heading}
            <p className="step-lead">{slide.body}</p>
            {slide.example && (
              <div className="fact-example">
                <span>{slide.example.label}</span>
                <p>{slide.example.text}</p>
              </div>
            )}
            {slide.note && <p className="fact-note">{slide.note}</p>}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يذكر معلومة بسيطة عن نفسه."}
            className="fact-actor"
          />
          <ActorSpeech speech={actor?.speech} className="fact-speech" />
        </div>
      );

    case "connect-the-ideas":
      return (
        <div className="first-scene scene-connection" data-purpose={slide.purpose}>
          <div className="connection-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="connection-path">
            {cards.map((item, index) => (
              <div className={`connection-node connection-node-${index + 1}`} key={item.title}>
                <span className="connection-node-title">{item.title}</span>
                <strong>{item.text}</strong>
                {index < cards.length - 1 && <span className="connection-arrow" aria-hidden="true">←</span>}
              </div>
            ))}
          </div>
          {slide.example && (
            <p className="connection-example">
              <span>{slide.example.label}</span>
              {slide.example.text}
            </p>
          )}
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يربط أفكاره بالترتيب."}
            className="connection-actor"
          />
          <ActorSpeech speech={actor?.speech} className="connection-speech" />
        </div>
      );

    case "full-model": {
      const modelParts = [
        "مرحبًا! اسمي مريم.",
        "عمري تسع سنوات، وأنا في الصف الرابع.",
        "أحب الرسم والقصص، وأستمتع بأن أشارك رسوماتي مع صديقاتي.",
        "سعيدة بالتعرّف إليكم!",
      ];
      return (
        <div className="first-scene scene-model" data-purpose={slide.purpose}>
          <div className="model-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="model-reading">
            <SceneActor
              artwork={actor?.artwork}
              character={actor?.characters[0]}
              pose={actor?.pose ?? "ليلى تدعو الصف إلى ملاحظة النموذج."}
              className="model-actor"
            />
            <div className="model-quote">
              {modelParts.map((part, index) => (
                <p
                  className={`model-fragment model-fragment-${index + 1}`}
                  key={part}
                  style={{ "--scene-order": index } as CSSProperties}
                >
                  <span className="model-bead" aria-hidden="true" />
                  {part}
                </p>
              ))}
            </div>
          </div>
          <div className="model-map" role="group" aria-label="أجزاء التعريف">
            {cards.map((item, index) => (
              <span className={`model-map-part model-map-part-${index + 1}`} key={item.title}>
                {item.title}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "idea-card":
      return (
        <div className="first-scene scene-keywords" data-purpose={slide.purpose}>
          <div className="keywords-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="memory-paper" role="group" aria-label="بطاقة كلمات مفتاحية للتذكر">
            {cards.map((item, index) => (
              <div className={`memory-word memory-word-${index + 1}`} key={item.title}>
                <strong>{item.title}</strong>
                <span aria-hidden="true">········</span>
              </div>
            ))}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "الأخت الصغيرة تكتب كلمات مفتاحية على بطاقتها."}
            className="keywords-actor"
          />
          <ActorSpeech speech={actor?.speech} className="keywords-speech" />
          {slide.prompt && <p className="keywords-prompt">{slide.prompt}</p>}
        </div>
      );

    case "order-and-practice":
      return (
        <div className="first-scene scene-practice" data-purpose={slide.purpose}>
          <div className="practice-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <ol className="practice-route">
            {(slide.items ?? []).map((item, index) => (
              <li key={item} className={`practice-stop practice-stop-${index + 1}`}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </li>
            ))}
          </ol>
          {slide.example && (
            <p className="practice-closing">
              <span>{slide.example.label}</span>
              {slide.example.text}
            </p>
          )}
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يتدرّب على ترتيب أفكاره."}
            className="practice-actor"
          />
          <ActorSpeech speech={actor?.speech} className="practice-speech" />
        </div>
      );

    case "three-characters":
      return (
        <div className="first-scene scene-trio" data-purpose={slide.purpose}>
          <div className="trio-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="trio-stage">
            {cards.map((item, index) => (
              <article className={`trio-performer trio-performer-${index + 1}`} key={item.title}>
                <SceneActor
                  artwork={item.artwork}
                  character={item.character}
                  pose={item.pose ?? item.title}
                  label={`${item.title}: ${item.pose ?? "يتحدث عن نفسه."}`}
                  className="trio-actor"
                />
                <strong>{item.title}</strong>
                <SceneSpeech className="trio-line" tail="top-center">
                  {item.text}
                </SceneSpeech>
              </article>
            ))}
          </div>
          {slide.prompt && <p className="trio-prompt">{slide.prompt}</p>}
        </div>
      );

    case "your-turn":
      return (
        <div className="first-scene scene-your-turn" data-purpose={slide.purpose}>
          <div className="turn-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="turn-steps">
            {(slide.items ?? []).map((item, index) => (
              <div className={`turn-step turn-step-${index + 1}`} key={item}>
                <span aria-hidden="true"><Icon name={turnIcons[index % turnIcons.length]} size={34} /></span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يقدم نفسه أمام المجموعة."}
            className="turn-actor"
          />
          <ActorSpeech speech={actor?.speech} className="turn-speech" />
          {slide.prompt && <p className="turn-prompt">{slide.prompt}</p>}
        </div>
      );

    case "listening-friend":
      return (
        <div className="first-scene scene-listening" data-purpose={slide.purpose}>
          <div className="listening-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
          </div>
          <div className="conversation-stage">
            <SceneActor
              artwork={actor?.artwork}
              character={actor?.characters[0]}
              pose={actor?.pose ?? "ليلى تستمع باهتمام إلى زميلها."}
              className="listener-actor"
            />
            <SceneActor
              character="samiExplain"
              pose="سامي يتحدث إلى زميلته." 
              className="speaker-actor"
            />
            <SceneSpeech className="conversation-bubble conversation-bubble-listener">
              {actor?.speech ?? "أستمع إليك، تفضّل."}
            </SceneSpeech>
            <SceneSpeech
              className="conversation-bubble conversation-bubble-speaker"
              tail="bottom-right"
            >
              أنا سامي، وأحب لعب كرة القدم.
            </SceneSpeech>
          </div>
          <div className="listening-cues">
            {cards.map((item, index) => (
              <div className="listening-cue" key={item.title}>
                <span aria-hidden="true"><Icon name={listenIcons[index % listenIcons.length]} size={27} /></span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            ))}
          </div>
          {slide.prompt && <p className="listening-prompt">{slide.prompt}</p>}
        </div>
      );

    case "self-check":
      return (
        <div className="first-scene scene-reflection" data-purpose={slide.purpose}>
          <div className="reflection-heading">
            {heading}
            {slide.body && <p>{slide.body}</p>}
            {slide.prompt && <p className="reflection-question">{slide.prompt}</p>}
          </div>
          <div className="reflection-constellation">
            {cards.map((item, index) => (
              <IconIdea
                key={item.title}
                item={item}
                icon={reflectionIcons[index % reflectionIcons.length]}
                index={index}
                className="reflection-star"
              />
            ))}
          </div>
          <SceneActor
            artwork={actor?.artwork}
            character={actor?.characters[0]}
            pose={actor?.pose ?? "سامي يتأمل ما تعلمه اليوم."}
            className="reflection-actor"
          />
          <ActorSpeech speech={actor?.speech} className="reflection-speech" />
        </div>
      );

    default:
      return (
        <div className="first-scene scene-fallback" data-purpose={slide.purpose}>
          {heading}
          {slide.body && <p>{slide.body}</p>}
        </div>
      );
  }
}

export function FirstLessonScene({
  slide,
  session,
  review,
  live,
  headingRef,
  onComplete,
}: Props) {
  if (slide.kind === "title") {
    const actor = slide.illustration;
    return (
      <div className="first-scene scene-cover" data-purpose={slide.purpose}>
        <div className="cover-copy">
          <p className="cover-kicker">الحصة الأولى · المتحدث الصغير</p>
          <h1
            ref={live ? headingRef : undefined}
            tabIndex={live ? -1 : undefined}
            className="cover-title"
          >
            {session.title}
          </h1>
          <p className="cover-description">{session.desc}</p>
          <SceneSpeech className="cover-speech">
            {review ? "نراجع معًا ما تعلمناه." : actor?.speech}
          </SceneSpeech>
        </div>
        <SceneActor
          artwork={actor?.artwork}
          character={actor?.characters[0]}
          pose={actor?.pose ?? "ليلى تلوّح مرحّبة ببداية الحصة."}
          className="cover-actor"
        />
        <span className="cover-lightbulb" aria-hidden="true">✦</span>
      </div>
    );
  }

  if (slide.kind === "guided")
    return <GuidedScene slide={slide} live={live} headingRef={headingRef} />;

  if (slide.kind === "end") {
    const actor = slide.illustration;
    return (
      <div className={`first-scene scene-ending ${review ? "is-review" : ""}`} data-purpose={slide.purpose}>
        <div className="ending-copy">
          <p className="ending-kicker">الحصة الأولى · ختام الرحلة</p>
          <h2
            ref={live ? headingRef : undefined}
            tabIndex={live ? -1 : undefined}
            className="ending-title"
          >
            {slide.headline ?? "نهاية الحصة"}
          </h2>
          {!review && <p className="ending-cheer">أحسنت!</p>}
          {!review && actor?.speech && (
            <p className="ending-message">{actor.speech}</p>
          )}
          <p className="ending-reflection">{slide.reflection}</p>
          {slide.nextLesson && (
            <p className="ending-next">{slide.nextLesson}</p>
          )}
          {review ? (
            <p className="ending-review-note">وضع المراجعة · تقدّم الرحلة لا يتغيّر.</p>
          ) : (
            <button type="button" className="ending-finish" onClick={live ? onComplete : undefined} tabIndex={live ? undefined : -1}>
              <Icon name="check" size={21} /> إنهاء الحصة
            </button>
          )}
        </div>
        <SceneActor
          artwork={actor?.artwork}
          character={actor?.characters[0]}
          pose={actor?.pose ?? "سامي والأخت الصغيرة يحتفلان بإنجاز الصف."}
          className="ending-actor"
        />
        <span className="ending-medal" aria-hidden="true"><Icon name="star" size={34} /></span>
      </div>
    );
  }

  if (slide.kind === "goal") {
    return (
      <div className="first-scene scene-fallback">
        <SceneHeading live={live} headingRef={headingRef}>هدفي اليوم</SceneHeading>
        <p>{session.goal}</p>
      </div>
    );
  }

  if (slide.kind === "activity" || slide.kind === "challenge") {
    return (
      <div className="first-scene scene-fallback">
        <SceneHeading live={live} headingRef={headingRef}>
          {slide.kind === "activity" ? "نجرّب معًا" : "تحدّي المحطة"}
        </SceneHeading>
        <ol>
          {slide.steps.map((step) => <li key={step.number}>{step.text}</li>)}
        </ol>
      </div>
    );
  }

  if (slide.kind === "guided")
    return <GuidedScene slide={slide} live={live} headingRef={headingRef} />;

  return null;
}
