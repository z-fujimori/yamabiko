// src/store/uiStore.ts
import { create } from "zustand";

type ModalType =
  | { type: "settings" }
  | { type: "import" }
  | { type: "help" }
  | null;

type UIState = {
  activeModal: ModalType;
  openSettings: () => void;
  openImport: () => void;
  openHelp: () => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,

  openSettings: () =>
    set({ activeModal: { type: "settings" } }),

  openImport: () =>
    set({ activeModal: { type: "import" } }),

  openHelp: () =>
    set({ activeModal: { type: "help" } }),

  closeModal: () =>
    set({ activeModal: null }),
}));
