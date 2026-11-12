import type { ReactNode, SVGProps } from "react";
import type { SessionIconName } from "../data/sessions";

type P = Omit<SVGProps<SVGSVGElement>, "name"> & { size?: number };
export type IconName =
  | SessionIconName
  | "lock"
  | "check"
  | "play"
  | "review"
  | "close"
  | "back"
  | "pin"
  | "key"
  | "medal"
  | "crown"
  | "leaf"
  | "chevron-left"
  | "chevron-right"
  | "teacher"
  | "plus"
  | "logout"
  | "copy"
  | "info"
  | "wifi"
  | "mouse"
  | "wheel";

/** One rounded, two-pixel SVG family, including a distinct illustration for every session. */
const drawings: Record<IconName, ReactNode> = {
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v7m0 4v7M3 12h7m4 0h7M5.6 5.6l5 5m2.8 2.8 5 5m0-12.8-5 5m-2.8 2.8-5 5" />
      <path d="m10 1 2 3 2-3" />
    </>
  ),
  hand: (
    <>
      <path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-12 5l-4-5a1.6 1.6 0 0 1 2.4-2Z" />
      <path d="m3 5 1 2M5 2l1 2" />
    </>
  ),
  speaker: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5Z" />
      <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bulb: (
    <>
      <path d="M8 16c0-3-3-3.5-3-8a7 7 0 0 1 14 0c0 4.5-3 5-3 8Z" />
      <path d="M9 19h6m-5 3h4m-2-6v-5m-3-2 3 2 3-2" />
    </>
  ),
  puzzle: (
    <path d="M9 3H3v6h2a2.5 2.5 0 1 1 0 5H3v7h6v-2a2.5 2.5 0 1 1 5 0v2h7v-7h-2a2.5 2.5 0 1 1 0-5h2V3h-7v2a2.5 2.5 0 1 1-5 0Z" />
  ),
  map: (
    <>
      <path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Zm6-3v17m8-14v17" />
      <path d="m11 10 2 2-2 2" />
    </>
  ),
  door: (
    <>
      <path d="M4 21V3h14v18M8 21V6l10-3v18ZM2 21h20" />
      <path d="M14 12v2" />
    </>
  ),
  cards: (
    <>
      <rect x="7" y="6" width="14" height="16" rx="2" />
      <path d="M4 18H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1m-5 8h6m-6 4h6m-6 4h3" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4 2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3-4-6-9-6Z" />
      <circle cx="7" cy="10" r=".7" />
      <circle cx="10" cy="7" r=".7" />
      <circle cx="15" cy="7" r=".7" />
      <circle cx="6" cy="15" r=".7" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 18-1Z" />
      <path d="M7 9h8m-8 5h5" />
    </>
  ),
  ear: (
    <>
      <path d="M5 10a7 7 0 0 1 14 0c0 4-4 5-5 8-.5 2-1.5 4-4 4a4 4 0 0 1-4-4" />
      <path d="M9 11a3 3 0 1 1 6 0c0 2-3 2-3 5" />
    </>
  ),
  handshake: (
    <>
      <path d="m2 9 4-5 4 2 4-2 8 5-4 8-3 3-7-4-3 1-3-3m5-5 5-4m-5 4 3 3 4-2 5 4m-9 1 5 3" />
    </>
  ),
  "hand-up": (
    <>
      <circle cx="11" cy="5" r="3" />
      <path d="M5 22v-7a4 4 0 0 1 4-4h4l5-6 3 2-5 8v7m-7 0v-6m4 6v-6M19 2v1" />
    </>
  ),
  masks: (
    <>
      <path d="M2 5c4 2 8 2 12 0v7c0 4-3 6-6 8-3-2-6-4-6-8Zm5-3c4 2 9 2 14 0v8c0 4-2 7-5 9" />
      <path d="M5 10h1m4 0h1m-6 4q3 3 6 0m6-6h1" />
    </>
  ),
  mic: (
    <>
      <rect x="8" y="2" width="8" height="13" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0m-7 7v4m-4 0h8M11 6h2m-2 3h2" />
    </>
  ),
  star: (
    <>
      <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />
      <path d="m10 11 2 2 3-3" />
    </>
  ),
  rocket: (
    <>
      <path d="M8 16C5 9 12 2 21 3c1 9-6 16-13 13Zm-1-7-4 1-1 6h6m7 1-1 4-6 1v-6M3 19l-1 3 3-1" />
      <circle cx="16" cy="8" r="2" />
    </>
  ),
  target: (
    <>
      <circle cx="11" cy="13" r="9" />
      <circle cx="11" cy="13" r="5" />
      <path d="m11 13 9-9m-3-2v5h5" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 8L22 6m-20 13 6-6m14 6-6-6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM3 2v4m-2-2h4m15 14v4m-2-2h4" />
    </>
  ),
  bricks: (
    <>
      <path d="M2 6h20v15H2Zm0 5h20M2 16h20M9 6v5m7 0v5m-7 0v5M3 2h5m8 0h5" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 7 7M7 10h6m-3-3v6" />
    </>
  ),
  book: (
    <>
      <path d="M12 6S8 2 2 4v16c6-2 10 2 10 2s4-4 10-2V4c-6-2-10 2-10 2Zm0 0v16M5 8l4 1m-4 4 4 1m6-5 4-1m-4 6 4-1" />
    </>
  ),
  image: (
    <>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <circle cx="8" cy="9" r="2" />
      <path d="m2 18 5-5 4 4 5-7 6 8" />
    </>
  ),
  wave: (
    <>
      <path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4" />
    </>
  ),
  building: (
    <>
      <path d="M3 22V8h8v14M3 12h8m-8 5h8m4 5V4h6v18M13 4l5-3 5 3M15 9h6m-6 5h6m-6 4h6M1 22h22" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m16 7-2 7-6 3 2-7Zm-4-5v1m0 18v1M2 12h1m18 0h1" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 8a4 4 0 0 1 8 0c0 3-4 3-4 6m0 3v.1" />
    </>
  ),
  answer: (
    <>
      <path d="M21 13a8 8 0 0 1-8 7H7l-5 2V10a8 8 0 0 1 16-2m-11 4 3 3L21 4" />
    </>
  ),
  scales: (
    <>
      <path d="M12 3v18m-5 1h10M3 6h18M6 6l-4 8h8Zm12 0-4 8h8ZM2 14c0 4 8 4 8 0m4 0c0 4 8 4 8 0" />
    </>
  ),
  school: (
    <>
      <path d="m2 10 10-7 10 7M4 9v13h16V9M9 22v-7h6v7m-8-11h1m8 0h1M12 3V1h5v3" />
      <circle cx="12" cy="10" r="1.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 9 11-4 7-3v18l-7-3-11-4Zm0 0H1v4h2m4 2 2 7h4l-2-6m3-11v12" />
    </>
  ),
  lock: (
    <>
      <path className="lock-shackle" d="M7 10V7a5 5 0 0 1 10 0v3" />
      <rect x="4" y="10" width="16" height="12" rx="3" />
      <path d="M12 15v3" />
    </>
  ),
  check: <path d="m5 12 5 5L20 6" />,
  play: <path d="m17 4-12 8 12 8Z" fill="currentColor" strokeWidth="1" />,
  review: (
    <>
      <path d="M4 10a8 8 0 1 1 1 8M4 3v7h7" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  back: <path d="M3 12h17m-6-6 6 6-6 6" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="16" r="5" />
      <path d="m10 12 11-11m-5 5 3 3m-6-1 3 3" />
    </>
  ),
  medal: (
    <>
      <path d="m6 2 6 6 6-6M3 2h5l4 5 4-5h5l-6 10H9Z" />
      <circle cx="12" cy="16" r="6" fill="currentColor" fillOpacity=".12" />
      <path
        d="m12 12 1.2 2.4 2.8.4-2 2 .5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-2 2.8-.4Z"
        strokeWidth="1.3"
      />
    </>
  ),
  crown: (
    <>
      <path d="m2 5 5 4 5-7 5 7 5-4-3 14H5Zm3 17h14M6 15h12" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C9 1 1 7 5 16c9 5 17-2 15-13ZM5 20l11-12m-7 8v-5m0 5h5" />
    </>
  ),
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  teacher: (
    <>
      <path d="m1 7 11-5 11 5-11 5ZM5 9v6c5 4 9 4 14 0V9m4-2v9M5 22c2-5 12-5 14 0" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  logout: (
    <>
      <path d="M9 3H3v18h6m-1-9h14m-5-5 5 5-5 5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="14" rx="2" />
      <path d="M16 5V2H2v14h3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0m-4 4v.1" />
    </>
  ),
  mouse: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="6" />
      <path d="M12 6v4" />
    </>
  ),
};

export function Icon({ name, size = 24, ...rest }: P & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {drawings[name]}
    </svg>
  );
}

export const LockIcon = (p: P) => <Icon name="lock" {...p} />;
export const CheckIcon = (p: P) => <Icon name="check" {...p} />;
export const PlayIcon = (p: P) => <Icon name="play" {...p} />;
export const ReviewIcon = (p: P) => <Icon name="review" {...p} />;
export const CloseIcon = (p: P) => <Icon name="close" {...p} />;
export const ArrowBackIcon = (p: P) => <Icon name="back" {...p} />;
export const PinIcon = (p: P) => <Icon name="pin" {...p} />;
export const KeyIcon = (p: P) => <Icon name="key" {...p} />;
export const MicIcon = (p: P) => <Icon name="mic" {...p} />;
