import type { SQLiteDatabase } from "expo-sqlite";
import type { EntityType } from "./voice-entities";

export type VoiceMigrationTransaction = Pick<
  SQLiteDatabase,
  "execAsync" | "getAllAsync"
>;

export type VoiceMigrationDatabase = Pick<SQLiteDatabase, "getFirstAsync"> & {
  withExclusiveTransactionAsync(
    task: (transaction: VoiceMigrationTransaction) => Promise<void>,
  ): Promise<void>;
};

export type VoiceCandidateRow = {
  entityId: string;
  entityType: EntityType;
  canonicalName: string;
  matchedAlias?: string | null;
  popularity: number;
  metadataJson?: string | null;
  primaryMetaphone?: string | null;
  secondaryMetaphone?: string | null;
};
