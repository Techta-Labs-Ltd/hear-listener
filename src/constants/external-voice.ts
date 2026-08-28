export const EXTERNAL_VOICE_CONFIG = {
  resolverBaseUrl: "https://resolver.hear.media",
  resolverEndpoint: "/resolve",
  searchBaseUrl: "https://alexa.hear.media",
  searchEndpoint: "/api/v1/alexa/search",
  apiKey: process.env.EXPO_PUBLIC_HEAR_SERVICE_KEY?.trim() || "",
  timeoutMs: 15_000,
  delayedProgressMs: 4_000,
  clientName: "hear-listener",
  clientVersion: "1.0.0",
} as const;

export const EXTERNAL_INTERACTION_TTL_MS = 5 * 60_000;
export const VOICE_INSTALLATION_ID_KEY = "hear.voice.installation-id.v1";
export const RESOLVER_EXACT_CONFIDENCE = 100;

export const EXTERNAL_CONFIRMATION_YES_PHRASES = [
  "yes",
  "yeah",
  "yep",
  "please do",
  "confirm",
  "go ahead",
] as const;

export const EXTERNAL_CONFIRMATION_NO_PHRASES = [
  "no",
  "no thanks",
  "do not",
  "dont",
  "cancel",
  "stop",
] as const;

export const EXTERNAL_INTERACTION_REPEAT_PHRASES = [
  "repeat",
  "say that again",
  "repeat the choices",
] as const;

export const EXTERNAL_CHOICE_ORDINALS: Readonly<Record<string, number>> = {
  one: 0,
  first: 0,
  "1": 0,
  two: 1,
  second: 1,
  "2": 1,
  three: 2,
  third: 2,
  "3": 2,
};

export const EXTERNAL_INTERACTION_COPY = {
  confirmationAnswerHint: "Please say yes or no.",
  ambiguityAnswerHint:
    "Please say a name, the first one, the second one, or the third one.",
} as const;
