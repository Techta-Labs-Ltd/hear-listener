import type { OnboardingChapterDefinition } from "@/types";

export const onboardingCopy = {
  chapters: [
    {
      id: "welcome",
      eyebrow: "WELCOME TO HEAR!",
      title: "Hear what matters, without searching through screens.",
      description: "Choose how setup should guide you, then learn the fastest way to start a command.",
      spokenPrompt: "Choose Guide me with speech or Use screen controls. You can change this later.",
      voiceCommands: ["Guide me with speech", "Use screen controls", "Continue"],
    },
    {
      id: "voiceExperience",
      eyebrow: "VOICE AND SOUND",
      title: "Speak one command when you choose to.",
      description: "Hear listens for one command only after you start it. It never listens in the background.",
      spokenPrompt: "Enable voice control, then say Play my local news. You may skip this chapter.",
      voiceCommands: ["Play my local news", "Repeat sound check", "I cannot hear it", "Skip this chapter"],
    },
    {
      id: "ready",
      eyebrow: "READY",
      title: "Your listening space is ready.",
      description: "Review your choices, optionally add a local area, then open Hear.",
      spokenPrompt: "Say my town is followed by your town, use my location, or open Hear.",
      voiceCommands: ["My town is Lagos", "Use my location", "Open Hear"],
    },
  ] satisfies readonly OnboardingChapterDefinition[],
} as const;
