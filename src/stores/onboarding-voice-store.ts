import { create } from "zustand";
import type {
  OnboardingGestureMode,
  OnboardingStepReadout,
  OnboardingVoiceCommand,
  OnboardingVoiceStore,
} from "@/types";

let commandCounter = 0;
let gestureCounter = 0;

export const useOnboardingVoiceStore = create<OnboardingVoiceStore>()((set, get) => ({
  gestureMode: "inactive",
  gestureLessonActive: false,
  gestureLessonCompleted: false,
  voiceInvocationAllowed: false,
  registerStep: (stepReadout: OnboardingStepReadout) => set({ stepReadout }),
  dispatch: (command: OnboardingVoiceCommand) =>
    set({ lastCommand: { ...command, id: ++commandCounter } }),
  take: () => get().lastCommand,
  setGestureMode: (gestureMode: OnboardingGestureMode) => set({ gestureMode }),
  reportGesture: () => {
    const mode = get().gestureMode;
    if (mode !== "inactive") set({ gestureEvent: { id: ++gestureCounter, mode } });
    return mode;
  },
  setGestureLessonActive: (active: boolean) =>
    set({
      gestureLessonActive: active,
      gestureMode: active ? "advanceWelcome" : "inactive",
    }),
  completeGestureLesson: () =>
    set({
      gestureLessonActive: false,
      gestureLessonCompleted: true,
      gestureMode: "inactive",
    }),
  setVoiceInvocationAllowed: (voiceInvocationAllowed: boolean) =>
    set({ voiceInvocationAllowed }),
  resetExperience: () =>
    set({
      lastCommand: undefined,
      stepReadout: undefined,
      gestureMode: "inactive",
      gestureEvent: undefined,
      gestureLessonActive: false,
      gestureLessonCompleted: false,
      voiceInvocationAllowed: false,
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
  isGestureLessonActive: () =>
    useOnboardingVoiceStore.getState().gestureLessonActive,
  completeGestureLesson: () =>
    useOnboardingVoiceStore.getState().completeGestureLesson(),
  setVoiceInvocationAllowed: (allowed: boolean) =>
    useOnboardingVoiceStore.getState().setVoiceInvocationAllowed(allowed),
  isVoiceInvocationAllowed: () =>
    useOnboardingVoiceStore.getState().voiceInvocationAllowed,
  resetExperience: () => useOnboardingVoiceStore.getState().resetExperience(),
};
