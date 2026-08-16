const { chromium } = require("playwright");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const output = path.resolve(process.cwd(), "screenshots/hear-app");
const prototypeUrl = pathToFileURL(
  path.resolve(process.cwd(), "hear-app/index.html"),
).href;

async function capturePrototype() {
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 430, height: 870 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        speak() {},
        getVoices: () => [],
        addEventListener() {},
      },
    });
    Object.defineProperty(window, "AudioContext", { value: undefined });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined });
  });

  const capture = async (name) => {
    await page.screenshot({
      path: path.join(output, `${name}.png`),
      fullPage: true,
    });
  };
  const open = async (view) => {
    if (!(await page.evaluate(() => Boolean(window.HearApp)))) {
      await page.goto(prototypeUrl);
      await page.waitForFunction(() => Boolean(window.HearApp));
    }
    await page.evaluate((name) => {
      document.querySelector("#detailSheet").hidden = true;
      document.querySelector("#permissionSheet").hidden = true;
      document.querySelector("#voiceOverlay").hidden = true;
      window.HearApp.showView(name, { speakScreen: false });
    }, view);
    await page.waitForTimeout(50);
  };

  await page.goto(prototypeUrl);
  await capture("00-launch");

  await open("onboarding");
  await capture("01-onboarding-welcome");
  for (const [step, name] of [
    [2, "microphone"],
    [3, "sound-check"],
    [4, "location"],
    [5, "voice-practice"],
    [6, "summary"],
  ]) {
    await page.locator("#setupNext").click();
    await page.locator(`.setup-step[data-step="${step}"]`).waitFor();
    await capture(`0${step}-onboarding-${name}`);
  }

  for (const [view, index] of [
    ["home", 7],
    ["discover", 8],
    ["library", 9],
    ["settings", 10],
  ]) {
    await open(view);
    await capture(`${index.toString().padStart(2, "0")}-${view}`);
  }

  await open("home");
  await page.locator("[data-play]").first().click();
  await capture("11-home-playing-mini-player");

  await open("home");
  await page.evaluate(() => window.HearApp.openVoice());
  await capture("12-voice-permission-primer");
  await page.locator("#confirmPermission").click();
  await capture("13-voice-listening");

  await open("home");
  await page.evaluate(() => {
    document.querySelector("#voiceOverlay").hidden = false;
    document.querySelector("#voiceOverlay").classList.add("ambiguous");
    document.querySelector("#voiceStateLabel").textContent = "TWO MATCHES";
    document.querySelector("#voiceStatus").textContent =
      "Which local news did you mean?";
    document.querySelector("#voiceTranscript").textContent = "";
    document.querySelector("#ambiguityPanel").hidden = false;
    document.querySelector("#voiceWave").hidden = true;
    document.querySelector("#doneSpeaking").hidden = true;
  });
  await capture("14-voice-clarification");

  const detailGroups = [
    ["discover", ".topic-list button", "topic"],
    ["library", ".library-list button", "library"],
    ["settings", ".library-list button", "settings"],
  ];
  let detailIndex = 15;
  for (const [view, selector, group] of detailGroups) {
    await open(view);
    const count = await page.locator(selector).count();
    for (let index = 0; index < count; index += 1) {
      const button = page.locator(selector).nth(index);
      const title = (await button.locator("strong").count())
        ? await button.locator("strong").innerText()
        : (await button.innerText()).replace("→", "").trim();
      await button.click();
      await page.locator("#detailSheet").waitFor();
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await capture(
        `${detailIndex.toString().padStart(2, "0")}-${group}-${slug}`,
      );
      detailIndex += 1;
      await page.locator("#closeDetail").click();
    }
  }

  await open("settings");
  for (const [selector, name] of [
    ["#bluetoothRow", "bluetooth-devices"],
    ["#wifiRow", "wifi-connections"],
  ]) {
    await page.locator(selector).click();
    await page.locator("#detailSheet").waitFor();
    await capture(
      `${detailIndex.toString().padStart(2, "0")}-settings-${name}`,
    );
    detailIndex += 1;
    await page.locator("#closeDetail").click();
  }
  await browser.close();
}

capturePrototype().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
