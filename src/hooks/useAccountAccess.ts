import { useCallback } from "react";
import { accountService } from "@/services/account-service";
import { useAccountStore } from "@/stores";

function accountError(error: unknown): string {
  if (error instanceof Error) {
    if (/cancel/i.test(error.message)) {
      return "Sign-in was cancelled. Try again or continue without an account.";
    }
    return error.message;
  }
  return "Sign-in could not be completed. Try again or continue without an account.";
}

export function useAccountAccess() {
  const account = useAccountStore();
  const provider = accountService.providerForPlatform();
  const signIn = useCallback(async () => {
    account.setStatus("signingIn");
    try {
      const profile = await accountService.signIn(provider);
      if (!profile) {
        account.setStatus("idle");
        return false;
      }
      account.setProfile(profile);
      return true;
    } catch (error) {
      account.setStatus("error", accountError(error));
      return false;
    }
  }, [account, provider]);
  const signOut = useCallback(async () => {
    await accountService.signOut(account.profile?.provider);
    account.clear();
  }, [account]);
  return { ...account, provider, signIn, signOut };
}
