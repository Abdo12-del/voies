import { useSyncExternalStore } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { TOTAL_SESSIONS, type LevelId } from "../data/sessions";
import { supabase, supabaseConfigurationError } from "./supabase";

export type StationStatus = "completed" | "current" | "locked";
export interface Profile {
  id: string;
  role: "teacher" | "student";
  name: string;
}
export interface Student {
  id: string;
  name: string;
  teacher_id: string;
  completed: number;
  updated_at: string | null;
}
interface ProgressRow {
  student_id: string;
  completed_count: number;
  updated_at: string;
  approved_by: string | null;
}
export interface ProgressState {
  completed: number;
  childName: string;
  studentId: string | null;
  profile: Profile | null;
  students: Student[];
  mode: "demo" | "cloud";
  loading: boolean;
  connection: "demo" | "connecting" | "live" | "offline";
  error: string | null;
  pendingUnlock: number | null;
  pendingCelebration: LevelId | null;
}

const initialState: ProgressState = {
  completed: 0,
  childName: "",
  studentId: null,
  profile: null,
  students: [],
  mode: supabase ? "cloud" : "demo",
  loading: !!supabase,
  connection: supabase ? "connecting" : "demo",
  error: supabaseConfigurationError,
  pendingUnlock: null,
  pendingCelebration: null,
};
let state = initialState;
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let accountVersion = 0;
let activeUserId: string | null = null;
let accountLoad: { userId: string | null; promise: Promise<void> } | null =
  null;
let started = false;
let mutationBusy = false;

function update(patch: Partial<ProgressState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function getState(): ProgressState {
  return state;
}
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getState, getState);
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

function isProgressRow(value: unknown): value is ProgressRow {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<ProgressRow>;
  return (
    typeof r.student_id === "string" &&
    Number.isInteger(r.completed_count) &&
    r.completed_count! >= 0 &&
    r.completed_count! <= 32
  );
}
function applyProgress(row: ProgressRow, initial = false) {
  if (row.student_id !== state.studentId || !isProgressRow(row)) return;
  const old = state.completed,
    count = row.completed_count;
  const advanced = !initial && count > old;
  update({
    completed: count,
    pendingUnlock:
      advanced && count < 32
        ? count + 1
        : count < old
          ? null
          : state.pendingUnlock,
    pendingCelebration:
      (initial && (count === 16 || count === 32)) ||
      (advanced && ((old < 16 && count >= 16) || count === 32))
        ? count === 32
          ? 2
          : 1
        : count < old
          ? null
          : state.pendingCelebration,
    students: state.students.map((s) =>
      s.id === row.student_id
        ? { ...s, completed: count, updated_at: row.updated_at }
        : s,
    ),
  });
}
function detachRealtime() {
  if (channel && supabase) void supabase.removeChannel(channel);
  channel = null;
}

async function readStudentProgress(version = accountVersion, initial = false) {
  if (!supabase || !state.studentId) return;
  const id = state.studentId;
  const { data, error } = await supabase
    .from("progress")
    .select("student_id,completed_count,updated_at,approved_by")
    .eq("student_id", id)
    .single();
  if (version !== accountVersion || id !== state.studentId) return;
  if (error || !isProgressRow(data)) {
    update({
      error: "تعذّر تحديث التقدّم. لن تُفتح أي محطة قبل وصول اعتماد المدرّب.",
      connection: "offline",
      loading: false,
    });
    return;
  }
  applyProgress(data, initial);
  update({ error: null, loading: false });
}

async function readStudents(version = accountVersion) {
  if (!supabase || state.profile?.role !== "teacher") return;
  const { data: students, error } = await supabase
    .from("students")
    .select("id,name,teacher_id")
    .order("name");
  if (version !== accountVersion) return;
  if (error || !students) throw new Error("تعذّر تحميل قائمة التلاميذ.");
  const ids = students.map((s) => s.id as string);
  const result = ids.length
    ? await supabase
        .from("progress")
        .select("student_id,completed_count,updated_at,approved_by")
        .in("student_id", ids)
    : { data: [], error: null };
  if (version !== accountVersion) return;
  if (result.error) throw new Error("تعذّر تحميل تقدّم التلاميذ.");
  const rows = (result.data ?? []).filter(isProgressRow);
  const list: Student[] = students.map((s) => {
    const row = rows.find((r) => r.student_id === s.id);
    return {
      id: s.id as string,
      name: s.name as string,
      teacher_id: s.teacher_id as string,
      completed: row?.completed_count ?? 0,
      updated_at: row?.updated_at ?? null,
    };
  });
  const selected = list.find((s) => s.id === state.studentId) ?? list[0];
  const changedStudent = selected?.id !== state.studentId;
  update({
    students: list,
    studentId: selected?.id ?? null,
    childName: selected?.name ?? "",
    loading: false,
  });
  const row = rows.find((r) => r.student_id === selected?.id);
  if (row) {
    if (changedStudent)
      update({
        completed: row.completed_count,
        pendingUnlock: null,
        pendingCelebration: null,
      });
    else applyProgress(row);
  }
}

function attachRealtime(version: number) {
  if (!supabase || !state.profile) return;
  detachRealtime();
  const filter =
    state.profile.role === "student"
      ? `student_id=eq.${state.profile.id}`
      : undefined;
  channel = supabase
    .channel(`journey-${state.profile.id}-${version}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "progress",
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        if (version !== accountVersion) return;
        if (isProgressRow(payload.new)) {
          const row = payload.new;
          if (row.student_id === state.studentId) applyProgress(row);
          else
            update({
              students: state.students.map((s) =>
                s.id === row.student_id
                  ? {
                      ...s,
                      completed: row.completed_count,
                      updated_at: row.updated_at,
                    }
                  : s,
              ),
            });
        }
      },
    )
    .subscribe((status) => {
      if (version !== accountVersion) return;
      if (status === "SUBSCRIBED") {
        update({ connection: "live", error: null });
        // Refetch after every reconnect: events missed while offline must never be lost.
        void (
          state.profile?.role === "teacher"
            ? readStudents(version)
            : readStudentProgress(version)
        ).catch(() =>
          update({
            connection: "offline",
            error: "تعذّر تحديث التقدّم. أعد الاتصال وحاول مجددًا.",
          }),
        );
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        update({ connection: "offline" });
      }
    });
}

/** Auth's INITIAL_SESSION/getSession/SIGNED_IN may arrive together. Share their
 * in-flight load so none resets a partially loaded account or starts duplicate
 * subscriptions, and login callers await the complete student/teacher profile. */
function loadAccount(user: User | null): Promise<void> {
  const userId = user?.id ?? null;
  if (accountLoad?.userId === userId) return accountLoad.promise;
  if (userId === activeUserId && state.profile) return Promise.resolve();
  const promise = fetchAccount(user);
  accountLoad = { userId, promise };
  void promise.finally(() => {
    if (accountLoad?.promise === promise) accountLoad = null;
  });
  return promise;
}

async function fetchAccount(user: User | null) {
  const version = ++accountVersion;
  activeUserId = user?.id ?? null;
  detachRealtime();
  update({
    ...initialState,
    loading: !!user,
    connection: user ? "connecting" : "offline",
  });
  if (!supabase || !user) {
    update({ loading: false, error: null });
    return;
  }
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,role,name")
      .eq("id", user.id)
      .single();
    if (version !== accountVersion) return;
    if (
      error ||
      !profile ||
      !["teacher", "student"].includes(profile.role as string)
    )
      throw new Error(
        "لم يكتمل إعداد حسابك. اطلب من مسؤول البرنامج مراجعة صلاحيات الحساب.",
      );
    update({ profile: profile as Profile });
    if (profile.role === "teacher") await readStudents(version);
    else {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id,name,teacher_id")
        .eq("id", user.id)
        .single();
      if (version !== accountVersion) return;
      if (studentError || !student)
        throw new Error(
          "هذا الحساب غير مرتبط بتلميذ. اطلب رمز دخولك من المدرّب.",
        );
      update({
        studentId: student.id as string,
        childName: student.name as string,
      });
      await readStudentProgress(version, true);
    }
    if (version !== accountVersion) return;
    update({ loading: false });
    attachRealtime(version);
  } catch (error) {
    if (version === accountVersion)
      update({
        loading: false,
        connection: "offline",
        error:
          error instanceof Error ? error.message : "تعذّر الاتصال بالبرنامج.",
      });
  }
}

/** Idempotent initialization; never await Supabase APIs from inside onAuthStateChange's lock. */
export function initializeProgress() {
  if (started || !supabase) return;
  started = true;
  const client = supabase;
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      void loadAccount(session?.user ?? null);
    }, 0);
  });
  void client.auth.getSession().then(({ data, error }) => {
    if (error)
      update({
        loading: false,
        connection: "offline",
        error: "انتهت جلسة الدخول. سجّل الدخول مجددًا.",
      });
    else void loadAccount(data.session?.user ?? null);
  });
  const refresh = () => {
    if (state.profile)
      void (
        state.profile.role === "teacher"
          ? readStudents()
          : readStudentProgress()
      ).catch(() => update({ connection: "offline" }));
  };
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
}

export async function loginTeacher(email: string, password: string) {
  if (!supabase)
    throw new Error("هذا وضع تجريبي للعرض فقط. فعّل Supabase لتسجيل الدخول.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error)
    throw new Error(
      "تعذّر الدخول. تحقّق من البريد وكلمة المرور واتصالك بالإنترنت.",
    );
  await loadAccount(data.user);
}
export async function loginStudent(code: string) {
  if (!supabase)
    throw new Error("هذا وضع تجريبي للعرض فقط. فعّل Supabase لتسجيل الدخول.");
  const normalized = code.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(normalized))
    throw new Error("أدخل الرمز المكوّن من عشرة أحرف وأرقام كما أعطاك المدرّب.");
  const { data, error } = await supabase.functions.invoke("journey-auth", {
    body: { action: "login", code: normalized },
  });
  if (error || !data?.access_token || !data?.refresh_token)
    throw new Error(
      "تعذّر الدخول بهذا الرمز. تحقّق منه أو انتظر قليلًا ثم حاول مجددًا.",
    );
  const result = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (result.error) throw new Error("تعذّر إنشاء جلسة آمنة. حاول مجددًا.");
  await loadAccount(result.data.user);
}
export async function logout() {
  if (!supabase) return;
  // Local scope removes this tab's tokens without invalidating the child's other devices.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("تعذّر تسجيل الخروج. حاول مجددًا.");
  activeUserId = null;
  await loadAccount(null);
}
export function selectStudent(id: string) {
  if (state.profile?.role !== "teacher") return;
  const student = state.students.find((s) => s.id === id);
  if (student)
    update({
      studentId: id,
      childName: student.name,
      completed: student.completed,
      pendingUnlock: null,
      pendingCelebration: null,
    });
}

async function mutateProgress(
  action: "approve_next_session" | "undo_last_session",
  id: string,
  expectedCount: number,
) {
  const student = state.students.find(
    (s) => s.id === id && s.teacher_id === state.profile?.id,
  );
  if (!supabase || state.profile?.role !== "teacher" || !student)
    throw new Error("الاعتماد متاح للمدرّب صاحب التلميذ فقط.");
  if (mutationBusy) throw new Error("يوجد اعتماد قيد التنفيذ. انتظر قليلًا.");
  if (student.completed !== expectedCount)
    throw new Error("تغيّر التقدّم أثناء التأكيد. راجعه ثم أكّد من جديد.");
  mutationBusy = true;
  const version = accountVersion;
  try {
    // There are no client-side UPDATEs. The database re-checks ownership and advances exactly one step.
    const { data, error } = await supabase.rpc(action, { student_id: id });
    if (error)
      throw new Error(
        "لم يتم الاعتماد. تحقّق من الاتصال والصلاحيات ثم حدّث التقدّم قبل المحاولة مجددًا.",
      );
    if (version !== accountVersion) return;
    const row: unknown = Array.isArray(data) ? data[0] : data;
    if (isProgressRow(row)) {
      if (row.student_id === state.studentId) applyProgress(row);
      else
        update({
          students: state.students.map((s) =>
            s.id === id
              ? {
                  ...s,
                  completed: row.completed_count,
                  updated_at: row.updated_at,
                }
              : s,
          ),
        });
    } else await readStudents(version);
  } finally {
    mutationBusy = false;
  }
}
export function approveNext(id: string, expectedCount: number) {
  return mutateProgress("approve_next_session", id, expectedCount);
}
export function undoLast(id: string, expectedCount: number) {
  return mutateProgress("undo_last_session", id, expectedCount);
}
export async function addStudent(
  name: string,
): Promise<{ login_code: string; student_id: string }> {
  if (!supabase || state.profile?.role !== "teacher")
    throw new Error("إضافة التلاميذ متاحة للمدرّب فقط.");
  const clean = name.trim();
  if (!clean || clean.length > 60)
    throw new Error("أدخل اسمًا من حرف واحد إلى ستين حرفًا.");
  const { data, error } = await supabase.functions.invoke("journey-auth", {
    body: { action: "create-student", name: clean },
  });
  if (
    error ||
    typeof data?.login_code !== "string" ||
    typeof data?.student_id !== "string"
  )
    throw new Error("تعذّرت إضافة التلميذ. تحقّق من الاتصال وصلاحياتك.");
  await readStudents();
  selectStudent(data.student_id);
  return data as { login_code: string; student_id: string };
}
export async function refreshProgress() {
  if (state.profile?.role === "teacher") await readStudents();
  else await readStudentProgress();
}
export function clearPendingUnlock() {
  if (state.pendingUnlock !== null) update({ pendingUnlock: null });
}
export function clearPendingCelebration() {
  if (state.pendingCelebration !== null) update({ pendingCelebration: null });
}
