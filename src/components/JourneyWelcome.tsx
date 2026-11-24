import "./JourneyWelcome.css";

interface Props {
  onStart: () => void;
  exiting?: boolean;
}

/** A deliberate first step before the map; the class's progress is untouched. */
export function JourneyWelcome({ onStart, exiting = false }: Props) {
  return (
    <main
      className={`journey-welcome${exiting ? " is-exiting" : ""}`}
      aria-labelledby="journey-welcome-title"
      aria-hidden={exiting || undefined}
      ref={(element) => { if (element) element.inert = exiting; }}
    >
      <div className="journey-welcome-art" role="img" aria-label="ليلى وسامي والأخت الصغيرة يرحّبون بنا في بداية الرحلة" />
      <div className="journey-welcome-shade" aria-hidden="true" />
      <div className="journey-welcome-copy">
        <p className="journey-welcome-kicker">✦ حكاية تبدأ بصوتك</p>
        <h1 id="journey-welcome-title">رحلتي مع<br /><span>المتحدث الصغير</span></h1>
        <p className="journey-welcome-description">لكلّ صوت حكاية جميلة... هيا نكتشف حكايتك معًا!</p>
        <button className="journey-welcome-start" type="button" onClick={onStart}>هيا نبدأ الرحلة <span aria-hidden="true">←</span></button>
      </div>
      <p className="journey-welcome-hint">خطوة صغيرة... وحكايات كبيرة ✦</p>
    </main>
  );
}
