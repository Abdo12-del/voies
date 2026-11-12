import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("account-free classroom progress", () => {
  let memory: Map<string, string>;
  let storage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  let onStorage: (event: {
    key: string | null;
    newValue: string | null;
  }) => void;
  beforeEach(() => {
    vi.resetModules();
    memory = new Map();
    storage = {
      getItem: vi.fn((key: string) => memory.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        memory.set(key, value);
      }),
    };
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: vi.fn((name: string, listener) => {
        if (name === "storage") onStorage = listener;
      }),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("starts at lesson one, with no login, role, user or remote client", async () => {
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    expect(p.getState()).toEqual({
      completed: 0,
      pendingUnlock: null,
      pendingCelebration: null,
      storageAvailable: true,
    });
    expect(p.statusOf(1, 0)).toBe("current");
    expect(p.statusOf(2, 0)).toBe("locked");
    for (const field of ["mode", "profile", "studentId", "loading"])
      expect(p.getState()).not.toHaveProperty(field);
  });
  it("reads the new local classroom record once and ignores legacy individual progress", async () => {
    const p = await import("../src/lib/progress");
    memory.set(
      p.PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, completed: 7 }),
    );
    memory.set(
      "almutahadith.progress.v1",
      JSON.stringify({ completed: 32, pinHash: "old" }),
    );
    p.initializeProgress();
    p.initializeProgress();
    expect(p.getState().completed).toBe(7);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });
  it.each([
    "broken",
    "null",
    "[]",
    '{"version":2,"completed":7}',
    '{"version":1,"completed":33}',
    '{"version":1,"completed":-1}',
    '{"version":1,"completed":1.5}',
    '{"version":1,"completed":"8"}',
  ])("ignores malformed saved progress: %s", async (raw) => {
    const { readProgress } = await import("../src/lib/progress");
    expect(readProgress(raw).completed).toBe(0);
  });
  it("finishes exactly one lesson, ignores stale/double clicks, and saves the count", async () => {
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    expect(p.approveNext(0)).toBe(true);
    expect(p.approveNext(0)).toBe(false);
    expect(p.approveNext(7)).toBe(false);
    expect(p.getState()).toMatchObject({ completed: 1, pendingUnlock: 2 });
    expect(JSON.parse(memory.get(p.PROGRESS_STORAGE_KEY)!)).toMatchObject({
      version: 1,
      completed: 1,
    });
  });
  it("persists across reinitialization without persisting a transient unlock animation", async () => {
    let p = await import("../src/lib/progress");
    p.initializeProgress();
    p.approveNext(0);
    vi.resetModules();
    p = await import("../src/lib/progress");
    p.initializeProgress();
    expect(p.getState()).toMatchObject({ completed: 1, pendingUnlock: null });
  });
  it("undoes one step only and never goes below zero", async () => {
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    expect(p.undoLast(0)).toBe(false);
    p.approveNext(0);
    p.approveNext(1);
    expect(p.undoLast(2)).toBe(true);
    expect(p.undoLast(2)).toBe(false);
    expect(p.getState()).toMatchObject({
      completed: 1,
      pendingUnlock: null,
      pendingCelebration: null,
    });
  });
  it("celebrates only the two milestones; dismissal survives reload", async () => {
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    for (let count = 0; count < 32; count++) {
      expect(p.approveNext(count)).toBe(true);
      expect(p.getState().pendingCelebration).toBe(
        count === 15 ? 1 : count === 31 ? 2 : null,
      );
      if (count === 15) {
        p.clearPendingCelebration();
        expect(
          p.readProgress(memory.get(p.PROGRESS_STORAGE_KEY)!)
            .pendingCelebration,
        ).toBeNull();
      }
    }
    expect(p.getState().completed).toBe(32);
    expect(p.getState().pendingUnlock).toBeNull();
    expect(p.approveNext(32)).toBe(false);
  });
  it("validates persisted celebration boundaries", async () => {
    const { readProgress } = await import("../src/lib/progress");
    for (const [completed, pendingCelebration, expected] of [
      [7, 1, null],
      [16, 1, 1],
      [20, 2, null],
      [32, 1, null],
      [32, 2, 2],
    ])
      expect(
        readProgress(
          JSON.stringify({ version: 1, completed, pendingCelebration }),
        ).pendingCelebration,
      ).toBe(expected);
  });
  it("a fresh journey preserves the optional names list", async () => {
    const p = await import("../src/lib/progress");
    memory.set("voies.classroom-names.v1", "names stay here");
    p.initializeProgress();
    p.approveNext(0);
    p.resetProgress();
    expect(p.getState().completed).toBe(0);
    expect(memory.get("voies.classroom-names.v1")).toBe("names stay here");
  });
  it("still works in memory when browser storage is unavailable", async () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    expect(p.getState().storageAvailable).toBe(false);
    expect(p.approveNext(0)).toBe(true);
    expect(p.getState()).toMatchObject({
      completed: 1,
      storageAvailable: false,
    });
  });
  it("updates other tabs in the same browser and notifies subscribers", async () => {
    const p = await import("../src/lib/progress");
    p.initializeProgress();
    const listener = vi.fn();
    const stop = p.subscribe(listener);
    onStorage({
      key: p.PROGRESS_STORAGE_KEY,
      newValue: JSON.stringify({ version: 1, completed: 7 }),
    });
    expect(p.getState().completed).toBe(7);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    onStorage({ key: null, newValue: null });
    expect(p.getState().completed).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
