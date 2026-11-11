import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

/** قفل بجزأين (الحلقة + الجسم) حتى نحرك الحلقة عند الفتح */
export function LockIcon({ size = 24, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path
        className="lock-shackle"
        d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect className="lock-body" x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor" />
      <circle cx="12" cy="15.2" r="1.6" fill="#fff" opacity=".9" />
      <rect x="11.2" y="15.6" width="1.6" height="2.8" rx=".8" fill="#fff" opacity=".9" />
    </svg>
  );
}

export function CheckIcon({ size = 24, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon({ size = 22, ...rest }: P) {
  // مثلث متجه لليسار ليناسب اتجاه القراءة RTL
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M17 5.5v13a1 1 0 0 1-1.5.86l-10.4-6.5a1 1 0 0 1 0-1.72l10.4-6.5A1 1 0 0 1 17 5.5z" fill="currentColor" />
    </svg>
  );
}

export function ReviewIcon({ size = 22, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 4v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 22, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowBackIcon({ size = 22, ...rest }: P) {
  // سهم "رجوع" في RTL يتجه لليمين
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ size = 20, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="currentColor" />
      <circle cx="12" cy="10" r="2.6" fill="#fff" />
    </svg>
  );
}

export function KeyIcon({ size = 20, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <circle cx="8" cy="14" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M11 11l8-8M16 6l2.5 2.5M14 8l2 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function MicIcon({ size = 26, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <rect x="8.2" y="2.5" width="7.6" height="12" rx="3.8" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 17.5V21M8.5 21h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="9.6" y="4.4" width="1.6" height="4.2" rx=".8" fill="#fff" opacity=".55" />
    </svg>
  );
}
