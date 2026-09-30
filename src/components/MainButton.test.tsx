// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundButton } from "./MainButton";

const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
let mediaDevices: EventTarget;
let track: EventTarget & { stop: typeof stop; label: string; readyState: string; getSettings: () => { deviceId: string } };
let actualDeviceId = "built-in";
function input(deviceId: string, label: string): MediaDeviceInfo {
  return { deviceId, label, kind: "audioinput", groupId: "", toJSON: () => ({}) };
}
const stop = vi.fn();
const close = vi.fn();
const resume = vi.fn();
const connect = vi.fn();
const disconnect = vi.fn();
let failAt = "";
let contextState = "running";
const stream = { getTracks: () => [track, { stop }], getAudioTracks: () => [track] } as unknown as MediaStream;

let context: FakeAudioContext;
class FakeAudioContext extends EventTarget {
  state = contextState;
  currentTime = 0;
  destination = {};
  close = close;
  resume = resume;
  constructor() {
    super();
    context = this;
    if (failAt === "constructor") throw new Error("constructor failed");
  }
  createMediaStreamSource() {
    if (failAt === "source") throw new Error("source failed");
    return { connect, disconnect };
  }
  createDelay() { return { connect, disconnect, delayTime: parameter() }; }
  createGain() { return { connect, disconnect, gain: parameter() }; }
}
function parameter() {
  return { value: 0, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
}
function Harness() {
  const [isOn, setIsOn] = useState(false);
  const [err, setError] = useState<string | null>(null);
  return <><SoundButton isOn={isOn} setIsOn={setIsOn} err={err} setError={setError}
    volume={0.5} delaySec={0.1} /><span role="status">{err}</span></>;
}
async function toggle() {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^(ON|OFF)$/ })); });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  failAt = "";
  contextState = "running";
  actualDeviceId = "built-in";
  track = Object.assign(new EventTarget(), { stop, label: "内蔵マイク", readyState: "live", getSettings: () => ({ deviceId: actualDeviceId }) });
  mediaDevices = Object.assign(new EventTarget(), { getUserMedia, enumerateDevices });
  enumerateDevices.mockResolvedValue([input("built-in", "内蔵マイク"), input("usb", "USB マイク")]);
  getUserMedia.mockResolvedValue(stream);
  close.mockResolvedValue(undefined);
  resume.mockImplementation(async () => { context.state = "running"; });
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("microphone coexistence and lifetime", () => {
  it("does not acquire on mount, disables voice processing on ON, and releases on OFF", async () => {
    render(<Harness />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await toggle();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    } });
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("ON");
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledTimes(3);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("OFF");
  });
  it.each(["constructor", "resume", "source", "connect"])("releases the microphone after %s failure and permits retry", async (failure) => {
    failAt = failure;
    if (failure === "resume") {
      contextState = "suspended";
      resume.mockRejectedValueOnce(new Error("resume failed"));
    }
    if (failure === "connect") connect.mockImplementationOnce(() => { throw new Error("connect failed"); });
    render(<Harness />);
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(failure === "constructor" ? 0 : 1);
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("OFF");
    expect(screen.getByRole("status").textContent).toContain("音声の初期化に失敗");
    failAt = "";
    await toggle();
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("ON");
    expect(screen.getByRole("status").textContent).toBe("");
  });
  it("releases a stream granted after unmount", async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValue(pending.promise);
    const view = render(<Harness />);
    await toggle();
    view.unmount();
    await act(async () => { pending.resolve(stream); });
    expect(stop).toHaveBeenCalledTimes(2);
    expect(connect).not.toHaveBeenCalled();
  });
  it("does not reconnect after unmount during resume", async () => {
    const pending = deferred<void>();
    contextState = "suspended";
    resume.mockReturnValue(pending.promise);
    const view = render(<Harness />);
    await toggle();
    view.unmount();
    await act(async () => { pending.resolve(); });
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
  });
  it("releases active audio on unmount", async () => {
    const view = render(<Harness />);
    await toggle();
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("prevents duplicate requests from shortcuts in the same render", async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValue(pending.promise);
    render(<Harness />);
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "Enter" });
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(stream); });
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("ON");
  });
  it("shows permission failures and allows retry", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    render(<Harness />);
    await toggle();
    expect(screen.getByRole("status").textContent).toContain("NotAllowedError");
    expect(stop).not.toHaveBeenCalled();
    await toggle();
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("ON");
  });
  it("stops tracks even if AudioContext.close rejects", async () => {
    close.mockRejectedValueOnce(new Error("close failed"));
    render(<Harness />);
    await toggle();
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /^(ON|OFF)$/ }).textContent).toBe("OFF");
  });
});

async function mountedView() {
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(<Harness />); });
  fireEvent.click(screen.getByLabelText("設定"));
  return view;
}
async function selectUsb() {
  await act(async () => { fireEvent.change(screen.getByLabelText("入力マイク"), { target: { value: "usb" } }); });
  actualDeviceId = "usb";
  track.label = "USB マイク";
}
describe("input device selection", () => {
  it("enumerates without opening a microphone, selects an exact device and displays the actual track name", async () => {
    await mountedView();
    expect(getUserMedia).not.toHaveBeenCalled();
    await selectUsb();
    await toggle();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: {
      deviceId: { exact: "usb" }, echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    } });
    expect(screen.getByText("使用中：USB マイク")).toBeTruthy();
    expect((screen.getByLabelText("入力マイク") as HTMLSelectElement).disabled).toBe(true);
    await toggle();
    expect(screen.getByText("マイク停止中")).toBeTruthy();
    expect((screen.getByLabelText("入力マイク") as HTMLSelectElement).disabled).toBe(false);
  });
  it("refreshes labels after permission and provides a hint for redacted devices", async () => {
    enumerateDevices.mockResolvedValueOnce([input("", "")]);
    await mountedView();
    expect(screen.getByText(/一度ONにして/)).toBeTruthy();
    await toggle();
    expect(screen.getByRole("option", { name: "USB マイク" })).toBeTruthy();
    expect(screen.queryByText(/一度ONにして/)).toBeNull();
  });
  it("updates the list on devicechange and stops an unplugged active device without falling back", async () => {
    await mountedView();
    await selectUsb();
    await toggle();
    enumerateDevices.mockResolvedValue([input("built-in", "内蔵マイク")]);
    await act(async () => { mediaDevices.dispatchEvent(new Event("devicechange")); });
    expect(screen.getByRole("button", { name: "OFF" })).toBeTruthy();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("切断または変更");
    expect((screen.getByLabelText("入力マイク") as HTMLSelectElement).value).toBe("usb");
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
  it("stops on a track ended event even when device enumeration is unavailable", async () => {
    await mountedView();
    await toggle();
    await act(async () => { track.readyState = "ended"; track.dispatchEvent(new Event("ended")); });
    expect(screen.getByRole("button", { name: "OFF" })).toBeTruthy();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("does not fall back if the requested device is unavailable", async () => {
    await mountedView();
    await selectUsb();
    getUserMedia.mockRejectedValueOnce(new DOMException("device missing", "OverconstrainedError"));
    await toggle();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("選択したマイクを使用できません");
  });
  it("releases an unexpected device if the runtime ignores the exact selection", async () => {
    await mountedView();
    await selectUsb();
    actualDeviceId = "built-in";
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(connect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "OFF" })).toBeTruthy();
  });
  it("keeps active audio on enumeration failure and allows manual refresh", async () => {
    await mountedView();
    await toggle();
    enumerateDevices.mockRejectedValueOnce(new Error("unavailable"));
    await act(async () => { mediaDevices.dispatchEvent(new Event("devicechange")); });
    expect(screen.getByText(/マイク一覧を取得できませんでした/)).toBeTruthy();
    expect(stop).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "マイク一覧を再読込" })); });
    expect(screen.queryByText(/マイク一覧を取得できませんでした/)).toBeNull();
  });
  it("does not treat a redacted device list as a disconnection", async () => {
    await mountedView();
    await toggle();
    enumerateDevices.mockResolvedValue([input("", "")]);
    await act(async () => { mediaDevices.dispatchEvent(new Event("devicechange")); });
    expect(stop).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "ON" })).toBeTruthy();
  });
  it("stops if an explicitly selected track switches to another device", async () => {
    await mountedView();
    await selectUsb();
    await toggle();
    actualDeviceId = "built-in";
    await act(async () => { mediaDevices.dispatchEvent(new Event("devicechange")); });
    expect(stop).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "OFF" })).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
  it("ignores stale enumeration and removes device listeners on unmount", async () => {
    await mountedView();
    const pending = deferred<MediaDeviceInfo[]>();
    enumerateDevices.mockReturnValueOnce(pending.promise);
    await act(async () => { mediaDevices.dispatchEvent(new Event("devicechange")); });
    enumerateDevices.mockResolvedValue([input("built-in", "内蔵マイク")]);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await act(async () => { pending.resolve([input("usb", "USB マイク")]); });
    expect(screen.queryByRole("option", { name: "USB マイク" })).toBeNull();
    cleanup();
    enumerateDevices.mockClear();
    mediaDevices.dispatchEvent(new Event("devicechange"));
    window.dispatchEvent(new Event("focus"));
    expect(enumerateDevices).not.toHaveBeenCalled();
  });
});

describe("monitor playback recovery", () => {
  it("resumes an interrupted context before connecting the microphone to output", async () => {
    contextState = "interrupted";
    await mountedView();
    await toggle();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenNthCalledWith(3, context.destination);
    expect(screen.getByRole("button", { name: "ON" })).toBeTruthy();
  });
  it("recovers interrupted output without reacquiring the microphone or enabling echo cancellation", async () => {
    await mountedView();
    await toggle();
    await act(async () => {
      context.state = "interrupted";
      context.dispatchEvent(new Event("statechange"));
    });
    expect(screen.getByText("音声の再生が中断されています。")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "音声を再開" })); });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0][0].audio.echoCancellation).toBe(false);
    expect(stop).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "音声を再開" })).toBeNull();
  });
  it("keeps the recovery action available when resume resolves but playback is still suspended", async () => {
    await mountedView();
    await toggle();
    await act(async () => {
      context.state = "suspended";
      context.dispatchEvent(new Event("statechange"));
    });
    resume.mockResolvedValueOnce(undefined);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "音声を再開" })); });
    expect(screen.getByText(/再生を再開できませんでした/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "音声を再開" })).toBeTruthy();
  });
  it("releases the microphone after a stalled startup resume and enables retry", async () => {
    vi.useFakeTimers();
    try {
      contextState = "suspended";
      resume.mockReturnValueOnce(new Promise(() => {}));
      await mountedView();
      await toggle();
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(stop).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledTimes(1);
      expect((screen.getByRole("button", { name: "OFF" }) as HTMLButtonElement).disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
  it("ignores state changes from an old context after stopping", async () => {
    await mountedView();
    await toggle();
    const oldContext = context;
    await toggle();
    await act(async () => {
      oldContext.state = "suspended";
      oldContext.dispatchEvent(new Event("statechange"));
    });
    expect(screen.queryByText("音声の再生が中断されています。")).toBeNull();
  });
});

 it("opens microphone settings on demand and closes with Escape without toggling audio", async () => {
   await act(async () => { render(<Harness />); });
   const trigger = screen.getByLabelText("設定");
   const panel = trigger.closest("details")!;
   expect(panel.open).toBe(false);
   fireEvent.click(trigger);
   expect(panel.open).toBe(true);
   fireEvent.keyDown(screen.getByLabelText("入力マイク"), { key: "Enter" });
   expect(getUserMedia).not.toHaveBeenCalled();
   fireEvent.keyDown(screen.getByLabelText("入力マイク"), { key: "Escape" });
   expect(panel.open).toBe(false);
   expect(document.activeElement).toBe(trigger);
 });
