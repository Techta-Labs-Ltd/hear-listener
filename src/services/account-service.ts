import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  signInWithAppleFirebase,
  signInWithGoogleFirebase,
  signOutFirebase,
} from "./firebase/auth";
import type { AccountProfile, AccountProvider } from "@/types";

const ACCOUNT_KEY = "hear-account-provider-user";

export const accountService = {
  providerForPlatform(): AccountProvider {
    return Platform.OS === "ios" ? "apple" : "google";
  },
  async signIn(provider: AccountProvider): Promise<AccountProfile | undefined> {
    const profile =
      provider === "apple"
        ? await signInWithAppleFirebase()
        : await signInWithGoogleFirebase();

    if (profile) {
      try {
        await SecureStore.setItemAsync(
          ACCOUNT_KEY,
          `${profile.provider}:${profile.providerUserId}`,
        );
      } catch {}
    }

    return profile;
  },
  async signOut(provider?: AccountProvider): Promise<void> {
    await signOutFirebase(provider);
    try {
      await SecureStore.deleteItemAsync(ACCOUNT_KEY);
    } catch {}
  },
};
