export const GoogleOneTapSignIn = {
  configure() {},
  async checkPlayServices() {},
  async signIn() {
    throw new Error("Google sign-in requires a rebuilt Hear! development client.");
  },
  async createAccount() {
    throw new Error("Google sign-in requires a rebuilt Hear! development client.");
  },
  async presentExplicitSignIn() {
    throw new Error("Google sign-in requires a rebuilt Hear! development client.");
  },
  async signOut() {},
};

export const statusCodes = {};
export function isSuccessResponse() { return false; }
export function isCancelledResponse() { return false; }
export function isErrorWithCode() { return false; }
export function isNoSavedCredentialFoundResponse() { return false; }
