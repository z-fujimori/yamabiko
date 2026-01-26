import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { Pin, PinOff } from 'lucide-react';

export function WindowPinButton() {
  const [pinned, setPinned] = useState(false);

  async function togglePin() {
    const next = !pinned;
    setPinned(next);

    await invoke("set_always_on_top", {
      on: next,
    });
  }

  return (
    <button
        onClick={togglePin}
        className="
            fixed top-2 right-3
            w-7 h-7
            rounded-full
            border-2 border-gray-400
            text-sm font-semibold
            text-gray-400
            shadow-sm
            hover:bg-gray-100
            hover:border-gray-100
            hover:text-gray-700
            active:scale-95
            transition
            flex items-center justify-center
        "
    >
        {pinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
    </button>
  );
}
