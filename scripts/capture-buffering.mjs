import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const BASE = "http://localhost:8081";
const OUT = path.resolve(process.cwd(), ".validation", "responsive");

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const PREFS = {
  setupComplete: true,
  homeGuideDismissed: true,
  onboardingVersion: 4,
  spokenGuidanceEnabled: false,
  town: "London, UK",
  interests: ["local", "technology"],
  savedIds: ["daily", "arts", "tech", "london"],
  followingIds: ["culture-weekly", "signal-noise", "hear-daily", "london-radio"],
  downloadedIds: ["daily", "london"],
  voiceDiagnosticsEnabled: false,
  voiceConsentVersion: 1,
};

const seed = {
  "hear-preferences": JSON.stringify({ state: PREFS, version: 5 }),
};

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const viewport of VIEWPORTS) {
    const dir = path.join(OUT, viewport.name);
    fs.mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
      reducedMotion: "reduce",
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error).slice(0, 200)));
    try {
      await page.addInitScript((items) => {
        Object.entries(items).forEach(([key, value]) => {
          try { localStorage.setItem(key, value); } catch {}
        });
      }, seed);
      await page.goto(`${BASE}/explore`, { waitUntil: "load", timeout: 90000 });
      await page.evaluate((items) => {
        Object.entries(items).forEach(([key, value]) => {
          try { localStorage.setItem(key, value); } catch {}
        });
      }, seed);
      try {
        await page.waitForSelector('[aria-label="Starting Hear!"]', { state: "attached", timeout: 20000 });
        await page.waitForSelector('[aria-label="Starting Hear!"]', { state: "detached", timeout: 30000 });
      } catch {
        await page.waitForTimeout(5000);
      }
      await page.waitForTimeout(1000);
      const play = page.getByRole("button", { name: "Inside the city's new arts space", exact: true });
      await play.first().click({ timeout: 10000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(dir, "17-player-buffering.png") });
      console.log(`OK  ${viewport.name}  17-player-buffering`);
    } catch (error) {
      console.log(`FAIL ${viewport.name}  17-player-buffering: ${String(error).slice(0, 160)}`);
      try { await page.screenshot({ path: path.join(dir, "17-player-buffering.FAIL.png") }); } catch {}
    } finally {
      await context.close();
    }
  }
  await browser.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
