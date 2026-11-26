import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SCHOOL_STORY } from '../data/schoolStory';
import { Icon } from './icons';
import './SistersLesson.css';
import './SchoolLesson.css';

interface Props { id:number; mode:'learn' | 'review'; onBack:() => void; onPickSpeaker:() => void; onComplete:() => void; }
const posePath = (pose:string) => pose === 'friend-greet' ? '/school-entry/friend.webp' : pose.startsWith('friend-') ? `/school-lesson/${pose}.webp` : `/sisters-story/solo/${pose}.webp`;

/** The whole conversation happens in the hall, one speaker at a time. */
export function SchoolLesson({ mode, onBack, onPickSpeaker, onComplete }:Props) {
  const [index, setIndex] = useState(0);
  const [camera, setCamera] = useState({width:0, height:0, ready:false});
  const [leaving, setLeaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const leavingRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>();
  const viewport = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{x:number;y:number} | null>(null);
  const scene = SCHOOL_STORY[index];
  const lastSpeaker = useRef(scene.speaker);
  const goTo = useCallback((n:number) => {
    if (!leavingRef.current) setIndex(Math.max(0, Math.min(SCHOOL_STORY.length - 1, n)));
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setCamera(previous => ({...previous, width:element.clientWidth, height:element.clientHeight}));
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setCamera(previous => ({...previous, ready:true}))); });
    return () => { observer.disconnect(); cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, []);
  useLayoutEffect(() => {
    if (lastSpeaker.current === scene.speaker) return;
    lastSpeaker.current = scene.speaker;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setMoving(false); return; }
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), 1050);
    return () => clearTimeout(timer);
  }, [scene.speaker]);
  useEffect(() => () => clearTimeout(exitTimer.current), []);
  const finishExit = useCallback(() => {
    if (!leavingRef.current) return;
    leavingRef.current = false;
    clearTimeout(exitTimer.current);
    onComplete();
  }, [onComplete]);
  const beginExit = useCallback(() => {
    if (leavingRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onComplete(); return; }
    leavingRef.current = true;
    setLeaving(true);
    exitTimer.current = setTimeout(finishExit, 1400);
  }, [finishExit, onComplete]);
  // Both speakers stay at fixed coordinates in one high-resolution hallway.
  // Only the shared camera transform changes with the active speaker.
  const worldWidth = Math.max(camera.width * 1.5, camera.height * 1376 / 768);
  const worldHeight = worldWidth * 768 / 1376;
  const wideScale = worldWidth && worldHeight ? Math.max(camera.width / worldWidth, camera.height / worldHeight) : 1;
  const wideX = (camera.width - worldWidth * wideScale) / 2;
  const wideY = (worldHeight * wideScale - camera.height) / 2;
  // Keep the distant pupils fully in the shot without moving the speakers
  // relative to the floor when the camera is close.
  const closeY = Math.max(0, worldHeight - camera.height) * .32;
  const activeX = scene.speaker === 'سارة' ? .25 : .52;
  const framingX = camera.width <= 700 && camera.height > camera.width ? .32 : .34;
  const closeX = Math.max(camera.width - worldWidth, Math.min(0, camera.width * framingX - worldWidth * activeX));
  const wide = !camera.ready || leaving;
  const cameraStyle = {transform:`translate3d(${wide ? wideX : closeX}px, ${wide ? wideY : closeY}px, 0) scale(${wide ? wideScale : 1})`};
  const visual = leaving ? undefined : scene.visual;
  const teachingShift = visual ? camera.width * .5 - (closeX + worldWidth * .25) : 0;
  const previous = SCHOOL_STORY.slice(0, index + 1);
  const friendPose = [...previous].reverse().find(item => item.speaker === 'سارة')?.pose ?? 'friend-greet';
  const youngPose = [...previous].reverse().find(item => item.speaker === 'الطفلة')?.pose ?? 'young-worried';
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
  return <main className={`sisters-lesson school-lesson${visual ? ' has-school-demonstration' : ''}`} aria-label="الحصة الثانية: صوتي يصل" dir="rtl">
    <div className="sisters-top">
      <button className="sisters-tool" onClick={onBack} type="button"><Icon name="back" size={18} /> العودة إلى رحلتي</button>
      {mode === 'review' && <span className="sisters-review">وضع المراجعة</span>}
      <button className="sisters-tool" onClick={onPickSpeaker} type="button"><Icon name="wheel" size={18} /> مَن يتحدث؟</button>
    </div>
    <section ref={viewport} className={`sisters-stage${leaving ? ' is-hall-leaving' : ''}${visual ? ' is-school-demonstration' : ''}`} data-visual={visual} aria-label={`المشهد ${index + 1} من ${SCHOOL_STORY.length}: ${scene.title}`}
      onTouchStart={event => { const p = event.changedTouches[0]; gesture.current = {x:p.clientX,y:p.clientY}; }}
      onTouchEnd={event => { const p = event.changedTouches[0], start = gesture.current; gesture.current = null; if (start && Math.abs(p.clientX-start.x) >= 48 && Math.abs(p.clientX-start.x) > Math.abs(p.clientY-start.y)*1.2) goTo(index + (p.clientX < start.x ? 1 : -1)); }}
      onTouchCancel={() => { gesture.current = null; }}>
      <div className="sisters-room" aria-hidden="true">
        <div className="school-hall-world" style={cameraStyle} onTransitionEnd={event => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && leaving) finishExit();
        }} />
        <div className="school-teaching-backdrop" />
        <div className="school-hall-people-viewport">
          <div className={`school-hall-people${!camera.ready ? ' is-establishing' : ''}${moving ? ' is-moving' : ''}`} style={{...cameraStyle, '--hall-close-y': `${closeY}px`, '--teaching-shift': `${teachingShift}px`} as CSSProperties}>
            <div className={`school-figures school-figure-friend${scene.speaker === 'سارة' ? ' is-active' : ''}`} data-speaker="friend">
              {visual && <div className={`school-teaching-cue${visual === 'scattered' || visual === 'ordered' ? ` is-ideas is-${visual}` : ' is-breath'}`}>
                {visual === 'scattered' || visual === 'ordered' ? <>
                  <span className="school-cue-caption">{visual === 'scattered' ? 'أفكار متزاحمة' : 'فكرة في كل مرة'}</span>
                  <div className="school-idea-words"><span>اسمي</span><span>مدرستي</span><span>ما أحبّه</span></div>
                </> : <>
                  <span className={`school-breath-mark${visual === 'inhale' ? ' is-current' : ''}`}>شهيق <small>من الأنف</small><b>↓</b></span>
                  <span className={`school-breath-mark${visual === 'exhale' ? ' is-current' : ''}`}>زفير <small>من الفم</small><b>↑</b></span>
                </>}
              </div>}
              <img src={posePath(friendPose)} alt="" />
            </div>
            <div className={`school-figures school-figure-young${scene.speaker === 'الطفلة' ? ' is-active' : ''}`} data-speaker="young"><img src={posePath(youngPose)} alt="" /></div>
          </div>
        </div>
      </div>
      <article className="sisters-card">
        <p className="sisters-eyebrow">✦ الحصة الثانية · ممر المدرسة</p>
        <h1 ref={heading} tabIndex={-1} aria-describedby="school-turn-description">{scene.title}</h1>
        <span id="school-turn-description" className="sr-only">{scene.speaker}، المشهد {index + 1} من {SCHOOL_STORY.length}. {visual === 'scattered' ? 'تظهر الأفكار متزاحمة: اسمي، مدرستي، ما أحبّه.' : visual === 'ordered' ? 'تنتظم الأفكار: اسمي، ثم مدرستي، ثم ما أحبّه.' : visual === 'inhale' ? 'شهيق لطيف من الأنف.' : visual === 'exhale' ? 'زفير مريح من الفم.' : visual ? 'شهيق من الأنف، وزفير من الفم.' : ''}</span>
        <div className="sisters-dialogue"><div className="sisters-line"><span className={`sisters-speaker${scene.speaker === 'سارة' ? ' is-laila' : ''}`}>{scene.speaker}</span><p>{scene.text}</p></div></div>
        {scene.finale && <>
          {mode === 'review' && <p className="sisters-review-note">هذه مراجعة ولا تغيّر تقدّم الرحلة.</p>}
          <button className="sisters-finish" type="button" onClick={beginExit} disabled={leaving}>الدخول إلى القسم <span aria-hidden="true">←</span></button>
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
