import { useEffect, useRef } from 'react';
import './SchoolEntry.css';

/** The map leads into the same hallway that remains behind the conversation. */
export function SchoolEntry({ onSkip, onComplete }: { onSkip: () => void; onComplete: () => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus(); }, []);
  return <main className="school-entry" aria-label="الدخول إلى المدرسة">
    <h1 className="sr-only">الدخول إلى المدرسة</h1>
    <div className="school-entry-frame school-entry-exterior" aria-hidden="true" />
    <div className="school-entry-frame school-entry-doorway" aria-hidden="true">
      <svg viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href="/school-entry/entrance.webp" width="1376" height="768" />
        <g className="school-entrance-door school-entrance-door-left">
          <rect x="510" y="254" width="178" height="422" fill="#35465c" stroke="#182538" strokeWidth="5" />
          <rect x="526" y="270" width="145" height="252" fill="#91acb7" stroke="#19293c" strokeWidth="5" />
          <path d="M534 278h137v45L553 514h-19z" fill="#dce9e6" opacity=".22" />
          <rect x="526" y="537" width="145" height="122" fill="#627f8e" stroke="#19293c" strokeWidth="5" />
          <path d="M656 449v50" fill="none" stroke="#efe4c9" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g className="school-entrance-door school-entrance-door-right">
          <rect x="688" y="254" width="178" height="422" fill="#35465c" stroke="#182538" strokeWidth="5" />
          <rect x="705" y="270" width="145" height="252" fill="#91acb7" stroke="#19293c" strokeWidth="5" />
          <path d="M713 278h137v45L732 514h-19z" fill="#dce9e6" opacity=".22" />
          <rect x="705" y="537" width="145" height="122" fill="#627f8e" stroke="#19293c" strokeWidth="5" />
          <path d="M720 449v50" fill="none" stroke="#efe4c9" strokeWidth="7" strokeLinecap="round" />
        </g>
      </svg>
    </div>
    <div className="school-entry-frame school-entry-hall" aria-hidden="true" onAnimationEnd={event => {
      if (event.animationName === 'school-approach-hall') onComplete();
    }} />
    <p className="school-entry-status" role="status">هيا ندخل المدرسة...</p>
    <button ref={skip} type="button" className="school-entry-skip" onClick={onSkip}>تخطّي الانتقال <span aria-hidden="true">←</span></button>
  </main>;
}

/** Only after the whole hallway conversation, move into the classroom. */
export function SchoolClassroomEntry({ onComplete }: { onComplete:() => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus(); }, []);
  return <main className="school-hall is-entering-room" aria-label="الدخول إلى القسم">
    <h1 className="sr-only">الدخول إلى القسم</h1>
    <div className="school-hall-background" aria-hidden="true" />
    <div className="school-hall-room" aria-hidden="true" onAnimationEnd={event => { if (event.animationName === 'school-enter-room') onComplete(); }} />
    <p className="school-entry-status" role="status">هيا ندخل القسم معًا...</p>
    <button ref={skip} type="button" className="school-entry-skip school-classroom-entry-skip" onClick={onComplete}>تخطّي الانتقال <span aria-hidden="true">←</span></button>
  </main>;
}

/** The classroom is the final frame of the entry, not a new cut. */
export function SchoolClassroom({ onBack, onComplete, review }: { onBack: () => void; onComplete: () => void; review: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <main className="school-classroom" dir="rtl" aria-label="صفّ الطفلة">
    <img className="school-classroom-girl" src="/sisters-story/solo/young-greet.webp" alt="" />
    <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
    <section className="school-classroom-card">
      <p className="school-classroom-eyebrow">✦ الحصة الثانية · المدرسة {review ? '· وضع المراجعة' : ''}</p>
      <h1 ref={heading} tabIndex={-1}>وصلنا إلى صفّنا!</h1>
      <p>دخلت الصديقتان القسم بعد أن تدربتا معًا في الممر.</p>
      {review ? <p className="school-classroom-review">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p> : <button type="button" onClick={onComplete}>إنهاء الحصة <span aria-hidden="true">✓</span></button>}
    </section>
  </main>;
}
