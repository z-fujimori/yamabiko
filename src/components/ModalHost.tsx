import { useUIStore } from "../store/uiStore";
import HelpModal from "./HelpModal";
import { SwipePages } from "./SwipePages";

export function ModalHost() {
  const modal = useUIStore((s) => s.activeModal);

  if (!modal) return null;

  switch (modal.type) {
    case "help":
      return <SwipePages />;
    case "swipe":
      return <SwipePages />;
    case "import":
      // return <ImportModal />;
      return null;
    default:
      return null;
  }
}
