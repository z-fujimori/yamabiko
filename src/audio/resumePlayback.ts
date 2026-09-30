// WebKit may leave resume() pending when playback is interrupted.
export async function resumePlayback(context: AudioContext): Promise<void> {
  if (context.state === "running") return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Playback resume timed out")), 5000);
      }),
    ]);
    if ((context.state as string) !== "running") throw new Error("Playback is not running");
  } finally {
    clearTimeout(timer);
  }
}

export async function resumeMonitorPlayback(
  context: AudioContext,
  element: HTMLAudioElement,
): Promise<void> {
  await Promise.all([resumePlayback(context), element.play()]);
  if ((context.state as string) !== "running" || element.paused) {
    throw new Error("Monitor playback is not running");
  }
}
