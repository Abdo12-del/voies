import { useSyncExternalStore } from "react";
import { TOTAL_SESSIONS, getSession, type LevelId } from "../data/sessions";

/**
 * مخزن تقدّم الطفل.
 *
 * القاعدة الأساسية: لا يمكن فتح أي حصة إلا عبر approveNext() التي يستدعيها
 * المدرّب من لوحته المحمية برمز. الدالة تُكمل الحصة الحالية فقط، وتفتح التي تليها
 * مباشرة — لا قفز ولا فتح يدوي لحصة لاحقة.
 *
 * التخزين حاليًا محلي (localStorage). لربطه بقاعدة بيانات (مثل Supabase)
 * يكفي استبدال loadRaw / saveRaw مع الإبقاء على الواجهة نفسها.
 */

export type StationStatus = "completed" | "current" | "locked";

export interface ApprovalEntry {
  session: number;
  at: string; // ISO date
}

export interface ProgressState {
  version: 1;
  /** عدد الحصص المكتملة (0 → 32). الحصة الحالية = completed + 1 */
  completed: number;
  childName: string;
  history: ApprovalEntry[];
  pinHash: string | null;
  /** حصة فُتحت للتو ولم يُعرض تأثير فتح القفل بعد */
  pendingUnlock: number | null;
  /** مستوى اكتمل للتو ولم يُعرض احتفاله بعد */
  pendingCelebration: LevelId | null;
}

const KEY = "almutahadith.progress.v1";

const initialState: ProgressState = {
  version: 1,
  completed: 0, // الحصة الأولى مفتوحة، والحصص 2 → 32 مقفلة
  childName: "",
  history: [],
  pinHash: null,
  pendingUnlock: null,
  pendingCelebration: null,
};

function clampCompleted(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.min(Math.max(v, 0), TOTAL_SESSIONS);
}

function loadRaw(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...initialState };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...initialState,
      ...parsed,
      version: 1,
      completed: clampCompleted(parsed.completed),
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...initialState };
  }
}

function saveRaw(s: ProgressState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* التخزين غير متاح — نكتفي بالحالة في الذاكرة */
  }
}

let state: ProgressState = typeof window !== "undefined" ? loadRaw() : { ...initialState };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: ProgressState) {
  state = next;
  saveRaw(state);
  emit();
}

// مزامنة بين النوافذ: إن اعتمد المدرّب من نافذة أخرى تتحدّث خارطة الطفل فورًا
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = loadRaw();
      emit();
    }
  });
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState() {
  return state;
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ───────────── قراءة الحالة ─────────────

export function statusOf(sessionId: number, completed: number): StationStatus {
  if (sessionId <= completed) return "completed";
  if (sessionId === completed + 1) return "current";
  return "locked";
}

export function currentSessionId(completed: number): number | null {
  return completed >= TOTAL_SESSIONS ? null : completed + 1;
}

export function currentLevel(completed: number): LevelId {
  return completed >= 16 ? 2 : 1;
}

export function isLevelComplete(level: LevelId, completed: number) {
  return completed >= (level === 1 ? 16 : 32);
}

// ───────────── إجراءات المدرّب فقط ─────────────

/** اعتماد إكمال الحصة الحالية وفتح الحصة التالية مباشرة */
export function approveNext(): boolean {
  const s = state;
  if (s.completed >= TOTAL_SESSIONS) return false;
  const finished = s.completed + 1;
  const completed = finished;
  const nextOpen = completed < TOTAL_SESSIONS ? completed + 1 : null;
  const celebration: LevelId | null =
    completed === 16 ? 1 : completed === 32 ? 2 : null;
  setState({
    ...s,
    completed,
    history: [...s.history, { session: finished, at: new Date().toISOString() }],
    pendingUnlock: nextOpen,
    pendingCelebration: celebration,
  });
  return true;
}

/** التراجع عن آخر اعتماد (في حال الاعتماد بالخطأ) */
export function undoLast(): boolean {
  const s = state;
  if (s.completed <= 0) return false;
  setState({
    ...s,
    completed: s.completed - 1,
    history: s.history.slice(0, -1),
    pendingUnlock: null,
    pendingCelebration: null,
  });
  return true;
}

export function resetJourney() {
  setState({ ...state, completed: 0, history: [], pendingUnlock: null, pendingCelebration: null });
}

export function setChildName(name: string) {
  setState({ ...state, childName: name.trim().slice(0, 30) });
}

export function setPinHash(hash: string) {
  setState({ ...state, pinHash: hash });
}

// ───────────── استهلاك المؤثرات لمرة واحدة ─────────────

export function clearPendingUnlock() {
  if (state.pendingUnlock !== null) setState({ ...state, pendingUnlock: null });
}

export function clearPendingCelebration() {
  if (state.pendingCelebration !== null) setState({ ...state, pendingCelebration: null });
}

export function lastApprovalLabel(s: ProgressState): string | null {
  const last = s.history[s.history.length - 1];
  if (!last) return null;
  const session = getSession(last.session);
  const d = new Date(last.at);
  const date = d.toLocaleDateString("ar", { day: "numeric", month: "long" });
  return `الحصة ${last.session}${session ? `: ${session.title}` : ""} — ${date}`;
}
