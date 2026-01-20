import React from "react";
import { HorizontalSlideModal } from "./HorizontalSlideModal";
import { CrayonBgDemo } from "./CrayonBgDemo";

export function SwipePages() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="p-6">
      <button
        className="rounded-xl bg-black px-4 py-2 text-white"
        onClick={() => setOpen(true)}
      >
        Open
      </button>

      <HorizontalSlideModal
        open={open}
        onClose={() => setOpen(false)}
        title="2ページモーダル"
        pages={[
          <CrayonBgDemo text="⚠️ハウリングの可能性があるのでイヤホン推奨" />,
          <CrayonBgDemo text="EnterキーでON/OFF切替可能\n音量と遅延はON時のみ操作可能" />,
        ]}
      />
    </div>
  );
}
