import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

export function SoundButton() {
  const [isOn, setIsOn] = useState(false);
  const [busy, setBusy] = useState(false);  // 処理中フラグ buuton連打防止

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function startMicThrough() {
    if (ctxRef.current) return; // すでに開始済みなら何もしない

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,  // スピーカーから出すなら true 推奨（遅延は少し増えることあり）
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    streamRef.current = stream;

    const ctx = new AudioContext({ latencyHint: "interactive" });
    ctxRef.current = ctx;

    // iOS/Safari等も考慮して念のため
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // 直接 destination に繋ぐ（= スピーカー出力）
    source.connect(ctx.destination);
  }

  async function stopMicThrough() {
    // 先に接続を切る
    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;

    // マイク停止
    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;

    // AudioContext 終了
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {}
    }
  }

  async function toggleMicThrough() {
    if (busy) return;
    	setBusy(true);
    try {
      if (ctxRef.current) {
        await stopMicThrough();
        setIsOn(false);
      } else {
        await startMicThrough();
        setIsOn(true);
      }
    } finally {
      setBusy(false);
    }
  }

  // コンポーネント破棄時に確実に止める
  useEffect(() => {
    return () => {
      // fire-and-forget でもOK
      stopMicThrough();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);	

	// キーボードショートカット(Enterで切り替え))
	useAppShortcuts({
    onToggle: () => toggleMicThrough(),
    // onOff: () => setIsOn(false),
  });


  return (
    <button
			ref={buttonRef}
      onClick={toggleMicThrough}
      // disabled={busy}
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        border: "none",
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
        backgroundColor: isOn ? "#4caf50" : "#b0b0b0",
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {isOn ? "ON" : "OFF"}
    </button>
  );
}
