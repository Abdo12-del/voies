import { useCallback, useEffect, useRef, useState } from 'react';
import { SCHOOL_STORY } from '../data/schoolStory';
import { Icon } from './icons';
import './SistersLesson.css';
import './SchoolLesson.css';

interface Props { id:number; mode:'learn' | 'review'; onBack:() => void; onPickSpeaker:() => void; onComplete:() => void; }
const posePath = (pose:string) => pose === 'friend-greet' ? '/school-entry/friend.webp' : pose.startsWith('friend-') ? `/school-lesson/${pose}.webp` : `/sisters-story/solo/${pose}.webp`;

/** The whole conversation happens in the hall, one speaker at a time. */
export function SchoolLesson({ mode, onBack, onPickSpeaker, onComplete }:Props) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const scene = SCHOOL_STORY[index];
  const goTo = useCallback((n:number) => setIndex(Math.max(0, Math.min(SCHOOL_STORY.length - 1, n))), []);
  useEffect(() => { heading.current?.focus({preventScroll:true}); }, [index]);
  useEffect(() => {
    for (const pose of new Set(SCHOOL_STORY.map(item => item.pose))) { const img = new Image(); img.src = posePath(pose); }
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
    <section className="sisters-stage" aria-label={`المشهد ${index + 1} من ${SCHOOL_STORY.length}: ${scene.title}`}
      onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
      onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
      onTouchCancel={() => { gesture.current = null; }}>
      <div className="sisters-room" aria-hidden="true">
        <div className="sisters-figures school-figures">
          <img src={posePath(scene.pose)} alt="" />
        </div>
      </div>
      <article className="sisters-card">
        <p className="sisters-eyebrow">✦ الحصة الثانية · ممر المدرسة</p>
        <h1 ref={heading} tabIndex={-1} aria-describedby="school-turn-description">{scene.title}</h1>
        <span id="school-turn-description" className="sr-only">{scene.speaker}، المشهد {index + 1} من {SCHOOL_STORY.length}</span>
        <div className="sisters-dialogue"><div className="sisters-line"><span className={`sisters-speaker${scene.speaker === 'سارة' ? ' is-laila' : ''}`}>{scene.speaker}</span><p>{scene.text}</p></div></div>
        {scene.finale && <>
          {mode === 'review' && <p className="sisters-review-note">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p>}
          <button className="sisters-finish" type="button" onClick={onComplete}>الدخول إلى القسم <span aria-hidden="true">←</span></button>
        </>}
      </article>
    </section>
    <nav className="sisters-nav" aria-label="التنقّل بين مشاهد الحصة">
      <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}><Icon name="chevron-right" size={18} /> السابق</button>
      <span><bdi>المشهد {index + 1} من {SCHOOL_STORY.length}</bdi></span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={index === SCHOOL_STORY.length - 1}>التالي <Icon name="chevron-left" size={18} /></button>
    </nav>
  </main>;
}
