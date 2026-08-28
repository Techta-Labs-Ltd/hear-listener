import { buildScreenReadout } from "@/utils/copy/readScreen";
import { stories } from "@/data/catalogue";

const preferences = {
  setupComplete: true,
  onboardingVersion: 2,
  spokenGuidanceEnabled: false,
  kineticGesturesEnabled: true,
  town: "",
  interests: [],
  savedIds: ["daily"],
  followingIds: ["hear-daily"],
  downloadedIds: ["morning-headlines"],
  voiceDiagnosticsEnabled: false,
  voiceConsentVersion: 1,
  homeGuideDismissed: false,
  notificationsEnabled: true,
  notifiedReleaseIds: [],
};

function context(pathname: string, extra: object = {}) {
  return {
    pathname,
    playback: {
      current: undefined,
      playing: false,
      progress: 0,
      speed: 1 as const,
    },
    preferences,
    ...extra,
  };
}

describe("buildScreenReadout", () => {
  it("reads Home without inventing demo stories", () => {
    const readout = buildScreenReadout(context("/"));
    expect(readout).toContain("Home.");
    expect(readout).toContain("live catalogue");
    expect(readout).not.toContain("Your local news:");
    expect(readout).toContain("Tilt right for next, tilt left for previous, or shake to speak.");
  });

  it("reads the player with the current story", () => {
    const readout = buildScreenReadout(
      context("/player", {
        playback: {
          current: stories[0],
          playing: true,
          progress: 0.5,
          speed: 1 as const,
        },
      }),
    );
    expect(readout).toContain("Now playing: The stories shaping your evening");
    expect(readout).toContain("Hear! Daily · Today · Continue");
    expect(readout).toContain("speed 1 times");
  });

  it("reads onboarding using the registered step", () => {
    const readout = buildScreenReadout(
      context("/onboarding", {
        onboardingStep: {
          stepIndex: 3,
          totalSteps: 6,
          title: "Choose the area you want to hear.",
          description: "Approximate location helps find nearby news.",
          options: ["Say use my location", "Say my town is, then the town name"],
        },
      }),
    );
    expect(readout).toContain("Step 4 of 6");
    expect(readout).toContain("Say use my location");
    expect(readout).toContain("Shake device to continue.");
  });

  it("reads library with counts", () => {
    const readout = buildScreenReadout(context("/library"));
    expect(readout).toContain("1 saved stories");
    expect(readout).toContain("1 followed sources");
    expect(readout).toContain("1 downloads");
  });

  it("reads a topic page without hard-coded catalogue stories", () => {
    const readout = buildScreenReadout(context("/topic/local"));
    expect(readout).toContain("Topic: local");
    expect(readout).toContain("Hear! catalogue results are shown on screen");
    expect(readout).not.toContain("What changed in London, UK today");
  });
});
