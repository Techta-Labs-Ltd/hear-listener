import {
  migrateVoiceDatabase,
  VOICE_SCHEMA_VERSION,
} from "@/lib/voice/repository";
import type {
  VoiceMigrationDatabase,
  VoiceMigrationTransaction,
} from "@/types";
describe("database migrations", () => {
  it("creates actions, locations, FTS and trigram indexes transactionally", async () => {
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
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_actions");
    expect(sql).toContain("voice_terms_fts USING fts5");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS term_trigrams");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS locations");
    expect(sql).toContain(`PRAGMA user_version = ${VOICE_SCHEMA_VERSION}`);
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
