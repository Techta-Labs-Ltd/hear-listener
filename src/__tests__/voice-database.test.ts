import {
  migrateVoiceDatabase,
} from "@/services/voice/voice-repository";
import { VOICE_SCHEMA_VERSION } from "@/constants/voice-database";
import type {
  VoiceMigrationDatabase,
  VoiceMigrationTransaction,
} from "@/types";

describe("database migrations", () => {
  it("creates entities, aliases, FTS, trigram and phonetic indexes transactionally", async () => {
    const execAsync = jest.fn(async (_statement: string) => undefined);
    const transaction: VoiceMigrationTransaction = {
      execAsync,
      getAllAsync: jest.fn(async () => []),
    };
    const db: VoiceMigrationDatabase = {
      getFirstAsync: jest.fn().mockResolvedValue({ user_version: 0 }),
      withExclusiveTransactionAsync: jest.fn(async (callback) =>
        callback(transaction),
      ),
    };
    await migrateVoiceDatabase(db);
    const sql = execAsync.mock.calls.map(([statement]) => statement).join("\n");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_entities");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_aliases");
    expect(sql).toContain("voice_entity_fts USING fts5");
    expect(sql).toContain("tokenize='unicode61 remove_diacritics 2'");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_entity_trigrams");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_token_rarity");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS locations");
    expect(sql).toContain(`PRAGMA user_version = ${VOICE_SCHEMA_VERSION}`);
  });

  it("drops the legacy flat term tables when migrating", async () => {
    const execAsync = jest.fn(async (_statement: string) => undefined);
    const transaction: VoiceMigrationTransaction = {
      execAsync,
      getAllAsync: jest.fn(async () => []),
    };
    const db: VoiceMigrationDatabase = {
      getFirstAsync: jest.fn().mockResolvedValue({ user_version: 0 }),
      withExclusiveTransactionAsync: jest.fn(async (callback) =>
        callback(transaction),
      ),
    };
    await migrateVoiceDatabase(db);
    const sql = execAsync.mock.calls.map(([statement]) => statement).join("\n");
    expect(sql).toContain("DROP TABLE IF EXISTS voice_terms");
    expect(sql).toContain("DROP TABLE IF EXISTS voice_terms_fts");
    expect(sql).toContain("DROP TABLE IF EXISTS voice_entity_fts");
    expect(sql).toContain("DROP TABLE IF EXISTS term_trigrams");
    expect(sql).toContain("DROP TABLE IF EXISTS asr_substitutions");
  });

  it("does not rerun the current migration", async () => {
    const db: VoiceMigrationDatabase = {
      getFirstAsync: jest
        .fn()
        .mockResolvedValue({ user_version: VOICE_SCHEMA_VERSION }),
      withExclusiveTransactionAsync: jest.fn(),
    };
    await migrateVoiceDatabase(db);
    expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });
});
