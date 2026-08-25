import { appAssets } from "@/constants/assets";
import type {
  BiasTermInput,
  EntityCandidate,
  EntityType,
  EntityRef,
  EntitySearchQuery,
  VoiceDbHealth,
  VoiceEntity,
  VoiceEntityRepository,
  VoiceMigrationDatabase,
} from "@/types";
import {
  importDatabaseFromAssetAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import {
  doubleMetaphoneCodes,
  normalizeVoiceText,
  voiceTrigrams,
} from "./normalize";
import { buildFtsMatch } from "./matching/fts-query";
import { phoneticCodeScore } from "./matching/phonetic";
import { mergeCandidates } from "./matching/candidate-merge";
import {
  BIAS_SOURCE_SCORES,
  rankBiasTerms,
} from "./recognition-dictionary";

const DATABASE_NAME = "hear-voice-v7.db";
export const VOICE_SCHEMA_VERSION = 7;
const MAX_CACHE = 48;
const MAX_BUSY_RETRIES = 3;
const BUSY_RETRY_DELAY_MS = 200;

let databasePromise: Promise<SQLiteDatabase> | undefined;
let readinessPromise: Promise<boolean> | undefined;

function getVoiceDatabase() {
  if (!databasePromise) {
    databasePromise = openVoiceDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      readinessPromise = undefined;
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
    if ((await schemaVersion(database)) < VOICE_SCHEMA_VERSION) {
      await database.closeAsync();
      await deleteDatabaseFiles();
      await importDatabaseFromAssetAsync(DATABASE_NAME, {
        assetId: appAssets.database.voiceSeed,
      });
      database = await openDatabaseAsync(DATABASE_NAME);
      await configureDatabase(database);
    }
  } catch (error) {
    if (!isBusyError(error)) throw error;
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

async function schemaVersion(database: SQLiteDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  return row?.user_version ?? 0;
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

export async function migrateVoiceDatabase(
  database: VoiceMigrationDatabase,
) {
  const row = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((row?.user_version ?? 0) >= VOICE_SCHEMA_VERSION) return;
  await database.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      DROP TABLE IF EXISTS voice_terms;
      DROP TABLE IF EXISTS voice_terms_fts;
      DROP TABLE IF EXISTS term_trigrams;
      DROP TABLE IF EXISTS voice_actions;
      DROP TABLE IF EXISTS intent_patterns;
      DROP TABLE IF EXISTS asr_substitutions;
      DROP TABLE IF EXISTS learned_aliases;

      CREATE TABLE IF NOT EXISTS voice_entities (
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        primary_metaphone TEXT,
        secondary_metaphone TEXT,
        popularity REAL NOT NULL DEFAULT 0,
        metadata_json TEXT,
        revision TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (entity_type, entity_id)
      );
      CREATE INDEX IF NOT EXISTS idx_voice_entity_normalized ON voice_entities(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_voice_entity_primary_metaphone ON voice_entities(primary_metaphone);
      CREATE INDEX IF NOT EXISTS idx_voice_entity_secondary_metaphone ON voice_entities(secondary_metaphone);

      CREATE TABLE IF NOT EXISTS voice_aliases (
        alias_id INTEGER PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        alias TEXT NOT NULL,
        normalized_alias TEXT NOT NULL,
        primary_metaphone TEXT,
        secondary_metaphone TEXT,
        alias_source TEXT,
        weight REAL NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_voice_alias_normalized ON voice_aliases(normalized_alias);
      CREATE INDEX IF NOT EXISTS idx_voice_alias_primary_metaphone ON voice_aliases(primary_metaphone);
      CREATE INDEX IF NOT EXISTS idx_voice_alias_secondary_metaphone ON voice_aliases(secondary_metaphone);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_alias_entity_norm ON voice_aliases(entity_type, entity_id, normalized_alias);

      CREATE VIRTUAL TABLE IF NOT EXISTS voice_entity_fts USING fts5(
        entity_key UNINDEXED,
        entity_type UNINDEXED,
        search_text,
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TABLE IF NOT EXISTS voice_entity_trigrams (
        entity_key TEXT NOT NULL,
        trigram TEXT NOT NULL,
        PRIMARY KEY (entity_key, trigram)
      );
      CREATE INDEX IF NOT EXISTS idx_voice_entity_trigram ON voice_entity_trigrams(trigram);

      CREATE TABLE IF NOT EXISTS voice_token_rarity (
        token TEXT PRIMARY KEY,
        rarity REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        normalized TEXT NOT NULL,
        admin_area TEXT,
        latitude REAL,
        longitude REAL,
        population INTEGER,
        rank REAL NOT NULL DEFAULT 1,
        timezone TEXT
      );
      CREATE INDEX IF NOT EXISTS locations_name ON locations(normalized);

      CREATE TABLE IF NOT EXISTS voice_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS action_usage (action_id TEXT PRIMARY KEY, executions INTEGER NOT NULL DEFAULT 0, last_used_at INTEGER NOT NULL DEFAULT 0);

      PRAGMA user_version = ${VOICE_SCHEMA_VERSION};
    `);
  });
}

type CandidateRow = {
  entityId: string;
  entityType: EntityType;
  canonicalName: string;
  matchedAlias?: string | null;
  popularity: number;
  metadataJson?: string | null;
  primaryMetaphone?: string | null;
  secondaryMetaphone?: string | null;
};

function toCandidate(
  row: CandidateRow,
  method: EntityCandidate["matchMethod"],
  scores: Partial<EntityCandidate["scores"]>,
): EntityCandidate {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadataJson) {
    try {
      metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
    } catch {}
  }
  return {
    entityId: row.entityId,
    entityType: row.entityType,
    canonicalName: row.canonicalName,
    matchedAlias: row.matchedAlias ?? undefined,
    matchMethod: method,
    popularity: Number(row.popularity) || 0,
    metadata,
    scores: {
      exact: 0,
      fts: 0,
      trigram: 0,
      phonetic: 0,
      context: 0,
      popularity: 0,
      final: 0,
      ...scores,
    },
  };
}

class SQLiteVoiceRepository implements VoiceEntityRepository {
  private initialization?: Promise<void>;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, EntityCandidate[]>();

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

  initialize() {
    this.initialization ??= this.initializeOnce();
    return this.initialization;
  }

  private async initializeOnce() {
    const database = await getVoiceDatabase();
    const integrity = await database.getFirstAsync<{ integrity_check: string }>(
      "PRAGMA integrity_check",
    );
    if (integrity?.integrity_check !== "ok") {
      await database.closeAsync();
      databasePromise = undefined;
      await deleteDatabaseFiles();
      await getVoiceDatabase();
    }
  }

  async isReady(): Promise<boolean> {
    try {
      readinessPromise ??= this.healthCheck().then((health) => health.ready);
      return await readinessPromise;
    } catch {
      return false;
    }
  }

  async searchEntities(
    query: EntitySearchQuery,
  ): Promise<EntityCandidate[]> {
    await this.initialize();
    const normalized = query.normalizedText || normalizeVoiceText(query.text);
    const cacheKey = `${normalized}:${(query.expectedTypes ?? []).join(",")}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const database = await getVoiceDatabase();

    const results: EntityCandidate[] = [];

    const exactRows = await database.getAllAsync<CandidateRow>(
      `SELECT e.entity_id AS entityId, e.entity_type AS entityType,
              e.canonical_name AS canonicalName, a.normalized_alias AS matchedAlias,
              e.popularity, e.metadata_json AS metadataJson
       FROM voice_aliases a
       JOIN voice_entities e ON e.entity_id = a.entity_id AND e.entity_type = a.entity_type
       WHERE a.normalized_alias = ?
       ORDER BY a.weight DESC, e.popularity DESC
       LIMIT ?`,
      normalized,
      query.limit || 8,
    );
    const exactCanonical = await database.getAllAsync<CandidateRow>(
      `SELECT entity_id AS entityId, entity_type AS entityType,
              canonical_name AS canonicalName, NULL AS matchedAlias,
              popularity, metadata_json AS metadataJson
       FROM voice_entities
       WHERE normalized_name = ?
       LIMIT ?`,
      normalized,
      4,
    );
    for (const row of [...exactRows, ...exactCanonical]) {
      results.push(toCandidate(row, "exact", { exact: 1 }));
    }

    const match = buildFtsMatch(normalized);
    if (match) {
      const ftsRows = await database.getAllAsync<CandidateRow>(
        `SELECT e.entity_id AS entityId, e.entity_type AS entityType,
                e.canonical_name AS canonicalName, f.search_text AS matchedAlias,
                e.popularity, e.metadata_json AS metadataJson
         FROM voice_entity_fts f
         JOIN voice_entities e ON e.entity_type || ':' || e.entity_id = f.entity_key
         WHERE voice_entity_fts MATCH ?
         ORDER BY bm25(voice_entity_fts)
         LIMIT ?`,
        match,
        query.limit || 20,
      );
      ftsRows.forEach((row, rank) => {
        const fts = Math.max(0, 1 - rank / Math.max(ftsRows.length, 1));
        results.push(toCandidate(row, "fts", { fts }));
      });
    }

    const grams = voiceTrigrams(normalized).slice(0, 32);
    if (grams.length) {
      const placeholders = grams.map(() => "?").join(",");
      const trigramRows = await database.getAllAsync<CandidateRow & { matched: number }>(
        `SELECT e.entity_id AS entityId, e.entity_type AS entityType,
                e.canonical_name AS canonicalName, NULL AS matchedAlias,
                e.popularity, e.metadata_json AS metadataJson,
                COUNT(*) AS matched
         FROM voice_entity_trigrams g
         JOIN voice_entities e ON e.entity_type || ':' || e.entity_id = g.entity_key
         WHERE g.trigram IN (${placeholders})
         GROUP BY g.entity_key
         ORDER BY matched DESC, e.popularity DESC
         LIMIT ?`,
        ...grams,
        query.limit || 20,
      );
      for (const row of trigramRows) {
        results.push(
          toCandidate(row, "trigram", {
            trigram: Math.min(1, Number(row.matched) / grams.length),
          }),
        );
      }
    }

    const codes = doubleMetaphoneCodes(normalized);
    const phoneticRows = await database.getAllAsync<CandidateRow>(
      `SELECT e.entity_id AS entityId, e.entity_type AS entityType,
              e.canonical_name AS canonicalName, NULL AS matchedAlias,
              e.popularity, e.metadata_json AS metadataJson,
              e.primary_metaphone AS primaryMetaphone,
              e.secondary_metaphone AS secondaryMetaphone
       FROM voice_entities e
       WHERE e.primary_metaphone IN (?, ?) OR e.secondary_metaphone IN (?, ?)
       ORDER BY e.popularity DESC
       LIMIT ?`,
      codes.primary,
      codes.secondary,
      codes.primary,
      codes.secondary,
      query.limit || 20,
    );
    const aliasPhoneticRows = await database.getAllAsync<CandidateRow>(
      `SELECT e.entity_id AS entityId, e.entity_type AS entityType,
              e.canonical_name AS canonicalName, a.normalized_alias AS matchedAlias,
              e.popularity, e.metadata_json AS metadataJson,
              a.primary_metaphone AS primaryMetaphone,
              a.secondary_metaphone AS secondaryMetaphone
       FROM voice_aliases a
       JOIN voice_entities e ON e.entity_id = a.entity_id AND e.entity_type = a.entity_type
       WHERE a.primary_metaphone IN (?, ?) OR a.secondary_metaphone IN (?, ?)
       ORDER BY a.weight DESC, e.popularity DESC
       LIMIT ?`,
      codes.primary,
      codes.secondary,
      codes.primary,
      codes.secondary,
      query.limit || 20,
    );
    for (const row of [...phoneticRows, ...aliasPhoneticRows]) {
      const phonetic = phoneticCodeScore(
        codes,
        row.primaryMetaphone,
        row.secondaryMetaphone,
      );
      if (phonetic > 0) {
        results.push(toCandidate(row, "phonetic", { phonetic }));
      }
    }

    const merged = mergeCandidates(results);
    this.cache.set(cacheKey, merged);
    if (this.cache.size > MAX_CACHE)
      this.cache.delete(this.cache.keys().next().value ?? "");
    return merged;
  }

  async getEntity(type: EntityType, id: string): Promise<VoiceEntity | null> {
    await this.initialize();
    const database = await getVoiceDatabase();
    const row = await database.getFirstAsync<CandidateRow & { revision: string }>(
      `SELECT entity_id AS entityId, entity_type AS entityType,
              canonical_name AS canonicalName, normalized_name AS normalizedName,
              primary_metaphone AS primaryMetaphone, secondary_metaphone AS secondaryMetaphone,
              popularity, metadata_json AS metadataJson, revision
       FROM voice_entities WHERE entity_type = ? AND entity_id = ?`,
      type,
      id,
    );
    if (!row) return null;
    let metadata: Record<string, unknown> | undefined;
    if (row.metadataJson) {
      try {
        metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
      } catch {}
    }
    return {
      entityId: row.entityId,
      entityType: row.entityType,
      canonicalName: row.canonicalName,
      normalizedName: "",
      primaryMetaphone: row.primaryMetaphone ?? null,
      secondaryMetaphone: row.secondaryMetaphone ?? null,
      popularity: Number(row.popularity) || 0,
      metadata,
      revision: row.revision ?? "",
    };
  }

  async getEntitiesByIds(refs: EntityRef[]): Promise<VoiceEntity[]> {
    if (!refs.length) return [];
    const database = await getVoiceDatabase();
    const conditions = refs.map(() => "(entity_type = ? AND entity_id = ?)").join(" OR ");
    const params: string[] = refs.flatMap((ref) => [ref.type, ref.id]);
    const rows = await database.getAllAsync<CandidateRow & { revision: string; normalizedName: string }>(
      `SELECT entity_id AS entityId, entity_type AS entityType,
              canonical_name AS canonicalName, normalized_name AS normalizedName,
              primary_metaphone AS primaryMetaphone, secondary_metaphone AS secondaryMetaphone,
              popularity, metadata_json AS metadataJson, revision
       FROM voice_entities WHERE ${conditions}`,
      ...params,
    );
    return rows.map((row) => {
      let metadata: Record<string, unknown> | undefined;
      if (row.metadataJson) {
        try {
          metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
        } catch {}
      }
      return {
        entityId: row.entityId,
        entityType: row.entityType,
        canonicalName: row.canonicalName,
        normalizedName: row.normalizedName,
        primaryMetaphone: row.primaryMetaphone ?? null,
        secondaryMetaphone: row.secondaryMetaphone ?? null,
        popularity: Number(row.popularity) || 0,
        metadata,
        revision: row.revision ?? "",
      };
    });
  }

  async getRevision(): Promise<string> {
    await this.initialize();
    const database = await getVoiceDatabase();
    const row = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM voice_metadata WHERE key = 'content_revision'",
    );
    return row?.value ?? "";
  }

  async getTokenRarity(tokens: string[]): Promise<Record<string, number>> {
    await this.initialize();
    const database = await getVoiceDatabase();
    const unique = [...new Set(tokens)];
    if (!unique.length) return {};
    const placeholders = unique.map(() => "?").join(",");
    const rows = await database.getAllAsync<{ token: string; rarity: number }>(
      `SELECT token, rarity FROM voice_token_rarity WHERE token IN (${placeholders})`,
      ...unique,
    );
    return Object.fromEntries(rows.map((row) => [row.token, row.rarity]));
  }

  async getContextualTerms(limit = 80): Promise<string[]> {
    await this.initialize();
    const database = await getVoiceDatabase();
    const rows = await database.getAllAsync<{ canonicalName: string }>(
      "SELECT canonical_name AS canonicalName FROM voice_entities ORDER BY popularity DESC LIMIT ?",
      limit,
    );
    return [...new Set(rows.map((row) => row.canonicalName))];
  }

  async getRecognitionBiasTerms(input: {
    screenId: string;
    activeEntityIds?: string[];
    visibleEntityIds?: string[];
    recentEntityIds?: string[];
    limit: number;
  }): Promise<string[]> {
    await this.initialize();
    const database = await getVoiceDatabase();
    const popularRows = await database.getAllAsync<{ canonicalName: string }>(
      "SELECT canonical_name AS canonicalName FROM voice_entities ORDER BY popularity DESC LIMIT 60",
    );
    const inputs: BiasTermInput[] = popularRows.map((row) => ({
      term: row.canonicalName,
      source: "popular" as const,
    }));
    const idBuckets: [string[] | undefined, BiasTermInput["source"]][] = [
      [input.activeEntityIds, "active-entity"],
      [input.visibleEntityIds, "visible-result"],
      [input.recentEntityIds, "recently-played"],
    ];
    const uniqueIds = [
      ...new Set(idBuckets.flatMap(([ids]) => ids ?? [])),
    ];
    const byId = new Map<string, BiasTermInput["source"]>();
    for (const [ids, source] of idBuckets) {
      for (const id of ids ?? []) {
        const existing = byId.get(id);
        if (!existing || BIAS_SOURCE_SCORES[source] > BIAS_SOURCE_SCORES[existing]) {
          byId.set(id, source);
        }
      }
    }
    if (uniqueIds.length) {
      const refs = uniqueIds.map((id) => {
        const separator = id.indexOf(":");
        const hasExplicitType = separator > 0;
        return hasExplicitType
          ? { type: id.slice(0, separator) as EntityType, id: id.slice(separator + 1) }
          : undefined;
      });
      const typed = refs.filter(
        (ref): ref is { type: EntityType; id: string } => !!ref,
      );
      if (typed.length) {
        const entities = await this.getEntitiesByIds(typed);
        for (const entity of entities) {
          const source = byId.get(`${entity.entityType}:${entity.entityId}`) ?? byId.get(entity.entityId);
          if (source) {
            inputs.push({ term: entity.canonicalName, source });
          }
        }
      }
    }
    return rankBiasTerms(inputs, input.limit);
  }

  async learnAlias(
    alias: string,
    canonical: string,
    type: EntityType,
    entityId: string,
  ): Promise<void> {
    await this.initialize();
    const db = await getVoiceDatabase();
    const normalized = normalizeVoiceText(alias);
    const codes = doubleMetaphoneCodes(normalized);
    const entityKey = `${type}:${entityId}`;
    await this.enqueueWrite(() =>
      this.withRetry(async () => {
        await db.execAsync("BEGIN IMMEDIATE");
        try {
          await db.runAsync(
            `INSERT OR IGNORE INTO voice_entities
               (entity_id, entity_type, canonical_name, normalized_name, primary_metaphone, secondary_metaphone, popularity, revision)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
            entityId,
            type,
            canonical,
            normalizeVoiceText(canonical),
            doubleMetaphoneCodes(normalizeVoiceText(canonical)).primary,
            doubleMetaphoneCodes(normalizeVoiceText(canonical)).secondary,
            await this.getRevision(),
          );
          await db.runAsync(
            `INSERT INTO voice_aliases
               (entity_id, entity_type, alias, normalized_alias, primary_metaphone, secondary_metaphone, alias_source, weight)
             VALUES (?, ?, ?, ?, ?, ?, 'learned', 1)
             ON CONFLICT(entity_type, entity_id, normalized_alias)
             DO UPDATE SET weight = MIN(4, voice_aliases.weight + 0.5)`,
            entityId,
            type,
            alias,
            normalized,
            codes.primary,
            codes.secondary,
          );
          const aliasRow = await db.getFirstAsync<{ aliasId: number }>(
            "SELECT alias_id AS aliasId FROM voice_aliases WHERE entity_type = ? AND entity_id = ? AND normalized_alias = ?",
            type,
            entityId,
            normalized,
          );
          if (aliasRow) {
            await db.runAsync(
              "INSERT OR REPLACE INTO voice_entity_fts(rowid, entity_key, entity_type, search_text) VALUES (?, ?, ?, ?)",
              aliasRow.aliasId,
              entityKey,
              type,
              normalized,
            );
            for (const gram of voiceTrigrams(normalized)) {
              await db.runAsync(
                "INSERT OR IGNORE INTO voice_entity_trigrams(entity_key, trigram) VALUES (?, ?)",
                entityKey,
                gram,
              );
            }
          }
          await db.execAsync("COMMIT");
        } catch (error) {
          try {
            await db.execAsync("ROLLBACK");
          } catch {}
          throw error;
        }
      }),
    );
    this.cache.clear();
  }

  async resetLearnedAliases(): Promise<void> {
    const db = await getVoiceDatabase();
    await this.enqueueWrite(() =>
      this.withRetry(async () => {
        await db.execAsync("BEGIN IMMEDIATE");
        try {
          await db.execAsync(
            "DELETE FROM voice_entity_fts WHERE rowid IN (SELECT alias_id FROM voice_aliases WHERE alias_source = 'learned'); DELETE FROM voice_aliases WHERE alias_source = 'learned';",
          );
          await db.execAsync("COMMIT");
        } catch (error) {
          try {
            await db.execAsync("ROLLBACK");
          } catch {}
          throw error;
        }
      }),
    );
    this.cache.clear();
  }

  async healthCheck(): Promise<VoiceDbHealth> {
    const db = await getVoiceDatabase();
    const integrity = await db.getFirstAsync<{ integrity_check: string }>(
      "PRAGMA integrity_check",
    );
    const version = await schemaVersion(db);
    const revisionRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM voice_metadata WHERE key = 'content_revision'",
    );
    const entityCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM voice_entities",
    );
    const aliasCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM voice_aliases",
    );
    const ftsCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM voice_entity_fts",
    );
    const phoneticCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM voice_entities WHERE primary_metaphone IS NOT NULL AND primary_metaphone != ''",
    );
    const ready =
      integrity?.integrity_check === "ok" &&
      version === VOICE_SCHEMA_VERSION &&
      (entityCount?.count ?? 0) > 0;
    return {
      ready,
      schemaVersion: version,
      contentRevision: revisionRow?.value ?? null,
      entityCount: entityCount?.count ?? 0,
      aliasCount: aliasCount?.count ?? 0,
      ftsReady: (ftsCount?.count ?? 0) > 0,
      phoneticReady: (phoneticCount?.count ?? 0) > 0,
      lastError: ready ? undefined : "voice database unavailable",
    };
  }
}

export const voiceTermRepository: VoiceEntityRepository =
  new SQLiteVoiceRepository();
