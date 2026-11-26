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
    <div className="school-entry-frame school-entry-doorway" aria-hidden="true">
      <svg viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href="/school-entry/entrance.webp" width="1376" height="768" />
        {/* The open doorway reveals the very same artwork used on arrival. */}
        <svg x="510" y="254" width="356" height="422" viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image href="/school-entry/hall.webp" width="1376" height="768" />
        </svg>
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

/** Keep the arrival frame, then let the learner follow the presentation at their own pace. */
export function SchoolClassroom({ onBack, onComplete, review }: { onBack: () => void; onComplete: () => void; review: boolean }) {
  const [index, setIndex] = useState(-1);
  const [stageStatus, setStageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stageAttempt, setStageAttempt] = useState(0);
  const stageReady = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const goTo = useCallback((next:number) => {
    if (next >= 0 && !stageReady.current) return;
    setIndex(Math.max(-1, Math.min(CLASSROOM_PRESENTATION.length - 1, next)));
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    let active = true;
    const image = new Image();
    stageReady.current = false;
    setStageStatus('loading');
    image.onload = () => {
      // Decode before the handoff, so the close-up never flashes an empty frame.
      const decoded = typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve();
      void decoded.then(() => {
        if (active) { stageReady.current = true; setStageStatus('ready'); }
      });
    };
    image.onerror = () => { if (active) setStageStatus('error'); };
    image.src = '/school-lesson/classroom-stage.webp';
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [stageAttempt]);
  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if (document.querySelector('[role=dialog], dialog[open]') || (event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index + 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index - 1); }
      else if (event.key === 'Home') { event.preventDefault(); goTo(-1); }
      else if (event.key === 'End') { event.preventDefault(); goTo(CLASSROOM_PRESENTATION.length - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo]);
  const scene = index >= 0 ? CLASSROOM_PRESENTATION[index] : null;
  const last = index === CLASSROOM_PRESENTATION.length - 1;
  return <main className={`school-classroom${scene ? ' is-presenting' : ''}`} dir="rtl" aria-label="صفّ الطفلة"
    onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
    onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
    onTouchCancel={() => { gesture.current = null; }}>
    {scene ? <div className="school-presentation-art" aria-hidden="true">
      <img className="school-presentation-girl" src={`/sisters-story/solo/${scene.pose}.webp`} alt="" />
    </div> : <img className="school-classroom-girl" src="/sisters-story/solo/young-greet.webp" alt="" />}
    <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
    <section className="school-classroom-card" aria-label={scene ? `المشهد ${index + 1} من ${CLASSROOM_PRESENTATION.length}` : undefined}>
      <p className="school-classroom-eyebrow">✦ الحصة الثانية · {scene ? 'أمام زملائي' : 'المدرسة'} {review ? '· وضع المراجعة' : ''}</p>
      <h1 ref={heading} tabIndex={-1}>{scene ? scene.title : 'وصلنا إلى صفّنا!'}</h1>
      {scene ? <div className="school-presentation-line"><span>{scene.kind === 'thought' ? 'تفكّر الطفلة' : 'الطفلة'}</span><p>{scene.text}</p></div> : <p>دخلت الصديقتان القسم بعد أن تدربتا معًا في الممر. حان دور الطفلة لتتحدث أمام زملائها.</p>}
      {!scene && <>
        <button type="button" onClick={() => goTo(0)} disabled={stageStatus !== 'ready'}>إلى المنصّة <span aria-hidden="true">←</span></button>
        {stageStatus === 'loading' && <p className="school-stage-status" role="status">نجهّز مشهد المنصّة...</p>}
        {stageStatus === 'error' && <p className="school-stage-status" role="alert">تعذّر تحميل مشهد المنصّة. <button type="button" onClick={() => setStageAttempt(n => n + 1)}>إعادة المحاولة</button></p>}
      </>}
      {last && (review ? <p className="school-classroom-review">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p> : <button type="button" onClick={onComplete}>إنهاء الحصة <span aria-hidden="true">✓</span></button>)}
    </section>
    {scene && <nav className="school-presentation-nav" aria-label="التنقّل بين مشاهد القسم">
      <button type="button" onClick={() => goTo(index - 1)}>السابق</button>
      <span><bdi>المشهد {index + 1} من {CLASSROOM_PRESENTATION.length}</bdi></span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={last}>التالي</button>
    </nav>}
  </main>;
}
