import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { Platform } from "react-native";

export function getFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let firebaseAppInstance: FirebaseApp | undefined;
let firebaseAuthInstance: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseAppInstance) {
    const existing = getApps();
    if (existing.length > 0 && existing[0]) {
      firebaseAppInstance = existing[0];
    } else {
      firebaseAppInstance = initializeApp(getFirebaseConfig());
    }
  }
  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuthInstance) {
    const app = getFirebaseApp();
    try {
      if (Platform.OS !== "web") {
        firebaseAuthInstance = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } else {
        firebaseAuthInstance = getAuth(app);
      }
    } catch {
      firebaseAuthInstance = getAuth(app);
    }
  }
  return firebaseAuthInstance;
}

export function resetFirebaseInstancesForTesting(): void {
  firebaseAppInstance = undefined;
  firebaseAuthInstance = undefined;
}
