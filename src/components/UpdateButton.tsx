import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Phase = "idle" | "checking" | "latest" | "hidden" | "available" | "installing" | "installed" | "error";

export function UpdateButton({ audioActive, onBusyChange }: {
  audioActive: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const updateRef = useRef<Update | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(false);

  async function checkForUpdate() {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase("checking");
    setMessage("");
    try {
      const update = await check({ timeout: 15000 });
      if (!mounted.current) {
        await update?.close();
        return;
      }
      await updateRef.current?.close();
      updateRef.current = update;
      setVersion(update?.version ?? "");
      setPhase(update ? "available" : "latest");
    } catch (error) {
      console.error("Update check failed", error);
      if (mounted.current) {
        setPhase("error");
        setMessage("更新を確認できませんでした。クリックして再試行");
      }
    } finally {
      busyRef.current = false;
    }
  }

  useEffect(() => {
    mounted.current = true;
    // A timer also avoids duplicate requests in React StrictMode.
    const timer = window.setTimeout(() => {
      if (isTauri()) void checkForUpdate();
    }, 1000);
    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
      void updateRef.current?.close().catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (phase !== "latest") return;
    const timer = window.setTimeout(() => setPhase("hidden"), 3000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  async function install() {
    if (busyRef.current || audioActive) return;
    const update = updateRef.current;
    if (!update && phase !== "installed") return;
    busyRef.current = true;
    onBusyChange(true);
    setMessage("");
    try {
      if (phase !== "installed" && update) {
        setPhase("installing");
        setProgress(null);
        let downloaded = 0;
        let total: number | undefined;
        await update.downloadAndInstall((event) => {
          if (event.event === "Started") total = event.data.contentLength;
          if (event.event === "Progress") {
            downloaded += event.data.chunkLength;
            setProgress(total ? Math.min(100, Math.floor(downloaded / total * 100)) : null);
          }
        });
        setPhase("installed");
      }
      try {
        await relaunch();
      } catch (error) {
        console.error("Relaunch failed", error);
        setPhase("installed");
        setMessage("更新済みです。クリックして再起動してください");
      }
    } catch (error) {
      console.error("Update installation failed", error);
      setPhase("available");
      setMessage("更新に失敗しました。クリックして再試行");
    } finally {
      busyRef.current = false;
      onBusyChange(false);
    }
  }

  if (!isTauri() || phase === "hidden") return null;
  const available = phase === "available" || phase === "installed";
  const disabled = phase === "checking" || phase === "installing" || (available && audioActive);
  const label = phase === "installing" ? `更新中${progress === null ? "…" : ` ${progress}%`}`
    : phase === "installed" ? "再起動"
    : phase === "available" ? "Update"
    : phase === "checking" ? "確認中…"
    : phase === "latest" ? "最新版です"
    : phase === "error" ? "確認を再試行" : "更新を確認";
  const description = available && audioActive ? "音声をOFFにすると更新できます"
    : message || (available ? `v${version} に更新して再起動` : "新しいバージョンを確認");

  return (
    <div className="fixed top-2 left-3 max-w-64 text-left text-xs" aria-live="polite">
      <button type="button" disabled={disabled} onClick={() => void (available ? install() : checkForUpdate())}
        title={description} aria-label={`${label}：${description}`}
        className={`rounded-full border px-3 py-1 disabled:opacity-50 ${available ? "border-green-600 text-green-600 font-semibold" : "border-gray-400 text-gray-500 dark:text-gray-300"}`}>
        {label}
      </button>
      {(message || (available && audioActive)) && <p className="mt-1 max-w-44">{description}</p>}
    </div>
  );
}
