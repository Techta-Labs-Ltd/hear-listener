import {
  isAppleSignInAvailable,
  onFirebaseAuthStateChanged,
  signInWithAppleFirebase,
  signInWithGoogleFirebase,
  signOutFirebase,
} from "@/services/firebase/auth";
import { useAccountStore } from "@/stores";
import type {
  AccountProfile,
  AccountProvider,
  FirebaseAuthContextValue,
} from "@/types";
import { formatAuthError } from "@/utils/auth-errors";
import * as SecureStore from "expo-secure-store";
import type { User } from "firebase/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

const ACCOUNT_SECURE_STORAGE_KEY = "hear-account-provider-user";

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | undefined>(
  undefined,
);

export function FirebaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(Platform.OS === "ios");
  const accountStore = useAccountStore();

  useEffect(() => {
    let mounted = true;
    void isAppleSignInAvailable().then((available) => {
      if (mounted) {
        setIsAppleAvailable(available);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser && !accountStore.profile) {
        if (accountStore.status === "signedIn") {
          accountStore.clear();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [accountStore]);

  const saveProfileSecurely = useCallback(async (profile: AccountProfile) => {
    try {
      await SecureStore.setItemAsync(
        ACCOUNT_SECURE_STORAGE_KEY,
        `${profile.provider}:${profile.providerUserId}`,
      );
    } catch {
      // SecureStore warning or not supported on this platform
    }
  }, []);

  const clearProfileSecurely = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(ACCOUNT_SECURE_STORAGE_KEY);
    } catch {
      // Ignore cleanup error
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    accountStore.setStatus("signingIn");
    try {
      const profile = await signInWithGoogleFirebase();
      if (!profile) {
        accountStore.setStatus("idle");
        return false;
      }
      accountStore.setProfile(profile);
      await saveProfileSecurely(profile);
      return true;
    } catch (err) {
      accountStore.setStatus("error", formatAuthError(err));
      return false;
    }
  }, [accountStore, saveProfileSecurely]);

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    accountStore.setStatus("signingIn");
    try {
      const profile = await signInWithAppleFirebase();
      if (!profile) {
        accountStore.setStatus("idle");
        return false;
      }
      accountStore.setProfile(profile);
      await saveProfileSecurely(profile);
      return true;
    } catch (err) {
      accountStore.setStatus("error", formatAuthError(err));
      return false;
    }
  }, [accountStore, saveProfileSecurely]);

  const signIn = useCallback(
    async (provider?: AccountProvider): Promise<boolean> => {
      const targetProvider: AccountProvider =
        provider ?? (Platform.OS === "ios" ? "apple" : "google");

      if (targetProvider === "apple") {
        return signInWithApple();
      }
      return signInWithGoogle();
    },
    [signInWithApple, signInWithGoogle],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const currentProvider = accountStore.profile?.provider;
    await signOutFirebase(currentProvider);
    await clearProfileSecurely();
    accountStore.clear();
    setUser(null);
  }, [accountStore, clearProfileSecurely]);

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      user,
      profile: accountStore.profile,
      status: accountStore.status,
      error: accountStore.error,
      isAppleAvailable,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [
      user,
      accountStore.profile,
      accountStore.status,
      accountStore.error,
      isAppleAvailable,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
    ],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
}
