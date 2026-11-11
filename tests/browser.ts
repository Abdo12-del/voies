import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import path from "node:path";
import bundled from "@sparticuz/chromium";

/** The sandbox cannot download from Chrome's CDN. The npm-distributed browser is reproducible here and in CI. */
export async function browserOptions() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
    return { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH };
  if (process.platform !== "linux" || process.arch !== "x64") return {};
  const root = path.resolve("artifacts/browser-libs");
  mkdirSync(root, { recursive: true });
  const tar = path.join(root, "al2023.tar");
  writeFileSync(
    tar,
    brotliDecompressSync(
      readFileSync(
        path.resolve("node_modules/@sparticuz/chromium/bin/al2023.tar.br"),
      ),
    ),
  );
  execFileSync("tar", ["-xf", tar, "-C", root]);
  return {
    executablePath: await bundled.executablePath(),
    args: bundled.args.filter(
      (a) =>
        !a.includes("disable-web-security") &&
        !a.includes("allow-running-insecure-content") &&
        !a.includes("disable-site-isolation-trials") &&
        a !== "--single-process",
    ),
    env: {
      ...process.env,
      LD_LIBRARY_PATH: `${path.join(root, "lib")}:${process.env.LD_LIBRARY_PATH ?? ""}`,
    },
  };
}
