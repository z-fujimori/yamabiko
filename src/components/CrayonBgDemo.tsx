export function CrayonBgDemo() {
  return (
    <div className="w-10/12 h-full m-auto flex items-center justify-center">
      {/* クレヨン背景 */}
      <div
        className="relative overflow-hidden rounded-3xl p-3 shadow-lg"
        style={{
          backgroundColor: "#F3D37A",
          backgroundImage: [
            // ① 塗り筋（斜めのストローク）
            "repeating-linear-gradient(22deg, rgba(255,255,255,0.08) 0 6px, rgba(0,0,0,0.05) 6px 12px)",
            // ② 大きめムラ（雲っぽい陰影）
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.20), transparent 55%)",
            "radial-gradient(circle at 80% 20%, rgba(0,0,0,0.08), transparent 60%)",
            "radial-gradient(circle at 60% 80%, rgba(255,255,255,0.16), transparent 55%)",
            // ③ 紙ノイズっぽい微細粒（超薄）
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px)",
          ].join(", "),
          backgroundBlendMode: "multiply, normal, multiply, normal, multiply",
        }}
      >

        {/* 中身 */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <div className="rounded-2xl bg-white/70 p-3 backdrop-blur text-center">
              <div className="text-sm text-neutral-800/70 leading-relaxed font-black">
                ⚠️ハウリングの可能性があるのでイヤホン推奨<br />
                EnterキーでON/OFF切替可能<br />
                音量と遅延はON時のみ操作可能
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
