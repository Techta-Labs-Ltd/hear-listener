import { create } from "zustand";

type AccountCommand = "signIn" | "signOut";
type AccountCommandEvent = { id: number; command: AccountCommand };
type AccountCommandStore = {
  event?: AccountCommandEvent;
  dispatch: (command: AccountCommand) => void;
};

let commandId = 0;
export const useAccountCommandStore = create<AccountCommandStore>((set) => ({
  dispatch: (command) => set({ event: { id: ++commandId, command } }),
}));

export const accountVoiceBridge = {
  dispatch: (command: AccountCommand) =>
    useAccountCommandStore.getState().dispatch(command),
};
