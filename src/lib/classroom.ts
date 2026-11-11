import { useSyncExternalStore } from "react";

export const CLASSROOM_STORAGE_KEY = "voies.classroom-names.v1";
export const MAX_STUDENTS = 60;
export const MAX_NAME_LENGTH = 40;
export interface ClassroomState {
  names: string[];
  spoken: string[];
  lastSpeaker: string | null;
  noRepeat: boolean;
  storageAvailable: boolean;
}
const empty: ClassroomState = {
  names: [],
  spoken: [],
  lastSpeaker: null,
  noRepeat: true,
  storageAvailable: true,
};
let state = empty;
let started = false;
const listeners = new Set<() => void>();

/** Names are just text, not student accounts. Trim blanks and duplicate entries. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of text.split(/[\r\n،,;]+/u)) {
    const name = Array.from(
      line
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
        .trim()
        .replace(/\s+/gu, " "),
    )
      .slice(0, MAX_NAME_LENGTH)
      .join("");
    const key = name.toLocaleLowerCase("ar");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length === MAX_STUDENTS) break;
  }
  return names;
}
export function readClassroom(raw: string | null): ClassroomState {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...empty };
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || !Array.isArray(record.names))
      return { ...empty };
    const names = parseNames(
      record.names.filter((n): n is string => typeof n === "string").join("\n"),
    );
    const savedSpoken = Array.isArray(record.spoken) ? record.spoken : [];
    const spoken = names.filter((name) => savedSpoken.includes(name));
    return {
      ...empty,
      names,
      spoken,
      lastSpeaker:
        typeof record.lastSpeaker === "string" &&
        names.includes(record.lastSpeaker)
          ? record.lastSpeaker
          : null,
      noRepeat: record.noRepeat !== false,
    };
  } catch {
    return { ...empty };
  }
}
function update(patch: Partial<ClassroomState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(
      CLASSROOM_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        names: state.names,
        spoken: state.spoken,
        lastSpeaker: state.lastSpeaker,
        noRepeat: state.noRepeat,
      }),
    );
    state.storageAvailable = true;
  } catch {
    state.storageAvailable = false;
  }
  listeners.forEach((listener) => listener());
}
export function initializeClassroom() {
  if (started) return;
  started = true;
  try {
    state = readClassroom(window.localStorage.getItem(CLASSROOM_STORAGE_KEY));
  } catch {
    state = { ...empty, storageAvailable: false };
  }
}
export function getClassroom(): ClassroomState {
  return state;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useClassroom() {
  return useSyncExternalStore(subscribe, getClassroom, getClassroom);
}
export function saveNames(text: string) {
  const names = parseNames(text);
  if (JSON.stringify(names) !== JSON.stringify(state.names))
    update({ names, spoken: [], lastSpeaker: null });
  return names;
}
export function setNoRepeat(noRepeat: boolean) {
  update({ noRepeat, spoken: [], lastSpeaker: null });
}
export function resetRound() {
  update({ spoken: [], lastSpeaker: null });
}
export function eligibleNames(
  classroom: Pick<ClassroomState, "names" | "spoken" | "noRepeat">,
) {
  return classroom.noRepeat
    ? classroom.names.filter((name) => !classroom.spoken.includes(name))
    : classroom.names;
}
export function recordSpeaker(name: string): boolean {
  if (!eligibleNames(state).includes(name)) return false;
  update({
    lastSpeaker: name,
    spoken: state.spoken.includes(name)
      ? state.spoken
      : [...state.spoken, name],
  });
  return true;
}
