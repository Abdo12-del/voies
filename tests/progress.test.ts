import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Coalescing Auth events is important: INITIAL_SESSION, getSession and SIGNED_IN
// can all report one user before the first profile request has completed.
describe("cloud account initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("document", { addEventListener: vi.fn(), hidden: false });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/lib/supabase");
  });

  it("shares simultaneous Auth loads and subscribes exactly once", async () => {
    const id = "20000000-0000-4000-8000-000000000001";
    const user = { id };
    let authChanged:
      | ((event: string, session: { user: typeof user } | null) => void)
      | undefined;
    let release!: (value: unknown) => void;
    const profile = new Promise((resolve) => {
      release = resolve;
    });
    const reads: string[] = [];
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const client = {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          authChanged = callback;
        }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { user } }, error: null }),
      },
      from: vi.fn((table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => {
              reads.push(table);
              if (table === "profiles") return profile;
              if (table === "students")
                return Promise.resolve({
                  data: { id, name: "ليان", teacher_id: "teacher" },
                  error: null,
                });
              return Promise.resolve({
                data: {
                  student_id: id,
                  completed_count: 7,
                  updated_at: "2026-11-11T12:00:00Z",
                  approved_by: "teacher",
                },
                error: null,
              });
            },
          }),
        }),
      })),
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
    };
    vi.doMock("../src/lib/supabase", () => ({
      supabase: client,
      supabaseConfigurationError: null,
    }));
    const { getState, initializeProgress } =
      await import("../src/lib/progress");
    initializeProgress();
    initializeProgress();
    await vi.waitFor(() => expect(reads).toEqual(["profiles"]));
    authChanged!("INITIAL_SESSION", { user });
    authChanged!("SIGNED_IN", { user });
    // Let the scheduled Auth callbacks run while the first profile read is pending.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(reads).toEqual(["profiles"]);
    release({ data: { id, name: "ليان", role: "student" }, error: null });
    await vi.waitFor(() => expect(getState().loading).toBe(false));
    expect(getState()).toMatchObject({
      completed: 7,
      studentId: id,
      childName: "ليان",
    });
    expect(reads).toEqual(["profiles", "students", "progress"]);
    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale profile response after sign-out", async () => {
    const user = { id: "20000000-0000-4000-8000-000000000001" };
    let authChanged!: (
      event: string,
      session: { user: typeof user } | null,
    ) => void;
    let release!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const client = {
      auth: {
        onAuthStateChange: vi.fn((callback) => {
          authChanged = callback;
        }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { user } }, error: null }),
      },
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ single: () => pending }) }),
      })),
      removeChannel: vi.fn(),
      channel: vi.fn(),
    };
    vi.doMock("../src/lib/supabase", () => ({
      supabase: client,
      supabaseConfigurationError: null,
    }));
    const { getState, initializeProgress } =
      await import("../src/lib/progress");
    initializeProgress();
    await vi.waitFor(() => expect(client.from).toHaveBeenCalledTimes(1));
    authChanged("SIGNED_OUT", null);
    await vi.waitFor(() => expect(getState().loading).toBe(false));
    release({
      data: { id: user.id, name: "ليان", role: "student" },
      error: null,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getState()).toMatchObject({
      completed: 0,
      profile: null,
      studentId: null,
    });
    expect(client.channel).not.toHaveBeenCalled();
  });

  it("has no writable demo progress or first-visitor teacher setup", async () => {
    vi.doMock("../src/lib/supabase", () => ({
      supabase: null,
      supabaseConfigurationError: null,
    }));
    const progress = await import("../src/lib/progress");
    expect(progress.getState()).toMatchObject({
      mode: "demo",
      completed: 0,
      profile: null,
    });
    await expect(progress.approveNext("student", 0)).rejects.toThrow();
    await expect(progress.undoLast("student", 1)).rejects.toThrow();
    await expect(progress.addStudent("سامي")).rejects.toThrow();
    await expect(
      progress.loginTeacher("teacher@example.com", "unused"),
    ).rejects.toThrow();
    expect(progress.getState().completed).toBe(0);
  });
});
