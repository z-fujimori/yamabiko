import { useState } from "react";

export function DelaySlider(props: {
  delaySec: number;
  setDelaySec: React.Dispatch<React.SetStateAction<number>>,
  disabled?: boolean;
}) {
  const { delaySec, setDelaySec, disabled } = props;

  return (
    <div style={{ display: "grid", gap: 2, width: 240 }}>
      {/* <label style={{ fontSize: 14 }}>
        Delay: <b>{delaySec.toFixed(1)}s</b>
      </label> */}

      <input
        type="range"
        min={0}
        max={2}
        step={0.5} // ★ 0.5秒刻みでスナップ
        value={delaySec}
        disabled={disabled}
        onChange={(e) => setDelaySec(Number(e.target.value))}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.5 }}>
        <span>0.0</span>
        <span>0.5</span>
        <span>1.0</span>
        <span>1.5</span>
        <span>2.0</span>
      </div>
    </div>
  );
}
