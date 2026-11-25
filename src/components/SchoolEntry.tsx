import { useEffect, useRef, useState } from 'react';
import './SchoolEntry.css';

/** The map leads into the same hallway that remains behind the conversation. */
export function SchoolEntry({ onSkip, onComplete }: { onSkip: () => void; onComplete: () => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus(); }, []);
  return <main className="school-entry" aria-label="الدخول إلى المدرسة">
    <h1 className="sr-only">الدخول إلى المدرسة</h1>
    <div className="school-entry-frame school-entry-exterior" aria-hidden="true" />
    <div className="school-entry-frame school-entry-hall" aria-hidden="true" onAnimationEnd={event => {
      if (event.animationName === 'school-approach-hall') onComplete();
    }} />
    <p className="school-entry-status" role="status">هيا ندخل المدرسة...</p>
    <button ref={skip} type="button" className="school-entry-skip" onClick={onSkip}>تخطّي الانتقال <span aria-hidden="true">←</span></button>
  </main>;
}

const conversation = [
  { speaker:'سارة', text:'صباح الخير! أنا سارة. هل أنتِ في صفّنا؟' },
  { speaker:'الطفلة', text:'صباح النور! نعم، أنا سعيدة بلقائك، لكنني متوترة قليلًا.' },
  { speaker:'سارة', text:'لا تقلقي، سندخل معًا ونحيّي زميلاتنا وزملاءنا.' },
  { speaker:'الطفلة', text:'شكرًا يا سارة! هيا ندخل إلى القسم معًا.' },
] as const;

/** Wait for each line to be advanced; the hall never advances by itself. */
export function SchoolHall({ entering, onEnter, onBack, onComplete }: { entering:boolean; onEnter:() => void; onBack:() => void; onComplete:() => void }) {
  const [turn, setTurn] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll:true }); }, []);
  const line = conversation[turn];
  return <main className={`school-hall${entering ? ' is-entering-room' : ''}`} dir="rtl" aria-label="لقاء الصديقتين في ممر المدرسة">
    <div className="school-hall-background" aria-hidden="true" />
    <div className="school-hall-foreground" aria-hidden={entering || undefined} ref={el => { if (el) el.inert = entering; }}>
      <div className="school-hall-characters" aria-hidden="true">
        <img className="school-hall-young" src="/sisters-story/solo/young-greet.webp" alt="" />
        <img className="school-hall-friend" src="/school-entry/friend.webp" alt="" />
      </div>
      <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
      <section className="school-hall-card" aria-labelledby="school-hall-title">
        <p className="school-hall-eyebrow">✦ الحصة الثانية · ممر المدرسة</p>
        <h1 id="school-hall-title" ref={heading} tabIndex={-1}>لقاء في الممر</h1>
        <div className="school-hall-line" role="status" aria-atomic="true">
          <span className="school-hall-speaker">{line.speaker}</span>
          <p>{line.text}</p>
        </div>
        <nav className="school-hall-nav" aria-label="التنقّل في الحوار">
          <button type="button" className="school-hall-prev" disabled={turn === 0} onClick={() => setTurn(turn - 1)}>السابق</button>
          <span><bdi>{turn + 1} من {conversation.length}</bdi></span>
          {turn < conversation.length - 1
            ? <button type="button" className="school-hall-next" onClick={() => setTurn(turn + 1)}>التالي</button>
            : <button type="button" className="school-hall-next" onClick={onEnter}>الدخول إلى القسم</button>}
        </nav>
      </section>
    </div>
    {entering && <>
      <div className="school-hall-room" aria-hidden="true" onAnimationEnd={event => { if (event.animationName === 'school-enter-room') onComplete(); }} />
      <p className="school-entry-status" role="status">هيا ندخل القسم معًا...</p>
    </>}
  </main>;
}

/** The classroom is the final frame of the entry, not a new cut. */
export function SchoolClassroom({ onBack, onContinue, review }: { onBack: () => void; onContinue: () => void; review: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <main className="school-classroom" dir="rtl" aria-label="صفّ الطفلة">
    <img className="school-classroom-girl" src="/sisters-story/solo/young-greet.webp" alt="" />
    <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
    <section className="school-classroom-card">
      <p className="school-classroom-eyebrow">✦ الحصة الثانية · المدرسة {review ? '· وضع المراجعة' : ''}</p>
      <h1 ref={heading} tabIndex={-1}>وصلنا إلى صفّنا!</h1>
      <p>هيا نتعرّف إلى المكان ونستعدّ للحصة معًا.</p>
      <button type="button" onClick={onContinue}>متابعة الحصة <span aria-hidden="true">←</span></button>
    </section>
  </main>;
}
