import { create } from "zustand";
import type { OnboardingGestureMode } from "@/types";

export type OnboardingVoiceCommand =
  | { type: "continue" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "read" }
  | { type: "useSpokenSetup" }
  | { type: "useScreenControls" }
  | { type: "playSoundCheck" }
  | { type: "cannotHear" }
  | { type: "useLocation" }
  | { type: "setTown"; locationId: string; name: string };

export type OnboardingStepReadout = {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  options: string[];
};

type GestureEvent = {
  id: number;
  mode: Exclude<OnboardingGestureMode, "inactive">;
};

type OnboardingVoiceStore = {
  lastCommand?: OnboardingVoiceCommand & { id: number };
  stepReadout?: OnboardingStepReadout;
  gestureMode: OnboardingGestureMode;
  gestureEvent?: GestureEvent;
  gestureLessonActive: boolean;
  gestureLessonCompleted: boolean;
  voiceInvocationAllowed: boolean;
  registerStep: (readout: OnboardingStepReadout) => void;
  dispatch: (command: OnboardingVoiceCommand) => void;
  take: () => (OnboardingVoiceCommand & { id: number }) | undefined;
  setGestureMode: (mode: OnboardingGestureMode) => void;
  reportGesture: () => OnboardingGestureMode;
  setGestureLessonActive: (active: boolean) => void;
  completeGestureLesson: () => void;
  setVoiceInvocationAllowed: (allowed: boolean) => void;
  resetExperience: () => void;
};

let commandCounter = 0;
let gestureCounter = 0;

export const useOnboardingVoiceStore = create<OnboardingVoiceStore>()((set, get) => ({
  gestureMode: "inactive",
  gestureLessonActive: false,
  gestureLessonCompleted: false,
  voiceInvocationAllowed: true,
  registerStep: (stepReadout) => set({ stepReadout }),
  dispatch: (command) => set({ lastCommand: { ...command, id: ++commandCounter } }),
  take: () => get().lastCommand,
  setGestureMode: (gestureMode) => set({ gestureMode }),
  reportGesture: () => {
    const mode = get().gestureMode;
    if (mode !== "inactive") set({ gestureEvent: { id: ++gestureCounter, mode } });
    return mode;
  },
  setGestureLessonActive: (active) => set({
    gestureLessonActive: active,
    gestureMode: active ? "advanceWelcome" : "inactive",
  }),
  completeGestureLesson: () => set({
    gestureLessonActive: false,
    gestureLessonCompleted: true,
    gestureMode: "inactive",
  }),
  setVoiceInvocationAllowed: (voiceInvocationAllowed) => set({ voiceInvocationAllowed }),
  resetExperience: () => set({
    lastCommand: undefined,
    stepReadout: undefined,
    gestureMode: "inactive",
    gestureEvent: undefined,
    gestureLessonActive: false,
    gestureLessonCompleted: false,
    voiceInvocationAllowed: true,
  }),
}));

export const onboardingVoiceBridge = {
  registerStep: (readout: OnboardingStepReadout) =>
    useOnboardingVoiceStore.getState().registerStep(readout),
  dispatch: (command: OnboardingVoiceCommand) =>
    useOnboardingVoiceStore.getState().dispatch(command),
  currentStep: () => useOnboardingVoiceStore.getState().stepReadout,
  setGestureMode: (mode: OnboardingGestureMode) =>
    useOnboardingVoiceStore.getState().setGestureMode(mode),
  reportGesture: () => useOnboardingVoiceStore.getState().reportGesture(),
  isGestureLessonActive: () => useOnboardingVoiceStore.getState().gestureLessonActive,
  completeGestureLesson: () => useOnboardingVoiceStore.getState().completeGestureLesson(),
  isVoiceInvocationAllowed: () => useOnboardingVoiceStore.getState().voiceInvocationAllowed,
  resetExperience: () => useOnboardingVoiceStore.getState().resetExperience(),
};
