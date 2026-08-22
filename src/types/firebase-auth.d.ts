import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  export interface ReactNativeAsyncStorage {
    getItem(key: string, ...args: Array<unknown>): Promise<string | null>;
    setItem(key: string, value: string, ...args: Array<unknown>): Promise<unknown>;
    removeItem(key: string, ...args: Array<unknown>): Promise<unknown>;
  }

  /**
   * Returns a persistence implementation for React Native using AsyncStorage.
   */
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage,
  ): Persistence;
}
