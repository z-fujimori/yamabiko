// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundButton } from "./MainButton";

const getUserMedia = vi.fn();
const stop = vi.fn();
const close = vi.fn();
const resume = vi.fn();
const connect = vi.fn();
const disconnect = vi.fn();
let failAt = "";
let contextState = "running";
const stream = { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream;

class FakeAudioContext {
  state = contextState;
  currentTime = 0;
  destination = {};
  close = close;
  resume = resume;
  constructor() {
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
  await act(async () => { fireEvent.click(screen.getByRole("button")); });
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
  getUserMedia.mockResolvedValue(stream);
  close.mockResolvedValue(undefined);
  resume.mockResolvedValue(undefined);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
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
    expect(screen.getByRole("button").textContent).toBe("ON");
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledTimes(3);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button").textContent).toBe("OFF");
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
    expect(screen.getByRole("button").textContent).toBe("OFF");
    expect(screen.getByRole("status").textContent).toContain("音声の初期化に失敗");
    failAt = "";
    await toggle();
    expect(screen.getByRole("button").textContent).toBe("ON");
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
    expect(screen.getByRole("button").textContent).toBe("ON");
  });
  it("shows permission failures and allows retry", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    render(<Harness />);
    await toggle();
    expect(screen.getByRole("status").textContent).toContain("NotAllowedError");
    expect(stop).not.toHaveBeenCalled();
    await toggle();
    expect(screen.getByRole("button").textContent).toBe("ON");
  });
  it("stops tracks even if AudioContext.close rejects", async () => {
    close.mockRejectedValueOnce(new Error("close failed"));
    render(<Harness />);
    await toggle();
    await toggle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button").textContent).toBe("OFF");
  });
});
