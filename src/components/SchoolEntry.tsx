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
    <div className="school-hall-room" aria-hidden="true" />
    <div className="school-hall-approach" aria-hidden="true" onAnimationEnd={event => { if (event.animationName === 'school-enter-approach') onComplete(); }} />
    <p className="school-entry-status" role="status">هيا ندخل القسم معًا...</p>
    <button ref={skip} type="button" className="school-entry-skip school-classroom-entry-skip" onClick={onComplete}>تخطّي الانتقال <span aria-hidden="true">←</span></button>
  </main>;
}

const IDEAS = [
  { id:'school', label:'عمري ومدرستي وصفّي', order:1 },
  { id:'ending', label:'أختم بلطف', order:3 },
  { id:'name', label:'التحية واسمي', order:0 },
  { id:'hobby', label:'ما أحبّه وهوايتي', order:2 },
] as const;
const ORDER_SCENE = CLASSROOM_PRESENTATION.findIndex(scene => scene.activity === 'order');

/** Start the presentation as soon as the child enters the classroom. */
export function SchoolClassroom({ onBack, onComplete, review }: { onBack: () => void; onComplete: () => void; review: boolean }) {
  const [index, setIndex] = useState(0);
  const [orderedIdeas, setOrderedIdeas] = useState<string[]>([]);
  const [orderMessage, setOrderMessage] = useState('اختاروا الفكرة الأولى.');
  const orderComplete = orderedIdeas.length === IDEAS.length;
  const [stageStatus, setStageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stageAttempt, setStageAttempt] = useState(0);
  const stageImage = `/school-entry/classroom-stage-zoom.webp${stageAttempt ? `?retry=${stageAttempt}` : ''}`;
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const goTo = useCallback((next:number) => {
    setIndex(Math.max(0, Math.min(CLASSROOM_PRESENTATION.length - 1, !orderComplete && next > ORDER_SCENE ? ORDER_SCENE : next)));
  }, [orderComplete]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    for (const pose of new Set(CLASSROOM_PRESENTATION.map(item => item.pose))) {
      const image = new Image(); image.src = `/school-entry/platform-${pose.replace('young-', '')}.webp`;
    }
  }, []);
  useEffect(() => {
    let active = true;
    setStageStatus('loading');
    const image = new Image();
    image.onload = () => {
      const decoded = typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve();
      void decoded.then(() => { if (active) setStageStatus('ready'); });
    };
    image.onerror = () => { if (active) setStageStatus('error'); };
    image.src = stageImage;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [stageImage]);
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
  const isOrdering = scene.activity === 'order';
  // Platform-specific poses all face the pupils, unlike the side-facing dialogue poses.
  const posePath = `/school-entry/platform-${scene.pose.replace('young-', '')}.webp`;
  const chooseIdea = (idea: typeof IDEAS[number]) => {
    if (idea.order !== orderedIdeas.length) {
      setOrderMessage('ليست هذه الفكرة التالية، جرّبوا مرة أخرى.');
      return;
    }
    const next = [...orderedIdeas, idea.id];
    setOrderedIdeas(next);
    setOrderMessage(next.length === IDEAS.length ? 'أحسنتم! رتّبنا أفكار مريم، والآن تستطيع البدء.' : `أحسنتم! اختاروا الفكرة ${next.length === 1 ? 'الثانية' : next.length === 2 ? 'الثالثة' : 'الأخيرة'}.`);
  };
  return <main className={`school-classroom is-presenting${isOrdering ? ' is-ordering' : ''}`} dir="rtl" aria-label="صفّ الطفلة" aria-busy={stageStatus === 'loading'}
    onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
    onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
    onTouchCancel={() => { gesture.current = null; }}>
    <div className="school-presentation-art" aria-hidden="true" style={{backgroundImage:stageStatus === 'ready' ? `url("${stageImage}")` : 'none'}}>
      {stageStatus === 'ready' && <img className="school-presentation-girl" src={posePath} alt="" />}
    </div>
    {isOrdering && <section className="school-order-ideas" aria-label="ترتيب أفكار مريم">
      <p className="school-order-title">لنرتّب أفكاري معًا</p>
      <div className="school-order-options">
        {[...IDEAS].sort((a, b) => {
          const ai = orderedIdeas.indexOf(a.id), bi = orderedIdeas.indexOf(b.id);
          return ai === -1 ? (bi === -1 ? 0 : 1) : (bi === -1 ? -1 : ai - bi);
        }).map(idea => {
          const selected = orderedIdeas.indexOf(idea.id);
          return <button type="button" key={idea.id} disabled={selected !== -1} onClick={() => chooseIdea(idea)}>
            {selected !== -1 && <span aria-label={`الترتيب ${selected + 1}`}>{selected + 1} · </span>}{idea.label}
          </button>;
        })}
      </div>
      <p className="school-order-feedback" role="status">{orderMessage}</p>
    </section>}
    <button className="school-classroom-back" type="button" onClick={onBack}>العودة إلى رحلتي</button>
    <section className="school-classroom-card" aria-label={`المشهد ${index + 1} من ${CLASSROOM_PRESENTATION.length}`}>
      <p className="school-classroom-eyebrow">✦ الحصة الثانية · أمام زملائي {review ? '· وضع المراجعة' : ''}</p>
      <h1 ref={heading} tabIndex={-1}>{scene.title}</h1>
      {stageStatus === 'loading' && <p className="school-stage-status" role="status">نجهّز مشهد المنصّة...</p>}
      {stageStatus === 'error' && <p className="school-stage-status" role="alert">تعذّر تحميل مشهد المنصّة. <button type="button" onClick={() => setStageAttempt(n => n + 1)}>إعادة المحاولة</button></p>}
      <div className="school-presentation-line"><span>{scene.kind === 'thought' ? 'تفكّر الطفلة' : 'الطفلة'}</span><p>{scene.text}</p></div>
      {last && (review ? <p className="school-classroom-review">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p> : <button type="button" onClick={onComplete}>إنهاء الحصة <span aria-hidden="true">✓</span></button>)}
    </section>
    <nav className="school-presentation-nav" aria-label="التنقّل بين مشاهد القسم">
      <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>السابق</button>
      <span><bdi>المشهد {index + 1} من {CLASSROOM_PRESENTATION.length}</bdi></span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={last || (isOrdering && !orderComplete)}>التالي</button>
    </nav>
  </main>;
}
