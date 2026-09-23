// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateButton } from "./UpdateButton";

const mocks = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: mocks.isTauri }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  mocks.isTauri.mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function start(audioActive = false) {
  const onBusyChange = vi.fn();
  const view = render(<UpdateButton audioActive={audioActive} onBusyChange={onBusyChange} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  return { ...view, onBusyChange };
}
function availableUpdate() {
  return { version: "0.3.0", close: vi.fn().mockResolvedValue(undefined), downloadAndInstall: vi.fn().mockResolvedValue(undefined) };
}

describe("app updates", () => {
  it("checks on startup and reports no update", async () => {
    mocks.check.mockResolvedValue(null);
    await start();
    expect(mocks.check).toHaveBeenCalledWith({ timeout: 15000 });
    expect(screen.getByRole("button").textContent).toBe("最新版です");
  });
  it("installs only after clicking Update, then restarts", async () => {
    const update = availableUpdate();
    mocks.check.mockResolvedValue(update);
    const { onBusyChange } = await start();
    expect(update.downloadAndInstall).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(mocks.relaunch).toHaveBeenCalledTimes(1);
    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  });
  it("blocks installation during audio use", async () => {
    const update = availableUpdate();
    mocks.check.mockResolvedValue(update);
    await start(true);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button"));
    expect(update.downloadAndInstall).not.toHaveBeenCalled();
  });
  it("allows retry after a network failure", async () => {
    mocks.check.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    await start();
    expect(screen.getByRole("button").textContent).toBe("確認を再試行");
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(screen.getByRole("button").textContent).toBe("最新版です");
  });
  it("does not restart after an installation failure and allows retry", async () => {
    const update = availableUpdate();
    update.downloadAndInstall.mockRejectedValueOnce(new Error("invalid signature"));
    mocks.check.mockResolvedValue(update);
    await start();
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(mocks.relaunch).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toBe("Update");
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(mocks.relaunch).toHaveBeenCalledTimes(1);
  });
  it("retries restart without reinstalling", async () => {
    const update = availableUpdate();
    mocks.check.mockResolvedValue(update);
    mocks.relaunch.mockRejectedValueOnce(new Error("restart failed"));
    await start();
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(screen.getByRole("button").textContent).toBe("再起動");
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(mocks.relaunch).toHaveBeenCalledTimes(2);
  });
  it("hides updates in browser preview", async () => {
    mocks.isTauri.mockReturnValue(false);
    await start();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mocks.check).not.toHaveBeenCalled();
  });
});
