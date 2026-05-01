import { spawn, ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, Browser, Page } from "playwright";

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: "iphone-13", width: 390, height: 844 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "ipad-mini", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
];

const SCREENSHOTS_DIR = "screenshots";
const DEV_PORT = 5179;
const READY_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2500;

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Dev server did not become ready at ${url}`);
}

async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const tag = (process.argv[2] ?? "ui").replace(/[^a-z0-9-_]/gi, "-");
  const ts = timestamp();

  console.log("Starting dev server...");
  const dev: ChildProcess = spawn("npx", ["vite", "--port", String(DEV_PORT), "--host", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  dev.stdout?.on("data", () => undefined);
  dev.stderr?.on("data", () => undefined);

  let browser: Browser | undefined;
  try {
    await waitForServer(`http://127.0.0.1:${DEV_PORT}/`);
    console.log("Dev server ready. Launching Chromium...");
    browser = await chromium.launch();

    const summary: { viewport: string; file: string; size: { w: number; h: number } }[] = [];
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        isMobile: vp.name !== "desktop" && vp.width < 800,
        hasTouch: true,
      });
      const page: Page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${DEV_PORT}/`);
      await page.waitForSelector("canvas", { state: "visible" });
      await page.waitForTimeout(SETTLE_MS);
      const file = join(SCREENSHOTS_DIR, `${ts}-${tag}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      summary.push({ viewport: vp.name, file, size: { w: vp.width, h: vp.height } });
      await ctx.close();
    }

    const indexFile = join(SCREENSHOTS_DIR, "INDEX.md");
    let existing = "";
    try {
      const fs = await import("node:fs");
      existing = fs.readFileSync(indexFile, "utf-8");
    } catch {
      existing = "# Screenshot Log\n\nVisual record of UI changes over time. Newest first.\n\n";
    }
    const header = `## ${ts} — ${tag}\n\n`;
    const rows = summary
      .map((s) => {
        const rel = s.file.replace(/\\/g, "/").replace(/^screenshots\//, "");
        return `- **${s.viewport}** (${s.size.w}×${s.size.h}): ![${s.viewport}](${rel})`;
      })
      .join("\n");
    const block = header + rows + "\n\n";
    const newIndex = existing.startsWith("# Screenshot Log")
      ? existing.replace("# Screenshot Log\n\nVisual record of UI changes over time. Newest first.\n\n", `# Screenshot Log\n\nVisual record of UI changes over time. Newest first.\n\n${block}`)
      : `# Screenshot Log\n\nVisual record of UI changes over time. Newest first.\n\n${block}${existing}`;
    writeFileSync(indexFile, newIndex);

    console.log("");
    console.log(`Captured ${summary.length} screenshots:`);
    for (const s of summary) console.log(`  ${s.viewport.padEnd(12)} ${s.file}`);
    console.log(`Updated ${indexFile}`);
  } finally {
    if (browser) await browser.close();
    dev.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 250));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
