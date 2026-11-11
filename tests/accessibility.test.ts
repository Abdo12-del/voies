import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css =
  readFileSync(new URL("../src/styles.css", import.meta.url), "utf8") +
  readFileSync(new URL("../src/map.css", import.meta.url), "utf8");
function color(selector: string, property = "color") {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = [
    ...css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]+)\\}`, "g")),
  ];
  const value = blocks
    .map(
      (b) =>
        b[1].match(
          new RegExp(`(?:^|[;\\s])${property}:\\s*(#[a-f0-9]{6})\\s*;`),
        )?.[1],
    )
    .filter(Boolean)
    .at(-1);
  if (!value) throw new Error(`Missing ${selector}: ${property}`);
  return value;
}
function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
function readable(selector: string, background: string) {
  expect(
    contrast(color(selector), background),
    `${selector} on ${background}`,
  ).toBeGreaterThanOrEqual(4.5);
}

describe("visual invariants independent of axe's visibility heuristics", () => {
  it("keeps locked/completed titles legible in both worlds and numbered platforms", () => {
    for (const background of ["#bcd6b2", "#c2dda4", "#e4cf97"]) {
      readable(".station-label", background);
    }
    for (const background of ["#c2dda4", "#e4cf97"])
      readable(".station-label.is-completed", background);
    readable(".station-number", color(".station-number", "background"));
    readable(
      ".is-current .station-number",
      color(".is-current .station-number", "background"),
    );
    readable(
      ".is-completed .station-number",
      color(".is-completed .station-number", "background"),
    );
  });
  it("has 4.5:1 text contrast on reserved cards, speech and the darkest wooden sign", () => {
    readable(".current-card h2", "#fffdf0");
    readable(".current-card-kicker", "#fffdf0");
    readable(".current-card-kicker > bdi", "#fffdf0");
    readable(".speech", "#fff9e7");
    readable(".world-sign > span", "#e3c997");
    readable(".world-sign > div", "#e3c997");
    readable(".world-sign-2 h3", "#e3c997");
  });
  it("keeps small header, lesson and dialog text legible", () => {
    for (const selector of [
      ".brand-eyebrow",
      ".header-level > div > span",
      ".progress-caption > span",
      ".account-status",
      ".eyebrow",
      ".form-note",
      ".lesson-number",
      ".lesson-hero p",
      ".lesson-step-number",
    ])
      readable(selector, "#fffdf1");
    readable(".lesson-step p", "#fffdf1");
    readable(".lesson-approval-note", "#eef2df");
  });
  it("preserves all six original character assets byte for byte", () => {
    const hashes: Record<string, string> = {
      "laila-point.webp":
        "1c0b54bbf250c338d33fbdd34cf4fa145946b351c442fa221a43485abbbe1a12",
      "laila.webp":
        "9c87cdac7aaaf5c05d989c7ea77383e4ea168510d2b863eed3be64361bc96996",
      "sami-cheer.webp":
        "3ff5a5fbc5adbfbdf8aa609e6e6e346f2e7d38d52f7dc18cb693b61efcaaeb9b",
      "sami.webp":
        "6299be2ba6b02505f4cf612bafa0b8edb722fe2b72f74affed8cac00d588ebe6",
      "sister-wave.webp":
        "8c70aa3e86c5006ebaefb7a9f430a1081826d3b41f4b28e5f7bccd82f7d02518",
      "sister.webp":
        "26b652f7324e3b51ab8c443910a2b4735c7eba9ddba86e7edc582b619dd79544",
    };
    for (const [file, hash] of Object.entries(hashes)) {
      expect(
        createHash("sha256")
          .update(
            readFileSync(
              new URL(`../public/characters/${file}`, import.meta.url),
            ),
          )
          .digest("hex"),
      ).toBe(hash);
    }
  });
});
