import { useEffect, useRef, useState } from "react";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

type Props = {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  err: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
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
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);

  // State alone does not prevent two shortcut events in the same render.
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  async function startMicThrough() {
    if (ctxRef.current) return;
    config.setError(null);
    const generation = ++generationRef.current;
    let acquired = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // WebKit voice processing can attenuate other apps' microphone input.
          // https://bugs.webkit.org/show_bug.cgi?id=294623
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      // Permission may resolve after this component has been disposed.
      if (!mountedRef.current || generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      acquired = true;

      const ctx = new AudioContext({ latencyHint: "interactive" });
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      if (!mountedRef.current || generation !== generationRef.current) return;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const delay = ctx.createDelay(2.5);
      delay.delayTime.value = config.delaySec;
      delayRef.current = delay;
      const gain = ctx.createGain();
      gain.gain.value = config.volume;
      gainRef.current = gain;

      source.connect(delay);
      delay.connect(gain);
      gain.connect(ctx.destination);
      config.setIsOn(true);
    } catch (err) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      // Includes failures after acquisition (constructor, resume, graph setup).
      await stopMicThrough();
      if (!mountedRef.current) return;
      config.setIsOn(false);
      if (acquired) {
        config.setError("音声の初期化に失敗しました。マイクを解放しました。もう一度ONにしてください。");
      } else if (isDomException(err)) {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          config.setError(`マイクの使用が許可されていません。macOSの「システム設定 > プライバシーとセキュリティ > マイク」でこのアプリをONにしてください。[${err.name}]`);
        } else if (err.name === "NotFoundError") {
          config.setError("マイクデバイスが見つかりません。マイクが接続されているか確認してください。");
        } else if (err.name === "NotReadableError") {
          config.setError("マイクを開始できません。接続と他のアプリの音声設定を確認して、もう一度ONにしてください。");
        } else {
          config.setError(`マイクの取得に失敗しました（${err.name}）。`);
        }
      } else {
        config.setError("マイクの取得に失敗しました。");
      }
    }
  }

  async function stopMicThrough() {
    ++generationRef.current;
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
    if (busyRef.current || config.disabled) return;
    busyRef.current = true;
    setBusy(true);
    config.onBusyChange?.(true);
    try {
      if (ctxRef.current) {
        await stopMicThrough();
        config.setIsOn(false);
      } else {
        await startMicThrough(); // start側で成功時だけON
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        config.onBusyChange?.(false);
      }
    }
  }

  // 破棄時に停止
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopMicThrough();
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
        disabled={busy || config.disabled}
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

      {/* {error && (
        <div style={{ maxWidth: 360, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
          {error}
        </div>
      )} */}
    </div>
  );
}
