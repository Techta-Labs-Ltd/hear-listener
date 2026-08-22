import { getFirebaseAuth, getFirebaseApp } from "@/config";
import { accountService } from "@/services/account-service";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn().mockReturnValue({ name: "[DEFAULT]" }),
  getApps: jest.fn().mockReturnValue([{ name: "[DEFAULT]" }]),
}));

jest.mock("firebase/auth", () => ({
  initializeAuth: jest.fn().mockReturnValue({
    currentUser: null,
  }),
  getAuth: jest.fn().mockReturnValue({
    currentUser: null,
  }),
  getReactNativePersistence: jest.fn(),
  signInWithCredential: jest.fn().mockResolvedValue({
    user: {
      uid: "firebase-user-123",
      displayName: "Demo User",
      email: "demo@example.com",
    },
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: {
    credential: jest.fn().mockReturnValue({ providerId: "google.com" }),
  },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn().mockReturnValue({ providerId: "apple.com" }),
  })),
  onAuthStateChanged: jest.fn().mockImplementation((_auth, cb) => {
    cb(null);
    return jest.fn();
  }),
}));

describe("Firebase Auth integration", () => {
  it("initializes Firebase App and Auth singleton instances", () => {
    const app = getFirebaseApp();
    expect(app).toBeDefined();
    const auth = getFirebaseAuth();
    expect(auth).toBeDefined();
  });

  it("returns platform default provider correctly", () => {
    const provider = accountService.providerForPlatform();
    expect(["apple", "google"]).toContain(provider);
  });

  it("handles sign out without errors", async () => {
    await expect(accountService.signOut("google")).resolves.not.toThrow();
  });
});
