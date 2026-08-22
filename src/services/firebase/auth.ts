import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "react-native-nitro-google-signin";
import { getFirebaseAuth, isFirebaseConfigured } from "@/config";
import type { AccountProfile, AccountProvider } from "@/types";

let googleConfigured = false;

export function configureGoogleSignIn(): boolean {
  if (googleConfigured) return true;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    return false;
  }
  try {
    GoogleOneTapSignIn.configure({
      webClientId,
      autoSelectOnSignIn: false,
    });
    googleConfigured = true;
    return true;
  } catch (error) {
    console.warn("Failed to configure Google Sign-In:", error);
    return false;
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithGoogleFirebase(): Promise<AccountProfile | undefined> {
  const configured = configureGoogleSignIn();
  if (!configured) {
    throw new Error("Google sign-in is not configured for this app build.");
  }

  try {
    await GoogleOneTapSignIn.checkPlayServices();
  } catch (error) {
    console.warn("Google Play Services check failed:", error);
  }

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (!isSuccessResponse(response)) return undefined;

  const { user, idToken } = response.data;

  let firebaseUser: User | undefined;
  if (idToken && isFirebaseConfigured()) {
    try {
      const auth = getFirebaseAuth();
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      firebaseUser = userCredential.user;
    } catch (firebaseError) {
      console.warn("Firebase credential sign-in error with Google idToken:", firebaseError);
    }
  }

  return {
    provider: "google",
    providerUserId: firebaseUser?.uid ?? user.id,
    displayName: firebaseUser?.displayName ?? user.name ?? undefined,
    email: firebaseUser?.email ?? user.email ?? undefined,
  };
}

export async function signInWithAppleFirebase(): Promise<AccountProfile | undefined> {
  const available = await isAppleSignInAvailable();
  if (!available) {
    throw new Error("Apple sign-in is unavailable on this device.");
  }

  const rawNonce = Math.random().toString(36).substring(2, 10);
  const stateNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    state: stateNonce,
  });

  const displayName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName)
    : undefined;

  let firebaseUser: User | undefined;
  if (credential.identityToken && isFirebaseConfigured()) {
    try {
      const auth = getFirebaseAuth();
      const provider = new OAuthProvider("apple.com");
      const oauthCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce,
      });
      const userCredential = await signInWithCredential(auth, oauthCredential);
      firebaseUser = userCredential.user;
    } catch (firebaseError) {
      console.warn("Firebase credential sign-in error with Apple identityToken:", firebaseError);
    }
  }

  return {
    provider: "apple",
    providerUserId: firebaseUser?.uid ?? credential.user,
    displayName: displayName || firebaseUser?.displayName || undefined,
    email: credential.email ?? firebaseUser?.email ?? undefined,
  };
}

export async function signOutFirebase(provider?: AccountProvider): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch (error) {
      console.warn("Firebase signOut warning:", error);
    }
  }

  if (provider === "google" || Platform.OS === "android") {
    try {
      configureGoogleSignIn();
      await GoogleOneTapSignIn.signOut();
    } catch (error) {
      console.warn("Google signOut warning:", error);
    }
  }
}

export function onFirebaseAuthStateChanged(
  callback: (user: User | null) => void,
): Unsubscribe {
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    console.warn("Failed to subscribe to Firebase auth state changes:", error);
    callback(null);
    return () => {};
  }
}
