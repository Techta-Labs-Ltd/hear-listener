import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const executable = process.platform === "win32" ? "adb.exe" : "adb";
const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const platformSdkRoot =
  process.platform === "darwin"
    ? join(homedir(), "Library", "Android", "sdk")
    : process.platform === "win32" && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : join(homedir(), "Android", "Sdk");
const adbCandidates = [
  sdkRoot ? join(sdkRoot, "platform-tools", executable) : null,
  join(platformSdkRoot, "platform-tools", executable),
  executable,
].filter(Boolean);
const adb = adbCandidates.find((candidate) => existsSync(candidate)) ?? executable;

function runAdb(args, options = {}) {
  const result = spawnSync(adb, args, {
    encoding: "utf8",
    timeout: 10000,
    ...options,
  });

  if (result.error) {
    console.error(`Unable to run adb: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim();
    console.error(message || `adb exited with status ${result.status}`);
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
}

const devices = runAdb(["devices"]);
const emulatorSerial = devices
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/))
  .find(([serial, state]) => serial?.startsWith("emulator-") && state === "device")?.[0];

if (!emulatorSerial) {
  console.error("No running Android emulator was found.");
  process.exit(1);
}

const wait = (durationMs) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));
const setSensor = (sensor, values) => {
  runAdb([
    "-s",
    emulatorSerial,
    "emu",
    "sensor",
    "set",
    sensor,
    values.join(":"),
  ]);
};
const setNeutral = () => {
  setSensor("gyroscope", [0, 0, 0]);
  setSensor("acceleration", [0, 9.81, 0]);
};
const setPeak = (accelerationX, rotationY) => {
  setSensor("gyroscope", [0, rotationY, 0]);
  setSensor("acceleration", [accelerationX, 9.81, 0]);
};

setNeutral();
await wait(700);

for (const [accelerationX, rotationY] of [
  [15, 1.5],
  [-15, -1.5],
  [15, 1.5],
]) {
  setPeak(accelerationX, rotationY);
  await wait(50);
  setNeutral();
  await wait(50);
}

console.log(`Sent a real-shake sensor sequence to ${emulatorSerial}.`);
