import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import {
  GoogleOneTapSignIn,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "react-native-nitro-google-signin";
import type { AccountProfile, AccountProvider } from "@/types";

const ACCOUNT_KEY = "hear-account-provider-user";
let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error("Google sign-in is not configured for this build.");
  }
  GoogleOneTapSignIn.configure({ webClientId, autoSelectOnSignIn: false });
  googleConfigured = true;
}

async function signInWithGoogle(): Promise<AccountProfile | undefined> {
  configureGoogle();
  await GoogleOneTapSignIn.checkPlayServices();
  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (!isSuccessResponse(response)) return undefined;
  const { user } = response.data;
  await SecureStore.setItemAsync(ACCOUNT_KEY, `google:${user.id}`);
  return {
    provider: "google",
    providerUserId: user.id,
    displayName: user.name ?? undefined,
    email: user.email ?? undefined,
  };
}

async function signInWithApple(): Promise<AccountProfile | undefined> {
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error("Apple sign-in is unavailable on this device.");
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const displayName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName)
    : undefined;
  await SecureStore.setItemAsync(ACCOUNT_KEY, `apple:${credential.user}`);
  return {
    provider: "apple",
    providerUserId: credential.user,
    displayName: displayName || undefined,
    email: credential.email ?? undefined,
  };
}

export const accountService = {
  providerForPlatform(): AccountProvider {
    return Platform.OS === "ios" ? "apple" : "google";
  },
  signIn(provider: AccountProvider) {
    return provider === "apple" ? signInWithApple() : signInWithGoogle();
  },
  async signOut(provider?: AccountProvider) {
    if (provider === "google") {
      try {
        configureGoogle();
        await GoogleOneTapSignIn.signOut();
      } catch {}
    }
    await SecureStore.deleteItemAsync(ACCOUNT_KEY);
  },
};
