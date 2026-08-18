import { Platform } from "react-native";
import type { AccountProfile, AccountProvider } from "@/types";

const ACCOUNT_KEY = "hear-account-provider-user";
let googleConfigured = false;

async function googleModule() {
  try {
    return await import("react-native-nitro-google-signin");
  } catch {
    throw new Error("Google sign-in requires a rebuilt Hear! development client.");
  }
}

async function secureStore() {
  try {
    return await import("expo-secure-store");
  } catch {
    throw new Error("Secure account storage requires a rebuilt Hear! development client.");
  }
}

async function configureGoogle() {
  const google = await googleModule();
  if (googleConfigured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error("Google sign-in is not configured for this build.");
  }
  google.GoogleOneTapSignIn.configure({ webClientId, autoSelectOnSignIn: false });
  googleConfigured = true;
  return google;
}

async function signInWithGoogle(): Promise<AccountProfile | undefined> {
  const google = (await configureGoogle()) ?? (await googleModule());
  await google.GoogleOneTapSignIn.checkPlayServices();
  let response = await google.GoogleOneTapSignIn.signIn();
  if (google.isNoSavedCredentialFoundResponse(response)) response = await google.GoogleOneTapSignIn.createAccount();
  if (google.isNoSavedCredentialFoundResponse(response)) response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
  if (!google.isSuccessResponse(response)) return undefined;
  const { user } = response.data;
  await (await secureStore()).setItemAsync(ACCOUNT_KEY, `google:${user.id}`);
  return {
    provider: "google",
    providerUserId: user.id,
    displayName: user.name ?? undefined,
    email: user.email ?? undefined,
  };
}

async function signInWithApple(): Promise<AccountProfile | undefined> {
  let apple: typeof import("expo-apple-authentication");
  try {
    apple = await import("expo-apple-authentication");
  } catch {
    throw new Error("Apple sign-in requires a rebuilt Hear! development client.");
  }
  if (!(await apple.isAvailableAsync())) {
    throw new Error("Apple sign-in is unavailable on this device.");
  }
  const credential = await apple.signInAsync({
    requestedScopes: [
      apple.AppleAuthenticationScope.FULL_NAME,
      apple.AppleAuthenticationScope.EMAIL,
    ],
  });
  const displayName = credential.fullName
    ? apple.formatFullName(credential.fullName)
    : undefined;
  await (await secureStore()).setItemAsync(ACCOUNT_KEY, `apple:${credential.user}`);
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
        const google = (await configureGoogle()) ?? (await googleModule());
        await google.GoogleOneTapSignIn.signOut();
      } catch {}
    }
    try {
      await (await secureStore()).deleteItemAsync(ACCOUNT_KEY);
    } catch {}
  },
};
