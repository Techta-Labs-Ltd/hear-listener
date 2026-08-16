import { useEffect, useRef } from "react";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { speechCoordinator } from "@/lib/voice/speech-coordinator";
import { useAccountCommandStore } from "@/stores/account-command-store";
import { useVoice } from "@/hooks/useVoice";

export function AccountRuntime() {
  const account = useAccountAccess();
  const voice = useVoice();
  const handled = useRef(0);

  useEffect(() => useAccountCommandStore.subscribe((state) => {
    const event = state.event;
    if (!event || event.id === handled.current) return;
    handled.current = event.id;
    if (event.command === "signIn") {
      void account.signIn().then((signedIn) => {
        voice.close();
        if (signedIn) {
          void speechCoordinator.announce({
            key: `account:signed-in:${event.id}`,
            text: "Account connected.",
            priority: "session",
          });
        }
      });
      return;
    }
    void account.signOut().then(() => {
      voice.close();
      void speechCoordinator.announce({
        key: `account:signed-out:${event.id}`,
        text: "You are signed out.",
        priority: "session",
      });
    });
  }), [account, voice]);

  return null;
}
