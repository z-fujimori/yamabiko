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
        <CrayonBgDemo text={["マイクの音をイヤホンやスピーカーへ", "中央のボタンでON/OFFを切り替え", "初回はマイクの使用を許可してください"]} />,
        <CrayonBgDemo text={["ハウリング防止にはイヤホン推奨", "大きな音が鳴ったら、すぐOFFに", "スピーカー使用時は音量を控えめに"]} />,
        <CrayonBgDemo text={["Volume：出力音量（0〜150%）", "Delay：音が出るまでの遅延（0〜2秒）", "OFFの間も調整でき、ONにすると反映"]} />,
        <CrayonBgDemo text={["Enter / SpaceキーでもON/OFF切替", "右上のピンでウィンドウを最前面に固定", "もう一度ピンを押すと解除できます"]} />,
        <CrayonBgDemo text={["音が出ないときはマイク許可を確認", "OSの設定で入出力先と音量を確認", "本アプリのVolumeが0%でないか確認"]} />,
        <CrayonBgDemo text={["起動時に新しいバージョンを確認", "左上にUpdateが出たら、音声をOFFに", "Updateを押すと更新して再起動します"]} />,
      ]}
    />
  );
}
