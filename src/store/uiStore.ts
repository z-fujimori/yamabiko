// src/store/uiStore.ts
import { create } from "zustand";

type ModalType =
  | { type: "settings" }
  | { type: "import" }
  | null;

type UIState = {
  activeModal: ModalType;
  openSettings: () => void;
  openImport: () => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,

  openSettings: () =>
    set({ activeModal: { type: "settings" } }),

  openImport: () =>
    set({ activeModal: { type: "import" } }),

  closeModal: () =>
    set({ activeModal: null }),
}));
