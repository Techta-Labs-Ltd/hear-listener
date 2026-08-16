import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const port = process.env.EXPO_PORT ?? "8081";
const clearCache = process.argv.includes("--clear");
const executable = process.platform === "win32" ? "adb.exe" : "adb";
const sdkAdb = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", executable)
  : executable;
const adb = existsSync(sdkAdb) ? sdkAdb : executable;
const androidPackage = "com.samuedev33.hearlistener";

const devices = spawnSync(adb, ["devices"], { encoding: "utf8", timeout: 10000 });
if (devices.error || !devices.stdout?.includes("\tdevice")) {
  console.error("No running Android emulator or connected device was found.");
  process.exit(1);
}

const reverse = spawnSync(adb, ["reverse", `tcp:${port}`, `tcp:${port}`], {
  stdio: "inherit",
});
if (reverse.status !== 0) process.exit(reverse.status ?? 1);

const expoCli = join(process.cwd(), "node_modules", "expo", "bin", "cli");
if (!existsSync(expoCli)) {
  console.error("Expo is not installed. Run npm install first.");
  process.exit(1);
}

const installed = spawnSync(adb, ["shell", "pm", "path", androidPackage], {
  encoding: "utf8",
  timeout: 10000,
});
const intent = spawnSync(
  adb,
  [
    "shell",
    "cmd",
    "package",
    "resolve-activity",
    "--brief",
    "-a",
    "android.intent.action.VIEW",
    "-c",
    "android.intent.category.BROWSABLE",
    "-d",
    "exp+hear-listener://expo-development-client",
  ],
  { encoding: "utf8", timeout: 10000 },
);
const needsClient =
  installed.status !== 0 ||
  !installed.stdout?.includes("package:") ||
  intent.status !== 0 ||
  !intent.stdout?.includes(androidPackage);

if (needsClient) {
  console.log("Hear! development client is missing or stale. Building and installing it now...");
  const build = spawnSync(
    process.execPath,
    [expoCli, "run:android", "--no-bundler"],
    {
      stdio: "inherit",
      shell: false,
      env: process.env,
    },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const expoArgs = [expoCli, "start", "--dev-client", "--android", "--lan"];
if (clearCache) expoArgs.push("--clear");
expoArgs.push("--port", port);

const expo = spawn(
  process.execPath,
  expoArgs,
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
    },
  },
);

expo.on("exit", (code) => process.exit(code ?? 0));
expo.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
