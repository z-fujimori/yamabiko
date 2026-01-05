import { useUIStore } from "../store/uiStore";
import HelpModal from "./HelpModal";

export function ModalHost() {
  const modal = useUIStore((s) => s.activeModal);

  if (!modal) return null;

  switch (modal.type) {
    case "help":
      return <HelpModal />;
    case "settings":
      // return <SettingsModal />;
      return null;
    case "import":
      // return <ImportModal />;
      return null;
    default:
      return null;
  }
}
