import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccountStore } from "@/types";

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      status: "idle",
      setStatus: (status, error) => set({ status, error }),
      setProfile: (profile) => set({ profile, status: "signedIn", error: undefined }),
      clear: () => set({ profile: undefined, status: "idle", error: undefined }),
    }),
    {
      name: "hear-account-profile",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ profile }) => ({ profile }),
    },
  ),
);
