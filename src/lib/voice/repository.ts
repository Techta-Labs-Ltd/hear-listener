import { appAssets } from "@/constants/assets";
import { entities, stories, topics } from "@/data/catalogue";
import type {
  VoiceCandidate,
  VoiceCandidateKind,
  VoiceDatabaseHealth,
  VoiceMigrationDatabase,
  VoiceTermRepository,
  VoiceVocabularyTerm,
} from "@/types";
import {
  importDatabaseFromAssetAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import {
  normalizeVoiceText,
  phoneticKey,
  voiceTokens,
  voiceTrigrams,
} from "./normalize";

const DATABASE_NAME = "hear-voice-v5.db";
export const VOICE_SCHEMA_VERSION = 5;
const CATALOGUE_VERSION = 3;
const MAX_CACHE = 48;
const MAX_BUSY_RETRIES = 3;
const BUSY_RETRY_DELAY_MS = 200;
let databasePromise: Promise<SQLiteDatabase> | undefined;

function getVoiceDatabase() {
  if (!databasePromise) {
    databasePromise = openVoiceDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

function isBusyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /database is locked|sqlite_busy|database is busy/i.test(error.message)
  );
}

async function openVoiceDatabase() {
  await importDatabaseFromAssetAsync(DATABASE_NAME, {
    assetId: appAssets.database.voiceSeed,
  });
  let database = await openDatabaseAsync(DATABASE_NAME);
  try {
    await configureDatabase(database);
  } catch (error) {
    if (!isBusyError(error)) throw error;
    // A stale connection from a previous process holds the file.
    // Drop our connection, delete the database and re-import the seed.
    try {
      await database.closeAsync();
    } catch {}
    await deleteDatabaseFiles();
    await importDatabaseFromAssetAsync(DATABASE_NAME, {
      assetId: appAssets.database.voiceSeed,
    });
    database = await openDatabaseAsync(DATABASE_NAME);
    await configureDatabase(database);
  }
  await migrateVoiceDatabase(database);
  return database;
}

async function configureDatabase(database: SQLiteDatabase) {
  for (let attempt = 1; ; attempt++) {
    try {
      await database.execAsync(
        "PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
      );
      return;
    } catch (error) {
      if (attempt >= MAX_BUSY_RETRIES || !isBusyError(error)) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, BUSY_RETRY_DELAY_MS * attempt),
      );
    }
  }
}

async function deleteDatabaseFiles() {
  const sqliteDir = new Directory(Paths.document, "SQLite");
  for (const name of [
    DATABASE_NAME,
    `${DATABASE_NAME}-wal`,
    `${DATABASE_NAME}-shm`,
    `${DATABASE_NAME}-journal`,
  ]) {
    try {
      const file = new File(sqliteDir, name);
      if (file.exists) file.delete();
    } catch {}
  }
}

export async function migrateVoiceDatabase(database: VoiceMigrationDatabase) {
  const row = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((row?.user_version ?? 0) >= VOICE_SCHEMA_VERSION) return;
  await database.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS voice_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, canonical TEXT NOT NULL, normalized TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT, weight REAL NOT NULL DEFAULT 1, phonetic TEXT NOT NULL DEFAULT '', UNIQUE(normalized, kind, target_id));
      CREATE INDEX IF NOT EXISTS voice_terms_lookup ON voice_terms(kind, normalized, weight DESC);
      CREATE INDEX IF NOT EXISTS voice_terms_phonetic ON voice_terms(phonetic, kind);
      CREATE VIRTUAL TABLE IF NOT EXISTS voice_terms_fts USING fts5(canonical, normalized, kind UNINDEXED, target_id UNINDEXED, weight UNINDEXED, tokenize='unicode61 remove_diacritics 2');
      CREATE TABLE IF NOT EXISTS voice_actions (id TEXT PRIMARY KEY, executor_key TEXT NOT NULL, label TEXT NOT NULL, risk TEXT NOT NULL DEFAULT 'safe', confirmation INTEGER NOT NULL DEFAULT 0, slot_schema TEXT NOT NULL DEFAULT '{}', feedback TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS intent_patterns (id INTEGER PRIMARY KEY, action_id TEXT NOT NULL REFERENCES voice_actions(id), phrase TEXT NOT NULL, normalized TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1, UNIQUE(action_id, normalized));
      CREATE TABLE IF NOT EXISTS asr_substitutions (heard TEXT NOT NULL, canonical TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en-GB', weight REAL NOT NULL DEFAULT 1, PRIMARY KEY(heard,canonical,locale));
      CREATE TABLE IF NOT EXISTS term_trigrams (term_id INTEGER NOT NULL REFERENCES voice_terms(id) ON DELETE CASCADE, trigram TEXT NOT NULL, PRIMARY KEY(term_id, trigram));
      CREATE INDEX IF NOT EXISTS term_trigrams_lookup ON term_trigrams(trigram, term_id);
      CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized TEXT NOT NULL, admin_area TEXT, latitude REAL, longitude REAL, population INTEGER, rank REAL NOT NULL DEFAULT 1, timezone TEXT);
      CREATE INDEX IF NOT EXISTS locations_name ON locations(normalized);
      CREATE TABLE IF NOT EXISTS learned_aliases (alias TEXT PRIMARY KEY, canonical TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT, confirmations INTEGER NOT NULL DEFAULT 1, weight REAL NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS voice_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS action_usage (action_id TEXT PRIMARY KEY, executions INTEGER NOT NULL DEFAULT 0, last_used_at INTEGER NOT NULL DEFAULT 0);
    `);
    const columns = await tx.getAllAsync<{ name: string }>(
      "PRAGMA table_info(voice_terms)",
    );
    if (!columns.some((column) => column.name === "phonetic"))
      await tx.execAsync(
        "ALTER TABLE voice_terms ADD COLUMN phonetic TEXT NOT NULL DEFAULT ''",
      );
    const learnedColumns = await tx.getAllAsync<{ name: string }>(
      "PRAGMA table_info(learned_aliases)",
    );
    if (!learnedColumns.some((column) => column.name === "weight"))
      await tx.execAsync(
        "ALTER TABLE learned_aliases ADD COLUMN weight REAL NOT NULL DEFAULT 1",
      );
    if (!learnedColumns.some((column) => column.name === "expires_at"))
      await tx.execAsync(
        "ALTER TABLE learned_aliases ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0",
      );
    await tx.execAsync(`PRAGMA user_version = ${VOICE_SCHEMA_VERSION}`);
  });
}

class SQLiteVoiceRepository implements VoiceTermRepository {
  private initialization?: Promise<void>;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, VoiceCandidate[]>();

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private async withRetry<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await task();
      } catch (error) {
        if (attempt >= MAX_BUSY_RETRIES || !isBusyError(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, BUSY_RETRY_DELAY_MS * attempt));
      }
    }
  }

  private async withImmediateTransaction<T>(
    db: SQLiteDatabase,
    task: (tx: SQLiteDatabase) => Promise<T>,
  ): Promise<T> {
    await db.execAsync("BEGIN IMMEDIATE");
    try {
      const result = await task(db);
      await db.execAsync("COMMIT");
      return result;
    } catch (error) {
      try {
        await db.execAsync("ROLLBACK");
      } catch {}
      throw error;
    }
  }

  initialize() {
    this.initialization ??= this.initializeOnce();
    return this.initialization;
  }
  private async initializeOnce() {
    const database = await getVoiceDatabase();
    const metadata = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM voice_metadata WHERE key = 'catalogue_version'",
    );
    if (Number(metadata?.value) === CATALOGUE_VERSION) return;
    const terms: VoiceVocabularyTerm[] = [
      ...stories.flatMap((item) => [
        term(item.title, "story", item.id, 3),
        term(item.creator, "story", item.id, 2, item.title),
        term(item.publication, "story", item.id, 1.8, item.title),
      ]),
      ...topics.map((item) => term(item.name, "topic", item.id, 2.5)),
      ...entities.map((item) => term(item.name, "entity", item.id, 2.2)),
    ];
    await this.seed(database, terms);
  }
  private async seed(database: SQLiteDatabase, terms: VoiceVocabularyTerm[]) {
    await this.enqueueWrite(() =>
      this.withRetry(() =>
        this.withImmediateTransaction(database, async (tx) => {
          for (const item of terms) {
            await tx.runAsync(
              "INSERT INTO voice_terms (canonical, normalized, kind, target_id, weight, phonetic) VALUES ($canonical,$normalized,$kind,$targetId,$weight,$phonetic) ON CONFLICT(normalized,kind,target_id) DO UPDATE SET canonical=excluded.canonical,weight=MAX(voice_terms.weight,excluded.weight),phonetic=excluded.phonetic",
              {
                $canonical: item.canonical,
                $normalized: item.normalized,
                $kind: item.kind,
                $targetId: item.targetId ?? null,
                $weight: item.weight,
                $phonetic: phoneticKey(item.normalized),
              },
            );
          }
          await rebuildIndexes(tx);
          await tx.runAsync(
            "INSERT OR REPLACE INTO voice_metadata(key,value) VALUES('catalogue_version',?)",
            String(CATALOGUE_VERSION),
          );
        }),
      ),
    );
  }
  async search(
    query: string,
    limit = 12,
    signal?: AbortSignal,
  ): Promise<VoiceCandidate[]> {
    await this.initialize();
    if (signal?.aborted) return [];
    const normalized = normalizeVoiceText(query);
    const cached = this.cache.get(normalized);
    if (cached) return cached.slice(0, limit);
    const database = await getVoiceDatabase();
    const substitutions = await database.getAllAsync<{
      heard: string;
      canonical: string;
    }>(
      "SELECT heard,canonical FROM asr_substitutions WHERE ? = heard OR ? LIKE '% ' || heard || '%' OR ? LIKE heard || ' %' ORDER BY weight DESC LIMIT 8",
      normalized,
      normalized,
      normalized,
    );
    const corrected = substitutions.reduce(
      (value, item) => value.replaceAll(item.heard, item.canonical),
      normalized,
    );
    const exact = await database.getAllAsync<VoiceCandidate>(
      `${candidateSelect} WHERE t.normalized IN (?,?) ORDER BY t.weight DESC LIMIT ?`,
      normalized,
      corrected,
      limit,
    );
    if (signal?.aborted) return [];
    const match = buildFtsQuery(corrected);
    const fts = match
      ? await database.getAllAsync<VoiceCandidate>(
        `SELECT f.rowid AS id,f.canonical,f.normalized,f.kind,f.target_id AS targetId,CAST(f.weight AS REAL) AS weight,a.executor_key AS executorKey,a.risk,a.confirmation FROM voice_terms_fts f LEFT JOIN voice_actions a ON a.id=f.target_id WHERE voice_terms_fts MATCH ? ORDER BY bm25(voice_terms_fts) LIMIT ?`,
        match,
        limit,
      )
      : [];
    const grams = voiceTrigrams(corrected).slice(0, 32);
    const trigram = grams.length
      ? await database.getAllAsync<VoiceCandidate>(
        `${candidateSelect} JOIN term_trigrams g ON g.term_id=t.id WHERE g.trigram IN (${grams.map(() => "?").join(",")}) GROUP BY t.id ORDER BY COUNT(*) DESC,t.weight DESC LIMIT ?`,
        ...grams,
        limit * 3,
      )
      : [];
    const phonetic = await database.getAllAsync<VoiceCandidate>(
      `${candidateSelect} WHERE t.phonetic=? ORDER BY t.weight DESC LIMIT ?`,
      phoneticKey(corrected),
      limit,
    );
    const combined = dedupe([
      ...exact.map(source("exact")),
      ...fts.map(source("fts")),
      ...trigram.map(source("trigram")),
      ...phonetic.map(source("phonetic")),
    ]);
    this.cache.set(normalized, combined);
    if (this.cache.size > MAX_CACHE)
      this.cache.delete(this.cache.keys().next().value ?? "");
    return combined.slice(0, limit * 3);
  }
  async learnAlias(
    alias: string,
    canonical: string,
    kind: VoiceCandidateKind,
    targetId?: string,
  ) {
    await this.initialize();
    const db = await getVoiceDatabase();
    const normalized = normalizeVoiceText(alias);
    const now = Date.now();
    await this.enqueueWrite(() =>
      this.withRetry(() =>
        this.withImmediateTransaction(db, async (tx) => {
          await tx.runAsync(
            "INSERT INTO learned_aliases(alias,canonical,kind,target_id,confirmations,weight,updated_at,expires_at) VALUES(?,?,?,?,1,1,?,?) ON CONFLICT(alias) DO UPDATE SET confirmations=MIN(20,confirmations+1),weight=MIN(8,weight+0.5),updated_at=excluded.updated_at,expires_at=excluded.expires_at",
            normalized,
            canonical,
            kind,
            targetId ?? null,
            now,
            now + 180 * 86400000,
          );
          await tx.runAsync(
            "INSERT INTO voice_terms(canonical,normalized,kind,target_id,weight,phonetic) VALUES(?,?,?,?,4,?) ON CONFLICT(normalized,kind,target_id) DO UPDATE SET weight=MIN(10,voice_terms.weight+0.5)",
            canonical,
            normalized,
            kind,
            targetId ?? null,
            phoneticKey(normalized),
          );
          await rebuildIndexes(tx);
        }),
      ),
    );
    this.cache.clear();
  }
  async resetLearnedAliases() {
    const db = await getVoiceDatabase();
    await this.enqueueWrite(() =>
      this.withRetry(() =>
        this.withImmediateTransaction(db, async (tx) => {
          await tx.execAsync(
            "DELETE FROM voice_terms WHERE EXISTS (SELECT 1 FROM learned_aliases l WHERE l.alias=voice_terms.normalized AND l.kind=voice_terms.kind AND l.target_id IS voice_terms.target_id); DELETE FROM learned_aliases;",
          );
          await rebuildIndexes(tx);
        }),
      ),
    );
    this.cache.clear();
  }
  async getVersion() {
    const db = await getVoiceDatabase();
    const row = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    return row?.user_version ?? 0;
  }
  async healthCheck(): Promise<VoiceDatabaseHealth> {
    const db = await getVoiceDatabase();
    const integrity = await db.getFirstAsync<{ integrity_check: string }>(
      "PRAGMA integrity_check",
    );
    const version = await this.getVersion();
    const vocabulary = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM voice_metadata WHERE key='vocabulary_version'",
    );
    return {
      healthy:
        integrity?.integrity_check === "ok" && version === VOICE_SCHEMA_VERSION,
      integrity: integrity?.integrity_check ?? "unknown",
      schemaVersion: version,
      vocabularyVersion: vocabulary?.value ?? "bundled",
    };
  }
  async getContextualTerms(limit = 80) {
    await this.initialize();
    const db = await getVoiceDatabase();
    const rows = await db.getAllAsync<{ canonical: string }>(
      "SELECT canonical FROM voice_terms ORDER BY weight DESC LIMIT ?",
      limit,
    );
    return [...new Set(rows.map((row) => row.canonical))];
  }
}

const candidateSelect =
  "SELECT t.id,t.canonical,t.normalized,t.kind,t.target_id AS targetId,t.weight,a.executor_key AS executorKey,a.risk,a.confirmation FROM voice_terms t LEFT JOIN voice_actions a ON a.id=t.target_id";
function source(value: VoiceCandidate["source"]) {
  return (candidate: VoiceCandidate) => ({ ...candidate, source: value });
}
function dedupe(items: VoiceCandidate[]) {
  return items.filter(
    (candidate, index, all) =>
      all.findIndex(
        (item) =>
          item.kind === candidate.kind &&
          item.targetId === candidate.targetId &&
          item.normalized === candidate.normalized,
      ) === index,
  );
}
function term(
  value: string,
  kind: VoiceCandidateKind,
  targetId: string,
  weight: number,
  canonical = value,
): VoiceVocabularyTerm {
  return {
    canonical,
    normalized: normalizeVoiceText(value),
    kind,
    targetId,
    weight,
  };
}
function buildFtsQuery(value: string) {
  return voiceTokens(value)
    .filter((token) => token.length > 1)
    .map((token) => `"${token.replaceAll('"', "")}"*`)
    .join(" OR ");
}
async function rebuildIndexes(db: SQLiteDatabase) {
  await db.execAsync(
    "DELETE FROM voice_terms_fts; INSERT INTO voice_terms_fts(rowid,canonical,normalized,kind,target_id,weight) SELECT id,canonical,normalized,kind,target_id,weight FROM voice_terms; DELETE FROM term_trigrams;",
  );
  const rows = await db.getAllAsync<{ id: number; normalized: string }>(
    "SELECT id,normalized FROM voice_terms",
  );
  for (const row of rows) {
    for (const gram of voiceTrigrams(row.normalized)) {
      await db.runAsync(
        "INSERT OR IGNORE INTO term_trigrams(term_id,trigram) VALUES(?,?)",
        [row.id, gram],
      );
    }
  }
}
export const voiceTermRepository: VoiceTermRepository =
  new SQLiteVoiceRepository();
