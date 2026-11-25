import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SCHOOL_STORY } from '../data/schoolStory';
import { Icon } from './icons';
import './SistersLesson.css';
import './SchoolLesson.css';

interface Props { id:number; mode:'learn' | 'review'; onBack:() => void; onPickSpeaker:() => void; onComplete:() => void; }
const posePath = (pose:string) => pose.startsWith('friend-') ? `/school-lesson/${pose}.webp` : `/sisters-story/solo/${pose}.webp`;

/** A pupil-led classroom story: one speaker at a time, controlled by the learner. */
export function SchoolLesson({ mode, onBack, onPickSpeaker, onComplete }:Props) {
  const [index, setIndex] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);
  const stage = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const scene = SCHOOL_STORY[index];
  const teaching = index >= SCHOOL_STORY.findIndex(item => item.teaching);
  const goTo = useCallback((n:number) => setIndex(Math.max(0, Math.min(SCHOOL_STORY.length - 1, n))), []);
  useEffect(() => { heading.current?.focus({preventScroll:true}); }, [index]);
  useEffect(() => {
    for (const pose of new Set(SCHOOL_STORY.map(item => item.pose))) { const img = new Image(); img.src = posePath(pose); }
    const img = new Image(); img.src = '/sisters-story/solo/young-confident.webp';
  }, []);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const {width,height} = element.getBoundingClientRect();
      // Portrait framing is already close; extra zoom would hide the characters
      // behind the card on short phones, especially in the shared finale.
      if (width <= 700 && height > width) { setCameraZoom(1); return; }
      const naturalWidth = height * .44 * .4;
      const desiredWidth = Math.min(180, width * .40);
      setCameraZoom(naturalWidth >= desiredWidth * .9 ? 1 : Math.min(1.65, desiredWidth / naturalWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if (document.querySelector('[role=dialog], dialog[open]') || (event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index + 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index - 1); }
      else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      else if (event.key === 'End') { event.preventDefault(); goTo(SCHOOL_STORY.length - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index]);
  return <main className="sisters-lesson school-lesson" aria-label="الحصة الثانية: صوتي يصل" dir="rtl">
    <div className="sisters-top">
      <button className="sisters-tool" onClick={onBack} type="button"><Icon name="back" size={18} /> العودة إلى رحلتي</button>
      {mode === 'review' && <span className="sisters-review">وضع المراجعة</span>}
      <button className="sisters-tool" onClick={onPickSpeaker} type="button"><Icon name="wheel" size={18} /> مَن يتحدث؟</button>
    </div>
    <section ref={stage} className={`sisters-stage${teaching ? ' is-teaching' : ''}${cameraZoom > 1 ? ' needs-camera' : ''}`} style={{'--camera-zoom':cameraZoom} as CSSProperties} aria-label={`المشهد ${index + 1} من ${SCHOOL_STORY.length}: ${scene.title}`}
      onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
      onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
      onTouchCancel={() => { gesture.current = null; }}>
      <div className="sisters-room" aria-hidden="true">
        <div className={`sisters-figures school-figures${scene.finale ? ' is-finale' : ''}`}>
          {scene.finale && <img className="school-finale-young" src="/sisters-story/solo/young-confident.webp" alt="" />}
          <img src={posePath(scene.pose)} alt="" />
        </div>
      </div>
      <article className="sisters-card">
        <p className="sisters-eyebrow">✦ الحصة الثانية · صوتي يصل</p>
        <h1 ref={heading} tabIndex={-1} aria-describedby="school-turn-description">{scene.title}</h1>
        <span id="school-turn-description" className="sr-only">{scene.speaker}، المشهد {index + 1} من {SCHOOL_STORY.length}</span>
        <div className="sisters-dialogue"><div className="sisters-line"><span className={`sisters-speaker${scene.speaker === 'سارة' ? ' is-laila' : ''}`}>{scene.speaker}</span><p>{scene.text}</p></div></div>
        {scene.finale && (mode === 'review' ? <p className="sisters-review-note">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p> : <button className="sisters-finish" type="button" onClick={onComplete}>إنهاء الحصة <span aria-hidden="true">✓</span></button>)}
      </article>
    </section>
    <nav className="sisters-nav" aria-label="التنقّل بين مشاهد الحصة">
      <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}><Icon name="chevron-right" size={18} /> السابق</button>
      <span><bdi>المشهد {index + 1} من {SCHOOL_STORY.length}</bdi></span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={index === SCHOOL_STORY.length - 1}>التالي <Icon name="chevron-left" size={18} /></button>
    </nav>
  </main>;
}
