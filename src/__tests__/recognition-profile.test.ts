import { Platform } from "react-native";
import {
  buildRecognitionOptions,
  resolveRecognitionPurpose,
} from "@/services/voice/recognition-profile";
import type { PlatformSpeechCapabilities } from "@/types";

const androidCapabilities: PlatformSpeechCapabilities = {
  platform: "android",
  recognitionAvailable: true,
  onDeviceSupported: false,
  services: ["com.google.android.as"],
  defaultService: "com.google.android.as",
  selectedService: "com.google.android.as",
  apiLevel: 34,
};

const iosCapabilities: PlatformSpeechCapabilities = {
  platform: "ios",
  recognitionAvailable: true,
  onDeviceSupported: false,
  services: [],
  defaultService: "",
};

describe("recognition profile", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("always pins the locale to en-GB on every platform and purpose", () => {
    for (const purpose of ["command", "entity-search", "short-response", "dictation"] as const) {
      const android = buildRecognitionOptions(
        purpose,
        ["Tynedale"],
        androidCapabilities,
      );
      const ios = buildRecognitionOptions(
        purpose,
        ["Tynedale"],
        iosCapabilities,
      );
      expect(android.lang).toBe("en-GB");
      expect(ios.lang).toBe("en-GB");
      expect(android.maxAlternatives).toBe(5);
      expect(ios.maxAlternatives).toBe(5);
      expect(android.contextualStrings).toEqual(["Tynedale"]);
      expect(android.continuous).toBe(false);
    }
  });

  it("uses free_form for natural commands and web_search for search/short responses on Android", () => {
    (Platform as { OS: string }).OS = "android";
    (Platform as { Version: number | string }).Version = 34;

    const command = buildRecognitionOptions("command", [], androidCapabilities);
    expect(command.androidIntentOptions?.EXTRA_LANGUAGE_MODEL).toBe("free_form");

    const search = buildRecognitionOptions(
      "entity-search",
      [],
      androidCapabilities,
    );
    expect(search.androidIntentOptions?.EXTRA_LANGUAGE_MODEL).toBe("web_search");

    const short = buildRecognitionOptions(
      "short-response",
      [],
      androidCapabilities,
    );
    expect(short.androidIntentOptions?.EXTRA_LANGUAGE_MODEL).toBe("web_search");
  });

  it("adds the offensive-word extra only on Android API 33+", () => {
    (Platform as { OS: string }).OS = "android";

    const modern = buildRecognitionOptions("command", [], {
      ...androidCapabilities,
      apiLevel: 33,
    });
    expect(modern.androidIntentOptions?.EXTRA_MASK_OFFENSIVE_WORDS).toBe(true);

    const legacy = buildRecognitionOptions("command", [], {
      ...androidCapabilities,
      apiLevel: 32,
    });
    expect(legacy.androidIntentOptions).toBeDefined();
    expect(
      legacy.androidIntentOptions && "EXTRA_MASK_OFFENSIVE_WORDS" in legacy.androidIntentOptions,
    ).toBe(false);
  });

  it("never passes language detection or switching extras", () => {
    (Platform as { OS: string }).OS = "android";
    (Platform as { Version: number | string }).Version = 34;
    const options = buildRecognitionOptions("command", [], androidCapabilities);
    const extras = options.androidIntentOptions ?? {};
    expect(Object.keys(extras)).not.toContain("EXTRA_ENABLE_LANGUAGE_DETECTION");
    expect(Object.keys(extras)).not.toContain("EXTRA_ENABLE_LANGUAGE_SWITCH");
  });

  it("maps iOS task hints by purpose", () => {
    (Platform as { OS: string }).OS = "ios";
    expect(buildRecognitionOptions("command", [], iosCapabilities).iosTaskHint).toBe("search");
    expect(
      buildRecognitionOptions("entity-search", [], iosCapabilities).iosTaskHint,
    ).toBe("search");
    expect(
      buildRecognitionOptions("short-response", [], iosCapabilities).iosTaskHint,
    ).toBe("confirmation");
    expect(
      buildRecognitionOptions("short-response", [], iosCapabilities)
        .iosVoiceProcessingEnabled,
    ).toBe(false);
  });

  it("prefers an available Google recognition service, else falls back to the default", () => {
    const capabilitiesWithGoogle: PlatformSpeechCapabilities = {
      ...androidCapabilities,
      services: ["com.samsung.android.bixby.agent", "com.google.android.as"],
      defaultService: "com.samsung.android.bixby.agent",
    };
    (Platform as { OS: string }).OS = "android";
    expect(
      buildRecognitionOptions("command", [], capabilitiesWithGoogle)
        .androidRecognitionServicePackage,
    ).toBe("com.google.android.as");

    const noGoogle: PlatformSpeechCapabilities = {
      ...androidCapabilities,
      services: ["com.samsung.android.bixby.agent"],
      defaultService: "com.samsung.android.bixby.agent",
    };
    expect(
      buildRecognitionOptions("command", [], noGoogle)
        .androidRecognitionServicePackage,
    ).toBe("com.samsung.android.bixby.agent");
  });

  it("resolves short-response purpose from pending interactions and expectations", () => {
    expect(
      resolveRecognitionPurpose({ pendingAmbiguity: true }),
    ).toBe("short-response");
    expect(resolveRecognitionPurpose({ pendingFeedback: true })).toBe(
      "short-response",
    );
    expect(resolveRecognitionPurpose({ clarifying: true })).toBe("short-response");
    expect(resolveRecognitionPurpose({ expectation: "entity-search" })).toBe(
      "entity-search",
    );
    expect(resolveRecognitionPurpose({})).toBe("command");
  });
});