import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
  dismissible?: boolean;
}
const stack: symbol[] = [];

/** Accessible portal: focus is trapped, the map is inert, Escape and focus restoration work. */
export function Modal({
  open,
  onClose,
  labelledBy,
  className = "",
  children,
  dismissible = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    stack.push(id);
    const lastFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    root?.setAttribute("aria-hidden", "true");
    const focus = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input, button.btn, button",
      );
      (target ?? panelRef.current)?.focus({ preventScroll: true });
    });
    const keydown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((e) => e.getClientRects().length && !e.closest("[hidden]"));
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        panelRef.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(focus);
      document.removeEventListener("keydown", keydown);
      stack.splice(stack.indexOf(id), 1);
      if (!stack.length) {
        root?.removeAttribute("inert");
        root?.removeAttribute("aria-hidden");
      }
      lastFocus?.focus({ preventScroll: true });
    };
  }, [open, dismissible]);
  if (!open) return null;
  return createPortal(
    <div className="modal-root">
      <div
        className="modal-backdrop"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        dir="rtl"
      >
        {dismissible && (
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <CloseIcon size={22} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
