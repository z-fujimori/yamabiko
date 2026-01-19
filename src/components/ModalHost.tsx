import { useUIStore } from "../store/uiStore";
import HelpModal from "./HelpModal";
import { SwipePages } from "./SwipePages";

export function ModalHost() {
  const modal = useUIStore((s) => s.activeModal);

  if (!modal) return null;

  switch (modal.type) {
    case "help":
      return <HelpModal />;
    case "swipe":
      return <SwipePages />;
      return null;
    case "import":
      // return <ImportModal />;
      return null;
    default:
      return null;
  }
}
