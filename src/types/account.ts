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
