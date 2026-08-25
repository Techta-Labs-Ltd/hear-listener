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
