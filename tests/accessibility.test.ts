import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SceneryDefs } from "../src/components/Scenery";
import { computeLayout } from "../src/lib/mapLayout";

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
    for (const background of [
      "#7dba62",
      "#91ce70",
      "#97d56e",
      "#a3dc78",
      "#e8bf68",
      "#dbaf58",
    ]) {
      readable(".station-label", background);
      readable(".station-label.is-completed", background);
    }
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
    readable(".current-card h2", "#ffffff");
    readable(".current-card-kicker", "#ffffff");
    readable(".current-card-kicker > bdi", "#ffffff");
    readable(".speech", "#ffffff");
    for (const background of ["#fff1d8", "#ffe9b5"]) {
      readable(".world-sign > span", background);
      readable(".world-sign > div", background);
      readable(".world-sign-2 h3", background);
    }
    for (const background of ["#ffe680", "#ffbd1a"])
      readable(".btn-start", background);
  });
  it("keeps small header, lesson and dialog text legible", () => {
    for (const selector of [
      ".header-level strong",
      ".account-status",
      ".eyebrow",
      ".form-note",
      ".lesson-number",
      ".lesson-hero p",
      ".lesson-step-number",
    ])
      readable(selector, "#fffdf1");
    readable(".lesson-step p", "#ffffff");
    readable(".lesson-approval-note", "#fff4cf");
  });
  it("restores the original saturated meadow, filled grass, and gold/blue game platforms", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(
          "defs",
          null,
          createElement(SceneryDefs, { L: computeLayout(1440, 702) }),
        ),
      ),
    );
    const meadow = markup.match(
      /<linearGradient id="springGround"[^>]*>([\s\S]*?)<\/linearGradient>/,
    )?.[1];
    expect(meadow).toContain('stop-color="#97d56e"');
    expect(meadow).toContain('stop-color="#a3dc78"');
    const grass = markup.match(/<g id="d-tuft">([\s\S]*?)<\/g>/)?.[1];
    // Shapes and spring colors copied from the original ac224a3 artwork, not
    // a global saturation filter (which would also alter the characters).
    expect(grass?.match(/<path /g)).toHaveLength(3);
    for (const path of [
      "M-22 0 Q-24 -40 -6 -60 Q-12 -30 -8 0 Z",
      "M-6 0 Q-2 -60 10 -90 Q8 -40 10 0 Z",
      "M8 0 Q20 -40 34 -56 Q22 -26 22 0 Z",
    ])
      expect(grass).toContain(`d="${path}"`);
    for (const originalColor of ["#5db552", "#4ea846", "#62bd57"])
      expect(grass).toContain(originalColor);
    const current = css.match(
      /\n\.is-current \.station-face\s*\{([^}]+)\}/,
    )?.[1];
    const completed = css.match(
      /\n\.is-completed \.station-face\s*\{([^}]+)\}/,
    )?.[1];
    for (const gold of ["#ffeb8a", "#ffb300"]) expect(current).toContain(gold);
    for (const blue of ["#7cc8ff", "#2f8ae6"])
      expect(completed).toContain(blue);
    expect(css).not.toContain("saturate(0.8)");
  });
  it("keeps the full-screen landscape behind transparent floating HUD containers, never header/footer strips", () => {
    for (const selector of ["app-header", "game-bar"]) {
      const rule = css.match(
        new RegExp(`\\n\\.${selector}\\s*\\{([^}]+)\\}`),
      )?.[1];
      expect(rule, selector).toMatch(/position:\s*absolute;/);
      expect(rule, selector).toMatch(/background:\s*transparent;/);
      expect(rule, selector).toMatch(/border:\s*0;/);
      expect(rule, selector).toMatch(/box-shadow:\s*none;/);
      expect(rule, selector).toMatch(/pointer-events:\s*none;/);
    }
    expect(css).toMatch(
      /\.map-shell\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/,
    );
    expect(css).not.toContain("grid-template-rows: auto minmax(0, 1fr) auto");
    for (const sky of ["#ccecff", "#ffd2ae"]) {
      readable(".brand h1", sky);
      readable(".header-level strong", sky);
    }
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
