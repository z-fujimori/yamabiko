import { useEffect, useRef, useState } from "react";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

export function SoundButton(config: {
  isOn: boolean,
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>,
  volume: number,
	delaySec: number
}) {
  
  const [busy, setBusy] = useState(false);  // 処理中フラグ buuton連打防止

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gainRef = useRef<GainNode | null>(null);
	const delayRef = useRef<DelayNode | null>(null);  // delayノード用

  async function startMicThrough() {
    if (ctxRef.current) return; // すでに開始済みなら何もしない

    // try{
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

			const delay = ctx.createDelay(2.5);   // 最大遅延 5秒（必要に応じて）
			delay.delayTime.value = config.delaySec; // 初期値
			delayRef.current = delay;

      const gain = ctx.createGain();
      gain.gain.value = config.volume;
      gainRef.current = gain;

      // 接続：source → delay → gain → destination
      source.connect(delay);
      delay.connect(gain);
      gain.connect(ctx.destination);

      // ★ 成功したときだけON
      config.setIsOn(true);
    // } catch (err) {
    //   // マイクの使用が許可されなかった等のエラー処理
    //   await stopMicThrough();  // ← 中途半端な状態を消す
    //   config.setIsOn(false);  // ← ONにしない
    //   // setError("マイクの使用が許可されていません");
    // }
  }

  async function stopMicThrough() {
    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;

    try {
      gainRef.current?.disconnect();
    } catch {}
    gainRef.current = null;

    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;

    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {}
    }

		// delayノード切断
		try {
			delayRef.current?.disconnect();
		} catch {}
		delayRef.current = null;
  }

  async function toggleMicThrough() {
    if (busy) return;
    setBusy(true);
    try {
      if (ctxRef.current) {
        await stopMicThrough();
        config.setIsOn(false);
      } else {
        await startMicThrough(); // start側で成功時だけONになる
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

  useEffect(() => {
    if (!gainRef.current) return;
    const ctx = ctxRef.current;
    const now = ctx ? ctx.currentTime : 0;
    gainRef.current.gain.cancelScheduledValues(now);
    gainRef.current.gain.setTargetAtTime(config.volume, now, 0.01);
  }, [config.volume]);

  useEffect(() => {
    if (!config.isOn && ctxRef.current) {
      stopMicThrough();
    }
  }, [config.isOn]);

	// delay秒変更対応
	useEffect(() => {
		const delay = delayRef.current;
		const ctx = ctxRef.current;
		if (!delay || !ctx) return;

		const now = ctx.currentTime;

		// 急変でノイズが出るのを防ぐ（おすすめ）
		delay.delayTime.cancelScheduledValues(now);
		delay.delayTime.setValueAtTime(delay.delayTime.value, now);
		delay.delayTime.linearRampToValueAtTime(config.delaySec, now + 0.05); // 50msで追従
	}, [config.delaySec]);

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
        backgroundColor: config.isOn ? "#4caf50" : "#b0b0b0",
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {config.isOn ? "ON" : "OFF"}
    </button>
  );
}
