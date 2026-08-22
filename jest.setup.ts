(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-nitro-google-signin", () => ({
  GoogleOneTapSignIn: {
    configure: jest.fn(),
    checkPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      status: "success",
      data: {
        user: { id: "google-123", name: "Demo User", email: "demo@example.com" },
        idToken: "mock-google-id-token",
      },
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    createAccount: jest.fn(),
    presentExplicitSignIn: jest.fn(),
  },
  isNoSavedCredentialFoundResponse: jest.fn().mockReturnValue(false),
  isSuccessResponse: jest.fn().mockReturnValue(true),
}));

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn().mockResolvedValue({
    user: "apple-123",
    email: "demo@apple.com",
    fullName: { givenName: "Demo", familyName: "User" },
    identityToken: "mock-apple-id-token",
  }),
  formatFullName: jest.fn().mockReturnValue("Demo User"),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

