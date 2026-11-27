import { useCallback, useEffect, useRef, useState } from 'react';
import { CLASSROOM_PRESENTATION } from '../data/classroomPresentation';
import './SchoolEntry.css';

/** The map leads into the same hallway that remains behind the conversation. */
export function SchoolEntry({ onSkip, onComplete }: { onSkip: () => void; onComplete: () => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus(); }, []);
  return <main className="school-entry" aria-label="الدخول إلى المدرسة">
    <h1 className="sr-only">الدخول إلى المدرسة</h1>
    <div className="school-entry-frame school-entry-exterior" aria-hidden="true" />
    <div className="school-entry-frame school-entry-closed" aria-hidden="true" />
    <div className="school-entry-frame school-entry-ajar" aria-hidden="true" />
    <div className="school-entry-frame school-entry-doorway" aria-hidden="true">
      <svg viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href="/school-entry/doors-open.webp" width="1376" height="768" />
        {/* The open doorway reveals the very same artwork used on arrival. */}
        <svg x="510" y="254" width="356" height="422" viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image href="/school-entry/hall.webp" width="1376" height="768" />
        </svg>
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

/** Start the presentation as soon as the child enters the classroom. */
export function SchoolClassroom({ onBack, onComplete, review }: { onBack: () => void; onComplete: () => void; review: boolean }) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const goTo = useCallback((next:number) => {
    setIndex(Math.max(0, Math.min(CLASSROOM_PRESENTATION.length - 1, next)));
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if (document.querySelector('[role=dialog], dialog[open]') || (event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index + 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index - 1); }
      else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      else if (event.key === 'End') { event.preventDefault(); goTo(CLASSROOM_PRESENTATION.length - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo]);
  const scene = CLASSROOM_PRESENTATION[index];
  const last = index === CLASSROOM_PRESENTATION.length - 1;
  return <main className="school-classroom is-presenting" dir="rtl" aria-label="صفّ الطفلة"
    onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
    onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
    onTouchCancel={() => { gesture.current = null; }}>
    <div className="school-presentation-art" aria-hidden="true">
      <img className="school-presentation-girl" src={`/sisters-story/solo/${scene.pose}.webp`} alt="" />
    </div>
    <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
    <section className="school-classroom-card" aria-label={`المشهد ${index + 1} من ${CLASSROOM_PRESENTATION.length}`}>
      <p className="school-classroom-eyebrow">✦ الحصة الثانية · أمام زملائي {review ? '· وضع المراجعة' : ''}</p>
      <h1 ref={heading} tabIndex={-1}>{scene.title}</h1>
      <div className="school-presentation-line"><span>{scene.kind === 'thought' ? 'تفكّر الطفلة' : 'الطفلة'}</span><p>{scene.text}</p></div>
      {last && (review ? <p className="school-classroom-review">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p> : <button type="button" onClick={onComplete}>إنهاء الحصة <span aria-hidden="true">✓</span></button>)}
    </section>
    <nav className="school-presentation-nav" aria-label="التنقّل بين مشاهد القسم">
      <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>السابق</button>
      <span><bdi>المشهد {index + 1} من {CLASSROOM_PRESENTATION.length}</bdi></span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={last}>التالي</button>
    </nav>
  </main>;
}
