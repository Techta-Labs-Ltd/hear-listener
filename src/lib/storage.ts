import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const safeAsyncStorage: StateStorage =
  typeof window === "undefined" ? noopStorage : (AsyncStorage as StateStorage);
