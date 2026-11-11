import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
  dismissible?: boolean;
}

export function Modal({ open, onClose, labelledBy, className = "", children, dismissible = true }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button.btn, input");
      el?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      lastFocus.current?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div className="modal-root" role="presentation">
      <div className="modal-backdrop" onClick={dismissible ? onClose : undefined} />
      <div ref={panelRef} className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {dismissible && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="إغلاق">
            <CloseIcon />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
