import type { User } from "firebase/auth";

export type AccountProvider = "apple" | "google";

export type AccountProfile = {
  provider: AccountProvider;
  providerUserId: string;
  displayName?: string;
  email?: string;
};

export type AccountStatus = "idle" | "signingIn" | "signedIn" | "error";

export type AccountStore = {
  profile?: AccountProfile;
  status: AccountStatus;
  error?: string;
  setStatus: (status: AccountStatus, error?: string) => void;
  setProfile: (profile: AccountProfile) => void;
  clear: () => void;
};

export type AccountCommand = "signIn" | "signOut";
export type AccountCommandEvent = { id: number; command: AccountCommand };
export type AccountCommandStore = {
  event?: AccountCommandEvent;
  dispatch: (command: AccountCommand) => void;
};

export type FirebaseAuthContextValue = {
  user: User | null;
  profile?: AccountProfile;
  status: AccountStatus;
  error?: string;
  isAppleAvailable: boolean;
  signIn: (provider?: AccountProvider) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  signOut: () => Promise<void>;
};
