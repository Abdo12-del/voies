import { useSyncExternalStore } from "react";
import { TOTAL_SESSIONS, type LevelId } from "../data/sessions";

/** One classroom journey on this browser. There are no accounts or remote writes. */
export const PROGRESS_STORAGE_KEY = "voies.classroom-progress.v1";
export type StationStatus = "completed" | "current" | "locked";
export interface ProgressState {
  completed: number;
  pendingUnlock: number | null;
  pendingCelebration: LevelId | null;
  storageAvailable: boolean;
}
const empty: ProgressState = {
  completed: 0,
  pendingUnlock: null,
  pendingCelebration: null,
  storageAvailable: true,
};
let state = empty;
let started = false;
const listeners = new Set<() => void>();

export function readProgress(raw: string | null): ProgressState {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...empty };
    const record = value as Record<string, unknown>;
    if (
      record.version !== 1 ||
      !Number.isInteger(record.completed) ||
      (record.completed as number) < 0 ||
      (record.completed as number) > TOTAL_SESSIONS
    )
      return { ...empty };
    const completed = record.completed as number;
    return {
      ...empty,
      completed,
      pendingCelebration:
        record.pendingCelebration === 2 && completed === 32
          ? 2
          : record.pendingCelebration === 1 && completed >= 16 && completed < 32
            ? 1
            : null,
    };
  } catch {
    return { ...empty };
  }
}
function update(patch: Partial<ProgressState>, persist = true) {
  state = { ...state, ...patch };
  if (persist) {
    try {
      window.localStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          completed: state.completed,
          pendingCelebration: state.pendingCelebration,
        }),
      );
      state.storageAvailable = true;
    } catch {
      state.storageAvailable = false;
    }
  }
  listeners.forEach((listener) => listener());
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getState(): ProgressState {
  return state;
}
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getState, getState);
}
export function initializeProgress() {
  if (started) return;
  started = true;
  try {
    update(
      readProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY)),
      false,
    );
  } catch {
    update({ storageAvailable: false }, false);
  }
  window.addEventListener("storage", (event) => {
    if (event.key === PROGRESS_STORAGE_KEY || event.key === null)
      update(readProgress(event.newValue), false);
  });
}
export function statusOf(id: number, completed: number): StationStatus {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_SESSIONS) return "locked";
  if (id <= completed) return "completed";
  return id === completed + 1 ? "current" : "locked";
}
export function currentSessionId(completed: number): number | null {
  return completed >= TOTAL_SESSIONS ? null : completed + 1;
}
export function currentLevel(completed: number): LevelId {
  return completed >= 16 ? 2 : 1;
}
export function isLevelComplete(level: LevelId, completed: number): boolean {
  return completed >= level * 16;
}

/** The expected count also makes a stale/double click a no-op, not a second step. */
export function approveNext(expectedCount: number): boolean {
  if (state.completed !== expectedCount || state.completed >= TOTAL_SESSIONS)
    return false;
  const completed = state.completed + 1;
  update({
    completed,
    pendingUnlock: completed < TOTAL_SESSIONS ? completed + 1 : null,
    pendingCelebration: completed === 16 ? 1 : completed === 32 ? 2 : null,
  });
  return true;
}
export function undoLast(expectedCount: number): boolean {
  if (state.completed !== expectedCount || state.completed === 0) return false;
  update({
    completed: state.completed - 1,
    pendingUnlock: null,
    pendingCelebration: null,
  });
  return true;
}
export function resetProgress() {
  update({ completed: 0, pendingUnlock: null, pendingCelebration: null });
}
export function clearPendingUnlock() {
  if (state.pendingUnlock !== null) update({ pendingUnlock: null }, false);
}
export function clearPendingCelebration() {
  if (state.pendingCelebration !== null) update({ pendingCelebration: null });
}
