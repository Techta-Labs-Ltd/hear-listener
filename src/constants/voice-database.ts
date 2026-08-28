export const VOICE_DATABASE_NAME = "hear-voice-v7.db";
export const VOICE_SCHEMA_VERSION = 9;
export const VOICE_DATABASE_MAX_CACHE = 48;
export const VOICE_DATABASE_MAX_BUSY_RETRIES = 3;
export const VOICE_DATABASE_BUSY_RETRY_DELAY_MS = 200;
export const VOICE_DATABASE_OPTIONS = {
  finalizeUnusedStatementsBeforeClosing: false,
} as const;
