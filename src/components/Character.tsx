/**
 * شخصيات البرنامج — مأخوذة من الرسومات المرجعية الأصلية (ليلى، سامي، الأخت الصغيرة)
 * دون إعادة تصميم. الوضعيات الإضافية (الإشارة، الاحتفال، التلويح) مشتقة من
 * الرسومات نفسها مع الحفاظ على الملامح والملابس والألوان وأسلوب الرسم.
 */
export const CHARACTERS = {
  laila: { name: "ليلى", src: "/characters/laila.webp", ratio: 462 / 720 },
  lailaPoint: { name: "ليلى", src: "/characters/laila-point.webp", ratio: 310 / 720 },
  sami: { name: "سامي", src: "/characters/sami.webp", ratio: 414 / 720 },
  samiCheer: { name: "سامي", src: "/characters/sami-cheer.webp", ratio: 552 / 720 },
  sister: { name: "الأخت الصغيرة", src: "/characters/sister.webp", ratio: 425 / 720 },
  sisterWave: { name: "الأخت الصغيرة", src: "/characters/sister-wave.webp", ratio: 365 / 720 },
} as const;

export type CharacterKey = keyof typeof CHARACTERS;

interface Props {
  who: CharacterKey;
  height: number;
  className?: string;
  flip?: boolean;
  style?: React.CSSProperties;
  decorative?: boolean;
}

export function Character({ who, height, className = "", flip, style, decorative = true }: Props) {
  const c = CHARACTERS[who];
  return (
    <img
      src={c.src}
      alt={decorative ? "" : c.name}
      aria-hidden={decorative || undefined}
      width={Math.round(height * c.ratio)}
      height={height}
      draggable={false}
      className={`character ${flip ? "is-flipped" : ""} ${className}`}
      style={style}
    />
  );
}
