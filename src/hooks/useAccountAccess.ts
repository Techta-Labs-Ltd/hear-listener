import { useCallback } from "react";
import { accountService } from "@/services/account-service";
import { useAccountStore } from "@/stores";
import type { AccountProvider } from "@/types";
import { formatAuthError } from "@/utils/auth-errors";

export function useAccountAccess() {
  const account = useAccountStore();
  const platformProvider = accountService.providerForPlatform();

  const signIn = useCallback(
    async (provider?: AccountProvider) => {
      account.setStatus("signingIn");
      try {
        const profile = await accountService.signIn(
          provider ?? platformProvider,
        );
        if (!profile) {
          account.setStatus("idle");
          return false;
        }
        account.setProfile(profile);
        return true;
      } catch (error) {
        account.setStatus("error", formatAuthError(error));
        return false;
      }
    },
    [account, platformProvider],
  );

  const signOut = useCallback(async () => {
    await accountService.signOut(account.profile?.provider);
    account.clear();
  }, [account]);

  return { ...account, provider: platformProvider, signIn, signOut };
}
