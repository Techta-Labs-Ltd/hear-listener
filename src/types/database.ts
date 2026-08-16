import type { VoiceCandidate, VoiceCandidateKind } from "./voice";
import type { SQLiteDatabase } from "expo-sqlite";

export type VoiceMigrationTransaction = Pick<
  SQLiteDatabase,
  "execAsync" | "getAllAsync"
>;

export type VoiceMigrationDatabase = Pick<SQLiteDatabase, "getFirstAsync"> & {
  withExclusiveTransactionAsync(
    task: (transaction: VoiceMigrationTransaction) => Promise<void>,
  ): Promise<void>;
};
export type VoiceVocabularyTerm = {
  canonical: string;
  normalized: string;
  kind: VoiceCandidateKind;
  targetId?: string;
  weight: number;
};
export type VoiceDatabaseHealth = {
  healthy: boolean;
  schemaVersion: number;
  vocabularyVersion: string;
  integrity: string;
};
export interface VoiceTermRepository {
  initialize(): Promise<void>;
  search(
    normalizedQuery: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<VoiceCandidate[]>;
  learnAlias(
    alias: string,
    canonical: string,
    kind: VoiceCandidateKind,
    targetId?: string,
  ): Promise<void>;
  resetLearnedAliases?(): Promise<void>;
  getVersion?(): Promise<number>;
  healthCheck?(): Promise<VoiceDatabaseHealth>;
  getContextualTerms?(limit?: number): Promise<string[]>;
}
