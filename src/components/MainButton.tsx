import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import appPackage from "../../package.json";
import { resumePlayback } from "../audio/resumePlayback";
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
  return err instanceof DOMException;
}

export function SoundButton(config: Props) {
  const microphonePanelRef = useRef<HTMLDetailsElement | null>(null);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState("");
  const playbackCleanupRef = useRef<(() => void) | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [activeDeviceName, setActiveDeviceName] = useState("");
  const [deviceMessage, setDeviceMessage] = useState("");
  const deviceRequestRef = useRef(0);
  const activeChoiceRef = useRef("");
  const trackCleanupRef = useRef<(() => void) | null>(null);
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

  function inputUnavailable() {
    if (!mountedRef.current || !streamRef.current) return;
    void stopMicThrough();
    config.setIsOn(false);
    config.setError("使用中のマイクが切断または変更されました。入力マイクを確認して、もう一度ONにしてください。");
  }

  async function refreshDevices() {
    const request = ++deviceRequestRef.current;
    const generation = generationRef.current;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      if (!mountedRef.current || request !== deviceRequestRef.current) return;
      const inputs = list.filter((device) => device.kind === "audioinput");
      setDevices(inputs.filter((device) => device.deviceId && !["default", "communications"].includes(device.deviceId)));
      setDeviceMessage(inputs.some((device) => device.label) ? "" : "マイク名が出ない場合は、一度ONにして使用を許可してください。");
      const track = streamRef.current?.getAudioTracks()[0];
      if (!track || generation !== generationRef.current) return;
      const id = track.getSettings().deviceId;
      // Empty/redacted lists are not proof that a device was unplugged.
      const knownInputs = inputs.filter((device) => device.deviceId && device.label);
      if (track.readyState === "ended" ||
          (activeChoiceRef.current && id && id !== activeChoiceRef.current) ||
          (id && !["default", "communications"].includes(id) && knownInputs.length > 0 && !knownInputs.some((device) => device.deviceId === id))) {
        inputUnavailable();
        return;
      }
      setActiveDeviceName(track.label || inputs.find((device) => device.deviceId === id)?.label || "名前を取得できないマイク");
    } catch {
      if (mountedRef.current && request === deviceRequestRef.current) {
        setDeviceMessage("マイク一覧を取得できませんでした。「再読込」で再試行できます。");
      }
    }
  }

  // Enumeration never requests microphone access. Refresh again after permission.
  useEffect(() => {
    const refresh = () => { void refreshDevices(); };
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      ++deviceRequestRef.current;
      navigator.mediaDevices?.removeEventListener("devicechange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const closePanel = (event: PointerEvent) => {
      const panel = microphonePanelRef.current;
      if (panel?.open && event.target instanceof Node && !panel.contains(event.target)) panel.open = false;
    };
    document.addEventListener("pointerdown", closePanel);
    return () => document.removeEventListener("pointerdown", closePanel);
  }, []);

  async function startMicThrough() {
    if (ctxRef.current) return;
    config.setError(null);
    const generation = ++generationRef.current;
    let acquired = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      });
      // Permission may resolve after this component has been disposed.
      if (!mountedRef.current || generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      acquired = true;
      activeChoiceRef.current = selectedDeviceId;
      const track = stream.getAudioTracks()[0];
      const actualId = track?.getSettings().deviceId;
      if (!track || track.readyState === "ended" || (selectedDeviceId && actualId && actualId !== selectedDeviceId)) {
        inputUnavailable();
        return;
      }
      const ended = () => {
        if (streamRef.current === stream) inputUnavailable();
      };
      track.addEventListener("ended", ended);
      trackCleanupRef.current = () => track.removeEventListener("ended", ended);
      setActiveDeviceName(track.label || "名前を取得できないマイク");
      void refreshDevices();

      const ctx = new AudioContext({ latencyHint: "interactive" });
      ctxRef.current = ctx;
      await resumePlayback(ctx);
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
      const updatePlaybackState = () => {
        if (!mountedRef.current || ctxRef.current !== ctx) return;
        setPlaybackPaused(ctx.state !== "running");
      };
      ctx.addEventListener("statechange", updatePlaybackState);
      playbackCleanupRef.current = () => ctx.removeEventListener("statechange", updatePlaybackState);
      updatePlaybackState();
      config.setIsOn(true);
    } catch (err) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      // Includes failures after acquisition (constructor, resume, graph setup).
      await stopMicThrough();
      if (!mountedRef.current) return;
      config.setIsOn(false);
      if (acquired || !isDomException(err)) {
        config.setError("音声の初期化に失敗しました。マイクを解放しました。もう一度ONにしてください。");
      } else {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          config.setError(`マイクの使用が許可されていません。macOSの「システム設定 > プライバシーとセキュリティ > マイク」でこのアプリをONにしてください。[${err.name}]`);
        } else if (err.name === "OverconstrainedError") {
          config.setError("選択したマイクを使用できません。接続を確認するか、別の入力マイクを選択してください。");
          void refreshDevices();
        } else if (err.name === "NotFoundError") {
          config.setError("マイクデバイスが見つかりません。マイクが接続されているか確認してください。");
        } else if (err.name === "NotReadableError") {
          config.setError("マイクを開始できません。接続と他のアプリの音声設定を確認して、もう一度ONにしてください。");
        } else {
          config.setError(`マイクの取得に失敗しました（${err.name}）。`);
        }
      }
    }
  }

  async function stopMicThrough() {
    ++generationRef.current;
    playbackCleanupRef.current?.();
    playbackCleanupRef.current = null;
    if (mountedRef.current) {
      setPlaybackPaused(false);
      setPlaybackMessage("");
    }
    trackCleanupRef.current?.();
    trackCleanupRef.current = null;
    activeChoiceRef.current = "";
    if (mountedRef.current) setActiveDeviceName("");
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

  async function recoverPlayback() {
    const ctx = ctxRef.current;
    if (!ctx || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    config.onBusyChange?.(true);
    setPlaybackMessage("");
    try {
      // Called directly from a user gesture; reuse the existing microphone.
      await resumePlayback(ctx);
      if (mountedRef.current && ctxRef.current === ctx) setPlaybackPaused(false);
    } catch {
      if (mountedRef.current && ctxRef.current === ctx) {
        setPlaybackMessage("再生を再開できませんでした。音声をOFFにして、出力先を確認してからONにしてください。");
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        config.onBusyChange?.(false);
      }
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

      <details ref={microphonePanelRef} className="fixed bottom-3 left-3 z-20 text-left text-xs"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            if (microphonePanelRef.current) microphonePanelRef.current.open = false;
            microphonePanelRef.current?.querySelector("summary")?.focus();
          }
        }}>
        <summary aria-label="設定" title={activeDeviceName ? `設定（使用中：${activeDeviceName}）` : "設定"}
          className="relative flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border-2 border-gray-400 text-gray-400 hover:bg-gray-100 hover:text-gray-700 [&::-webkit-details-marker]:hidden">
          <Settings size={16} />
          {(config.err || playbackPaused) && <span aria-label="音声の状態を確認" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" />}
        </summary>
        <div className="fixed inset-2 z-30 overflow-y-auto rounded-xl border border-gray-400 bg-white p-3 text-gray-900 shadow-lg dark:bg-[#2f2f2f] dark:text-white">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">設定</span>
          <button type="button" aria-label="設定を閉じる" className="px-2 text-lg leading-none"
            onClick={() => {
              if (microphonePanelRef.current) microphonePanelRef.current.open = false;
              microphonePanelRef.current?.querySelector("summary")?.focus();
            }}>×</button>
        </div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="microphone-input">入力マイク</label>
          <button type="button" onClick={() => void refreshDevices()} className="underline"
            aria-label="マイク一覧を再読込">再読込</button>
        </div>
        <select id="microphone-input" value={selectedDeviceId}
          disabled={busy || config.isOn || config.disabled}
          onChange={(event) => { setSelectedDeviceId(event.target.value); config.setError(null); }}
          className="w-full rounded border border-gray-400 bg-white p-1 text-gray-900 disabled:opacity-60 dark:bg-gray-800 dark:text-white">
          <option value="">システム既定のマイク</option>
          {selectedDeviceId && !devices.some((device) => device.deviceId === selectedDeviceId) &&
            <option value={selectedDeviceId}>選択中のマイク（未接続または確認できません）</option>}
          {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>
            {device.label || `マイク ${index + 1}（名前未取得）`}
          </option>)}
        </select>
        <p className="mt-1 break-words" aria-live="polite">
          {activeDeviceName ? `使用中：${activeDeviceName}` : "マイク停止中"}
        </p>
        {config.isOn && <p>変更するには音声をOFFにしてください。</p>}
        {config.isOn && playbackPaused && <div className="mt-1" aria-live="polite">
          <p>音声の再生が中断されています。</p>
          <button type="button" disabled={busy || config.disabled} onClick={() => void recoverPlayback()}
            className="rounded border px-2 py-1 disabled:opacity-50">音声を再開</button>
        </div>}
        {playbackMessage && <p aria-live="polite">{playbackMessage}</p>}
        {deviceMessage && <p className="mt-1" aria-live="polite">{deviceMessage}</p>}
        {config.err && <p className="mt-1 text-amber-700 dark:text-amber-300" role="alert">{config.err}</p>}
        <p className="mt-3 text-right text-[10px] text-gray-500 dark:text-gray-400">
          Yamabiko v{appPackage.version}
        </p>
        </div>
      </details>
    </div>
  );
}
