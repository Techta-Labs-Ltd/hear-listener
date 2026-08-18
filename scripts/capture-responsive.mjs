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

const basePrefs = {
  onboardingVersion: 4,
  spokenGuidanceEnabled: false,
  town: "",
  interests: [],
  savedIds: [],
  followingIds: [],
  downloadedIds: [],
  voiceDiagnosticsEnabled: false,
  voiceConsentVersion: 1,
};

const PREFS = {
  fresh: { ...basePrefs, setupComplete: false, homeGuideDismissed: false },
  homeGuide: { ...basePrefs, setupComplete: true, homeGuideDismissed: false },
  emptyLib: { ...basePrefs, setupComplete: true, homeGuideDismissed: true },
  returning: {
    ...basePrefs,
    setupComplete: true,
    homeGuideDismissed: true,
    town: "Lagos",
    interests: ["local", "technology"],
    savedIds: ["daily", "arts", "tech", "lagos"],
    followingIds: ["culture-weekly", "signal-noise", "hear-daily", "lagos-radio"],
    downloadedIds: ["daily", "lagos"],
  },
};

const VOICE_ON = { ...PREFS.returning, spokenGuidanceEnabled: true };

const PLAYBACK_STORIES = {
  "city-lab": {
    id: "city-lab",
    title: "A better way to move around Lagos",
    creator: "City Lab",
    publication: "Ideas",
    duration: "21 min",
    category: "Downloaded",
    color: "#8C4C9B",
    description: "New thinking about safer and more accessible city transport.",
    topicIds: ["local", "business"],
    downloaded: true,
  },
  lagos: {
    id: "lagos",
    title: "What changed in Lagos today",
    creator: "Lagos Community Radio",
    publication: "Local news",
    duration: "6 min",
    category: "New",
    color: "#21798A",
    description: "Markets, roads and neighbourhoods: the changes Lagos noticed today.",
    topicIds: ["local"],
  },
  arts: {
    id: "arts",
    title: "Inside the city's new arts space",
    creator: "Culture Weekly",
    publication: "Arts",
    duration: "12 min",
    category: "New",
    color: "#8C4C9B",
    description: "A tour of the studios and stages reshaping the city's creative quarter.",
    topicIds: ["culture"],
  },
};

const PLAYBACK = {
  playing: {
    current: PLAYBACK_STORIES["city-lab"],
    progress: 0.42,
    speed: 1,
    repeat: false,
    queue: [PLAYBACK_STORIES.lagos, PLAYBACK_STORIES.arts],
    sleepTimerEndsAt: null,
  },
};

const CAPTURES = [
  { name: "01-onboarding", path: "/onboarding", prefs: "fresh" },
  { name: "02-home-first-use", path: "/", prefs: "homeGuide" },
  { name: "03-home-returning", path: "/", prefs: "returning" },
  { name: "04-discover-online", path: "/explore", prefs: "returning" },
  { name: "05-discover-offline", path: "/explore", prefs: "returning", offline: true },
  { name: "06-search-results", path: "/search?q=technology podcasts", prefs: "returning" },
  { name: "07-topic-local-news", path: "/topic/local", prefs: "returning" },
  { name: "08-library-hub-filled", path: "/library", prefs: "returning" },
  { name: "09-library-hub-empty", path: "/library", prefs: "emptyLib" },
  { name: "10-library-saved-empty", path: "/library/saved", prefs: "emptyLib" },
  { name: "11-library-saved-filled", path: "/library/saved", prefs: "returning" },
  { name: "12-library-following", path: "/library/following", prefs: "returning" },
  { name: "13-library-downloads", path: "/library/downloads", prefs: "returning" },
  { name: "14-library-history", path: "/library/history", prefs: "returning" },
  { name: "15-player-empty", path: "/player", prefs: "homeGuide" },
  { name: "16-player-playing", path: "/player", prefs: "returning", playback: "playing" },
  { name: "17-player-buffering", path: "/explore", prefs: "returning", clickPlay: true },
  { name: "18-player-queue", path: "/player/queue", prefs: "returning", playback: "playing" },
  { name: "19-player-sleep-timer", path: "/player", prefs: "returning", playback: "playing", openSleepTimer: true },
  { name: "20-settings-hub", path: "/settings", prefs: "voiceOn" },
  { name: "21-settings-account", path: "/settings?section=account", prefs: "returning" },
  { name: "22-settings-voice", path: "/settings?section=voice", prefs: "voiceOn" },
  { name: "23-settings-playback", path: "/settings?section=playback", prefs: "returning" },
  { name: "24-settings-accessibility", path: "/settings?section=accessibility", prefs: "voiceOn" },
  { name: "25-settings-privacy", path: "/settings?section=privacy", prefs: "returning" },
];

function seedEntries(capture) {
  const entries = {
    "hear-preferences": JSON.stringify({ state: capture.prefs === "voiceOn" ? VOICE_ON : PREFS[capture.prefs], version: 5 }),
  };
  if (capture.playback) {
    entries["hear-playback"] = JSON.stringify({ state: PLAYBACK[capture.playback], version: 2 });
  }
  return entries;
}

function seedScript(capture) {
  return Object.entries(seedEntries(capture))
    .map(([key, value]) => `{ try { localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)}); } catch {} }`)
    .join("\n");
}

async function ensureSeeded(page, capture) {
  const entries = seedEntries(capture);
  const missing = await page.evaluate((seed) => {
    const keys = Object.keys(seed);
    return keys.filter((key) => !localStorage.getItem(key));
  }, entries);
  if (missing.length) {
    await page.evaluate((seed) => {
      Object.entries(seed).forEach(([key, value]) => localStorage.setItem(key, value));
    }, entries);
    await page.reload({ waitUntil: "load", timeout: 90000 });
  }
}

async function waitForApp(page) {
  try {
    await page.waitForSelector('[aria-label="Starting Hear!"]', { state: "attached", timeout: 20000 });
    await page.waitForSelector('[aria-label="Starting Hear!"]', { state: "detached", timeout: 30000 });
  } catch {
    await page.waitForTimeout(5000);
  }
  await page.waitForTimeout(1000);
}

async function main() {
  const nameFilter = new Set(process.argv.slice(2));
  const captures = nameFilter.size ? CAPTURES.filter((c) => nameFilter.has(c.name)) : CAPTURES;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const report = [];

  for (const viewport of VIEWPORTS) {
    const dir = path.join(OUT, viewport.name);
    fs.mkdirSync(dir, { recursive: true });
    const consoleErrors = [];

    for (const capture of captures) {
      const outFile = path.join(dir, `${capture.name}.png`);
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "light",
        reducedMotion: "reduce",
        deviceScaleFactor: 2,
      });
      if (capture.offline) {
        await context.addInitScript(() => {
          Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
        });
      }
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
      });
      page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${String(error).slice(0, 300)}`));

      try {
        await page.addInitScript(seedScript(capture));
        await page.goto(`${BASE}${capture.path}`, { waitUntil: "load", timeout: 90000 });
        await ensureSeeded(page, capture);
        await waitForApp(page);
        if (capture.clickPlay) {
          const play = page.getByRole("button", { name: "Inside the city's new arts space", exact: true });
          await play.first().click({ timeout: 10000 });
          await page.waitForTimeout(800);
        } else if (capture.openSleepTimer) {
          const sleep = page.getByRole("button", { name: "Sleep timer", exact: true });
          await sleep.first().click({ timeout: 10000 });
          await page.waitForTimeout(800);
        } else {
          await page.waitForTimeout(800);
        }
        await page.screenshot({ path: outFile });
        report.push({ viewport: viewport.name, capture: capture.name, ok: true, errors: consoleErrors.length });
        console.log(`OK  ${viewport.name}  ${capture.name}`);
      } catch (error) {
        report.push({ viewport: viewport.name, capture: capture.name, ok: false, error: String(error).slice(0, 200) });
        console.log(`FAIL ${viewport.name}  ${capture.name}: ${String(error).slice(0, 160)}`);
        try {
          await page.screenshot({ path: path.join(dir, `${capture.name}.FAIL.png`) });
        } catch {}
      } finally {
        await context.close();
      }
    }

    if (consoleErrors.length) {
      fs.writeFileSync(
        path.join(dir, "console-errors.json"),
        JSON.stringify([...new Set(consoleErrors)], null, 2),
      );
    }
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  const failed = report.filter((row) => !row.ok);
  console.log(`\nDone. ${report.length - failed.length}${report.length} captured, ${failed.length} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
