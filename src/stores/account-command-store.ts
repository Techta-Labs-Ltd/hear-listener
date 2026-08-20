import { create } from "zustand";
import type { AccountCommand, AccountCommandStore } from "@/types";

let commandId = 0;
export const useAccountCommandStore = create<AccountCommandStore>((set) => ({
  dispatch: (command) => set({ event: { id: ++commandId, command } }),
}));

export const accountVoiceBridge = {
  dispatch: (command: AccountCommand) =>
    useAccountCommandStore.getState().dispatch(command),
};
