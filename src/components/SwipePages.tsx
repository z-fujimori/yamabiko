import { HorizontalSlideModal } from "./HorizontalSlideModal";
import { CrayonBgDemo } from "./CrayonBgDemo";
import { useUIStore } from "../store/uiStore";

export function SwipePages() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const open = activeModal?.type === "help" || activeModal?.type === "swipe";

  return (
    <HorizontalSlideModal
      open={open}
      onClose={closeModal}
      title="ヘルプ"
      pages={[
        <CrayonBgDemo text={["⚠️ハウリングの可能性があるのでイヤホン推奨"]} />,
        <CrayonBgDemo text={["EnterキーでON/OFF切替可能", "音量と遅延はON時のみ操作可能"]} />,
      ]}
    />
  );
}
