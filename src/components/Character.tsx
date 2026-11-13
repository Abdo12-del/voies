/**
 * سجل الشخصيات.
 *
 * - الشخصيات الستّ الأولى رسومات الخارطة الأصلية (ليلى، سامي، الأخت الصغيرة):
 *   تبقى كما هي بايتًا ببايت لأن الخارطة لا تتغيّر.
 * - شخصيات الحصة (`lesson: true`) من مكتبة «شخصيات المتحدث» على Google Drive:
 *   قُصّت من صور الوضعيات وأوراق الملصقات بخلفية شفافة، WebP بارتفاع 720px.
 *   الوضعية الوحيدة الناقصة في المكتبة (التشجيع) وُلّدت بصورة ليلى مرجعًا
 *   بنفس الملامح والملابس وأسلوب الرسم (`origin: "generated"`).
 * - `bust`: رسم نصفي مقصوص من الأسفل؛ يتلاشى طرفه السفلي بلطف في الشريحة.
 */
type Origin = "original" | "drive" | "generated";

interface CharacterAsset {
  name: string;
  src: string;
  ratio: number;
  /** وصف الوضعية بالعربية */
  pose?: string;
  origin: Origin;
  bust?: boolean;
  lesson?: boolean;
}

export const CHARACTERS = {
  laila: {
    name: "ليلى",
    src: "/characters/laila.webp",
    ratio: 462 / 720,
    origin: "original",
  },
  lailaPoint: {
    name: "ليلى",
    src: "/characters/laila-point.webp",
    ratio: 310 / 720,
    origin: "original",
  },
  sami: {
    name: "سامي",
    src: "/characters/sami.webp",
    ratio: 414 / 720,
    origin: "original",
  },
  samiCheer: {
    name: "سامي",
    src: "/characters/sami-cheer.webp",
    ratio: 552 / 720,
    origin: "original",
  },
  sister: {
    name: "الأخت الصغيرة",
    src: "/characters/sister.webp",
    ratio: 425 / 720,
    origin: "original",
  },
  sisterWave: {
    name: "الأخت الصغيرة",
    src: "/characters/sister-wave.webp",
    ratio: 365 / 720,
    origin: "original",
  },

  /* ── مكتبة «شخصيات المتحدث» — شخصيات عرض الحصة ── */
  lailaWave: {
    name: "ليلى",
    pose: "تلوّح مرحّبة",
    src: "/characters/laila-wave.webp",
    ratio: 258 / 720,
    origin: "drive",
    lesson: true,
  },
  lailaExplain: {
    name: "ليلى",
    pose: "تشرح وتوضّح",
    src: "/characters/laila-explain.webp",
    ratio: 461 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  samiExplain: {
    name: "سامي",
    pose: "يشرح ويشير",
    src: "/characters/sami-explain.webp",
    ratio: 473 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  samiThink: {
    name: "سامي",
    pose: "يفكّر",
    src: "/characters/sami-think.webp",
    ratio: 369 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  samiConfident: {
    name: "سامي",
    pose: "واثق وعازم: «أنا أستطيع!»",
    src: "/characters/sami-confident.webp",
    ratio: 590 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  samiSuccess: {
    name: "سامي",
    pose: "إجابة صحيحة ونجاح",
    src: "/characters/sami-success.webp",
    ratio: 256 / 720,
    origin: "drive",
    lesson: true,
  },
  sisterCheer: {
    name: "الأخت الصغيرة",
    pose: "تحتفل",
    src: "/characters/sister-cheer.webp",
    ratio: 609 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  sisterIdea: {
    name: "الأخت الصغيرة",
    pose: "تشير: «لدي فكرة!»",
    src: "/characters/sister-idea.webp",
    ratio: 791 / 720,
    origin: "drive",
    bust: true,
    lesson: true,
  },
  lailaEncourage: {
    name: "ليلى",
    pose: "تشجّع: «لا بأس، حاول مرة أخرى»",
    src: "/characters/laila-encourage.webp",
    ratio: 248 / 720,
    origin: "generated",
    lesson: true,
  },
} as const satisfies Record<string, CharacterAsset>;

export type CharacterKey = keyof typeof CHARACTERS;

interface Props {
  who: CharacterKey;
  height: number;
  className?: string;
  flip?: boolean;
  style?: React.CSSProperties;
  decorative?: boolean;
}

export function Character({
  who,
  height,
  className = "",
  flip,
  style,
  decorative = true,
}: Props) {
  const c: CharacterAsset = CHARACTERS[who];
  return (
    <img
      src={c.src}
      alt={decorative ? "" : c.name}
      aria-hidden={decorative || undefined}
      width={Math.round(height * c.ratio)}
      height={height}
      draggable={false}
      className={`character ${c.bust ? "is-bust" : ""} ${flip ? "is-flipped" : ""} ${className}`}
      style={style}
    />
  );
}
