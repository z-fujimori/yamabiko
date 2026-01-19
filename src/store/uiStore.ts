// src/store/uiStore.ts
import { create } from "zustand";

type ModalType =
  | { type: "swipe" }
  | { type: "import" }
  | { type: "help" }
  | null;

type UIState = {
  activeModal: ModalType;
  openSwipe: () => void;
  openImport: () => void;
  openHelp: () => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,

  openSwipe: () =>
    set({ activeModal: { type: "swipe" } }),

  openImport: () =>
    set({ activeModal: { type: "import" } }),

  openHelp: () =>
    set({ activeModal: { type: "help" } }),

  closeModal: () =>
    set({ activeModal: null }),
}));
