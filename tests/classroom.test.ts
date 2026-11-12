import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextRotation, randomIndex, sectorPath } from "../src/lib/speakerWheel";

describe("optional local names, not accounts", () => {
  let memory: Map<string, string>;
  let storage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    vi.resetModules();
    memory = new Map();
    storage = {
      getItem: vi.fn((key: string) => memory.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        memory.set(key, value);
      }),
    };
    vi.stubGlobal("window", { localStorage: storage });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("does not require any names to use the classroom", async () => {
    const c = await import("../src/lib/classroom");
    c.initializeClassroom();
    expect(c.getClassroom()).toMatchObject({
      names: [],
      spoken: [],
      lastSpeaker: null,
      noRepeat: true,
    });
  });
  it("accepts Arabic/Latin names, lines and commas, removing blanks and duplicates", async () => {
    const { parseNames } = await import("../src/lib/classroom");
    expect(
      parseNames("  ليان  أحمد \n\n سامي، ليان أحمد, Sara; sara\r\nيوسف"),
    ).toEqual(["ليان أحمد", "سامي", "Sara", "يوسف"]);
  });
  it("bounds names and their lengths, without splitting Unicode code points", async () => {
    const { parseNames, MAX_NAME_LENGTH, MAX_STUDENTS } =
      await import("../src/lib/classroom");
    expect(
      parseNames(Array.from({ length: 90 }, (_, i) => `اسم ${i}`).join("\n")),
    ).toHaveLength(MAX_STUDENTS);
    const [long] = parseNames("🙂".repeat(100));
    expect(Array.from(long)).toHaveLength(MAX_NAME_LENGTH);
    expect(long.includes("\ufffd")).toBe(false);
  });
  it("normalizes whitespace and removes bidirectional/control overrides", async () => {
    const { parseNames } = await import("../src/lib/classroom");
    expect(parseNames("سامي\u202e\u0000  أحمد\n  نور   علي ")).toEqual([
      "سامي أحمد",
      "نور علي",
    ]);
  });
  it.each([
    null,
    "corrupt",
    "[]",
    '{"version":2,"names":["سامي"]}',
    '{"version":1,"names":true}',
  ])("recovers from invalid saved names %s", async (raw) => {
    const { readClassroom } = await import("../src/lib/classroom");
    expect(readClassroom(raw).names).toEqual([]);
  });
  it("ignores corrupt spoken/last-speaker entries outside the actual list", async () => {
    const { readClassroom } = await import("../src/lib/classroom");
    expect(
      readClassroom(
        JSON.stringify({
          version: 1,
          names: ["سامي", 4, "نور"],
          spoken: ["نور", "missing"],
          lastSpeaker: "missing",
        }),
      ),
    ).toMatchObject({
      names: ["سامي", "نور"],
      spoken: ["نور"],
      lastSpeaker: null,
    });
  });
  it("saves only text names and local round settings, surviving reload", async () => {
    let c = await import("../src/lib/classroom");
    c.initializeClassroom();
    c.saveNames("سامي\nنور");
    c.recordSpeaker("نور");
    vi.resetModules();
    c = await import("../src/lib/classroom");
    c.initializeClassroom();
    expect(c.getClassroom()).toMatchObject({
      names: ["سامي", "نور"],
      spoken: ["نور"],
      lastSpeaker: "نور",
    });
    const record = JSON.parse(memory.get(c.CLASSROOM_STORAGE_KEY)!);
    for (const field of ["password", "code", "token", "role", "completed"])
      expect(record).not.toHaveProperty(field);
  });
  it("gives every name one turn before exhausting a round", async () => {
    const c = await import("../src/lib/classroom");
    c.initializeClassroom();
    c.saveNames("سامي\nنور\nليان");
    for (const name of ["نور", "سامي", "ليان"]) {
      expect(c.recordSpeaker(name)).toBe(true);
      expect(c.recordSpeaker(name)).toBe(false);
    }
    expect(c.eligibleNames(c.getClassroom())).toEqual([]);
    expect(c.recordSpeaker("unknown")).toBe(false);
    c.resetRound();
    expect(c.eligibleNames(c.getClassroom())).toHaveLength(3);
    expect(c.getClassroom().lastSpeaker).toBeNull();
  });
  it("allows repeats only when requested", async () => {
    const c = await import("../src/lib/classroom");
    c.initializeClassroom();
    c.saveNames("سامي\nنور");
    c.setNoRepeat(false);
    expect(c.recordSpeaker("نور")).toBe(true);
    expect(c.recordSpeaker("نور")).toBe(true);
    expect(c.eligibleNames(c.getClassroom())).toHaveLength(2);
    c.setNoRepeat(true);
    expect(c.getClassroom().spoken).toEqual([]);
  });
  it("edits/removes names without touching journey progress; identical saves preserve a round", async () => {
    const c = await import("../src/lib/classroom");
    memory.set("voies.classroom-progress.v1", "progress stays here");
    c.initializeClassroom();
    c.saveNames("سامي\nنور");
    c.recordSpeaker("نور");
    c.saveNames("سامي\nنور\n");
    expect(c.getClassroom().spoken).toEqual(["نور"]);
    c.saveNames("ليان");
    expect(c.getClassroom()).toMatchObject({
      names: ["ليان"],
      spoken: [],
      lastSpeaker: null,
    });
    c.saveNames("");
    expect(c.getClassroom().names).toEqual([]);
    expect(memory.get("voies.classroom-progress.v1")).toBe(
      "progress stays here",
    );
  });
  it("remains usable in memory if localStorage is blocked", async () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const c = await import("../src/lib/classroom");
    c.initializeClassroom();
    c.saveNames("سامي");
    expect(c.getClassroom()).toMatchObject({
      storageAvailable: false,
      names: ["سامي"],
    });
    expect(c.recordSpeaker("سامي")).toBe(true);
  });
});

describe("fair random selection and matching visual pointer", () => {
  it("rejects the biased upper tail before mapping a random integer to a name", () => {
    const next = vi.fn().mockReturnValueOnce(0xffffffff).mockReturnValueOnce(8);
    expect(randomIndex(3, next)).toBe(2);
    expect(next).toHaveBeenCalledTimes(2);
  });
  it("each accepted residue has an equal chance and singleton lists work", () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let n = 0; n < 600; n++) counts[randomIndex(6, () => n)]++;
    expect(counts).toEqual([100, 100, 100, 100, 100, 100]);
    expect(randomIndex(1, () => 0xffffffff)).toBe(0);
  });
  it.each([0, -1, 2.5, Infinity, 0x100000000])(
    "rejects invalid list size %s",
    (size) => {
      expect(() => randomIndex(size)).toThrow(RangeError);
    },
  );
  it("rejects invalid random samples rather than choosing a wrong index", () => {
    expect(() => randomIndex(4, () => NaN)).toThrow(RangeError);
  });
  it("uses the browser crypto source by default", () => {
    const getRandomValues = vi.fn((array: Uint32Array) => {
      array[0] = 7;
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    expect(randomIndex(6)).toBe(1);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  for (const count of [1, 2, 6, 19, 60])
    it(`lands all ${count} names exactly beneath the pointer after five turns`, () => {
      let previous = 1234.5;
      for (let index = 0; index < count; index++) {
        const end = nextRotation(previous, index, count);
        expect(end - previous).toBeGreaterThanOrEqual(1800);
        expect(end - previous).toBeLessThan(2160);
        const offset = (end + ((index + 0.5) * 360) / count) % 360;
        expect(Math.min(offset, 360 - offset)).toBeCloseTo(0, 8);
        expect(sectorPath(index, count)).not.toMatch(/NaN|Infinity/);
        previous = end;
      }
    });
  it("rejects impossible wheel positions", () => {
    expect(() => nextRotation(0, -1, 6)).toThrow();
    expect(() => nextRotation(0, 6, 6)).toThrow();
    expect(() => nextRotation(NaN, 0, 6)).toThrow();
  });
});
