import { useUIStore } from "../store/uiStore";

export function ModalHost() {
  const modal = useUIStore(s => s.activeModal);

  if (!modal) return null;

//   switch (modal.type) {
//     case "settings":
//       return <SettingsModal />;
//     case "import":
//       return <ImportModal />;
//     default:
//       return null;
//   }
}
