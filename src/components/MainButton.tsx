import { useEffect, useRef, useState } from "react";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

type Props = {
  isOn: boolean;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
  volume: number;
  delaySec: number;
};

function isDomException(err: unknown): err is DOMException {
  return typeof err === "object" && err !== null && "name" in err;
}

export function SoundButton(config: Props) {
  const [busy, setBusy] = useState(false); // 連打防止
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);

  async function startMicThrough() {
console.log("isSecureContext", window.isSecureContext);
console.log("mediaDevices", navigator.mediaDevices);
console.log("getUserMedia", navigator.mediaDevices?.getUserMedia);


    if (ctxRef.current) return; // すでに開始済み
    setError(null);

    // 重要：ここが「macOSの設定 > マイク」に出現するトリガー
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (err) {
      // macOSでは拒否後に再ダイアログは出ないので、ここで案内する
      if (isDomException(err)) {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          setError(
            "マイクの使用が許可されていません。macOSの「システム設定 → プライバシーとセキュリティ → マイク」でこのアプリをONにしてください。"
          );
        } else if (err.name === "NotFoundError") {
          setError("マイクデバイスが見つかりません。マイクが接続されているか確認してください。");
        } else {
          setError(`マイクの取得に失敗しました（${err.name}）。`);
        }
      } else {
        setError("マイクの取得に失敗しました。");
      }

      // 中途半端な状態が残らないように
      await stopMicThrough();
      config.setIsOn(false);
      return;
    }

    streamRef.current = stream;

    const ctx = new AudioContext({ latencyHint: "interactive" });
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // 最大遅延秒（必要に応じて）※ 2.5 = 2.5秒
    const delay = ctx.createDelay(2.5);
    delay.delayTime.value = config.delaySec;
    delayRef.current = delay;

    const gain = ctx.createGain();
    gain.gain.value = config.volume;
    gainRef.current = gain;

    // 接続：source → delay → gain → destination
    source.connect(delay);
    delay.connect(gain);
    gain.connect(ctx.destination);

    config.setIsOn(true);
  }

  async function stopMicThrough() {
    // 接続を先に切る（順番が大事）
    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;

    try {
      delayRef.current?.disconnect();
    } catch {}
    delayRef.current = null;

    try {
      gainRef.current?.disconnect();
    } catch {}
    gainRef.current = null;

    // マイク停止
    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;

    // AudioContext close
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
        config.setIsOn(false);
      } else {
        await startMicThrough(); // start側で成功時だけON
      }
    } finally {
      setBusy(false);
    }
  }

  // 破棄時に停止
  useEffect(() => {
    return () => {
      stopMicThrough();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enterで切り替え
  useAppShortcuts({
    onToggle: () => toggleMicThrough(),
  });

  // volume変更追従
  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx) return;

    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(config.volume, now, 0.01);
  }, [config.volume]);

  // 外部からOFFされたら止める
  useEffect(() => {
    if (!config.isOn && ctxRef.current) {
      stopMicThrough();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.isOn]);

  // delay秒変更追従（ノイズ防止でランプ）
  useEffect(() => {
    const delay = delayRef.current;
    const ctx = ctxRef.current;
    if (!delay || !ctx) return;

    const now = ctx.currentTime;
    delay.delayTime.cancelScheduledValues(now);
    delay.delayTime.setValueAtTime(delay.delayTime.value, now);
    delay.delayTime.linearRampToValueAtTime(config.delaySec, now + 0.05);
  }, [config.delaySec]);

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <button
        onClick={toggleMicThrough}
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

      {error && (
        <div style={{ maxWidth: 360, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
