import { useEffect } from "react";

type Options = {
  onToggle: () => void;
  onOff?: () => void;
};

export function useAppShortcuts({ onToggle, onOff }: Options) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onToggle();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onOff?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggle, onOff]);
}
