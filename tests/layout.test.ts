import { describe, expect, it } from "vitest";
import titles from "./fixtures/session-titles.json";
import { SESSIONS, MILESTONES } from "../src/data/sessions";
import {
  computeLayout,
  currentCardRect,
  guideRect,
  intersects,
  labelRect,
  reservedRects,
  samiRect,
  sisterRect,
  sisterSpeechRect,
  type Rect,
} from "../src/lib/mapLayout";
import { buildScenery } from "../src/components/Scenery";
import { currentSessionId, statusOf } from "../src/lib/progress";

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [820, 1180],
  [390, 844],
];
const states = [0, 7, 16, 20, 32];

describe("unchanged curriculum and teacher-only sequencing", () => {
  it("preserves every original title, ID, level and order", () => {
    expect(
      SESSIONS.map(({ id, level, title }) => ({ id, level, title })),
    ).toEqual(titles);
  });
  it("has 32 unique SVG icon IDs and unique lesson-specific objectives, activities and challenges", () => {
    expect(SESSIONS).toHaveLength(32);
    for (const field of ["icon", "goal", "activity", "challenge"] as const)
      expect(new Set(SESSIONS.map((s) => s[field])).size).toBe(32);
    expect(MILESTONES.map((m) => m.afterSession)).toEqual([16, 32]);
  });
  for (const count of states)
    it(`only the next sequential session is open at ${count}`, () => {
      expect(
        SESSIONS.filter((s) => statusOf(s.id, count) === "current").map(
          (s) => s.id,
        ),
      ).toEqual(count < 32 ? [count + 1] : []);
      expect(
        SESSIONS.filter((s) => statusOf(s.id, count) === "completed"),
      ).toHaveLength(count);
      expect(statusOf(0, count)).toBe("locked");
      expect(statusOf(33, count)).toBe("locked");
    });
});

for (const [w, h] of viewports)
  describe(`horizontal layout ${w}×${h}`, () => {
    const L = computeLayout(
      w,
      h - (w < 640 ? 218 : w < 901 ? 220 : w >= 1700 ? 214 : 198),
    );
    it("has monotone right-to-left cubic segments, two awards, internal endpoints and correct spacing", () => {
      expect(L.W).toBeGreaterThan(w);
      expect(L.nodes.filter((n) => n.kind === "station")).toHaveLength(32);
      expect(L.nodes.filter((n) => n.kind === "milestone")).toHaveLength(2);
      expect(L.start.x).toBeLessThan(L.W - 40);
      expect(L.end.x).toBeGreaterThan(40);
      for (const s of L.segs) {
        expect(s.a.x).toBeGreaterThan(s.c1.x);
        expect(s.c1.x).toBeGreaterThan(s.c2.x);
        expect(s.c2.x).toBeGreaterThan(s.b.x);
      }
      const station = L.nodes.filter((n) => n.kind === "station");
      for (let i = 1; i < station.length; i++)
        if (station[i].id !== 17)
          expect(station[i - 1].x - station[i].x).toBe(L.spacing);
      expect(L.spacing).toBeGreaterThanOrEqual(w < 640 ? 130 : 180);
      expect(L.spacing).toBeLessThanOrEqual(w < 640 ? 150 : 220);
      // Tangent continuity, not a polyline disguised as a curve.
      for (let i = 1; i < L.segs.length; i++) {
        const a = L.segs[i - 1],
          b = L.segs[i];
        expect((a.b.y - a.c2.y) / (a.b.x - a.c2.x)).toBeCloseTo(
          (b.c1.y - b.a.y) / (b.c1.x - b.a.x),
          8,
        );
      }
    });
    for (const count of states)
      it(`no road/label/card/character/scenery collisions at ${count} completed`, () => {
        const id = currentSessionId(count),
          current = L.nodes.find((n) => n.kind === "station" && n.id === id);
        const labels = L.nodes
          .filter((n) => n.kind === "milestone" || n.id !== id)
          .map((n) => ({
            ...labelRect(n, L),
            name: `label-${n.level}-${n.id}`,
          }));
        for (const label of labels) {
          for (const p of L.samples)
            expect(
              intersects(label, {
                x: p.x - L.roadW / 2,
                y: p.y - L.roadW / 2,
                w: L.roadW,
                h: L.roadW,
              }),
              label.name,
            ).toBe(false);
          expect(label.y).toBeGreaterThan(65);
          expect(label.y + label.h).toBeLessThan(L.H - 8);
        }
        const characters: Rect[] = [
          sisterRect(L),
          ...L.nodes
            .filter((n) => n.kind === "milestone")
            .map((n) => samiRect(n, L)),
          ...(current ? [guideRect(current, L)] : []),
        ];
        const fore = [
          ...labels,
          ...characters,
          sisterSpeechRect(L),
          ...(current ? [currentCardRect(current, L)] : []),
          ...L.signs,
        ];
        for (let i = 0; i < fore.length; i++)
          for (let j = i + 1; j < fore.length; j++)
            expect(intersects(fore[i], fore[j]), `foreground ${i}/${j}`).toBe(
              false,
            );
        for (const c of characters)
          for (const p of L.samples)
            expect(
              intersects(c, {
                x: p.x - L.roadW / 2,
                y: p.y - L.roadW / 2,
                w: L.roadW,
                h: L.roadW,
              }),
              "character must not touch road",
            ).toBe(false);
        const reserved = reservedRects(L, id),
          S = buildScenery(L, reserved);
        expect(S.decos.length).toBeGreaterThan(90);
        expect(S.decos.some((d) => d.t === "tree")).toBe(true);
        for (const d of S.decos)
          for (const box of reserved)
            expect(intersects(d.bounds, box, 8), `scenery ${d.t}`).toBe(false);
        for (let i = 0; i < S.decos.length; i++)
          for (let j = i + 1; j < S.decos.length; j++)
            expect(
              intersects(S.decos[i].bounds, S.decos[j].bounds, 6),
              "scenery/scenery",
            ).toBe(false);
      });
  });
