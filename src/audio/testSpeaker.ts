import { resumePlayback } from "./resumePlayback";

export async function playSpeakerTestTone(): Promise<void> {
  const context = new AudioContext({ latencyHint: "interactive" });
  let oscillator: OscillatorNode | null = null;
  let gain: GainNode | null = null;

  try {
    await resumePlayback(context);
    const now = context.currentTime;
    oscillator = context.createOscillator();
    gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.setValueAtTime(0.16, now + 0.18);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);

    const ended = new Promise<void>((resolve) => {
      oscillator?.addEventListener("ended", () => resolve(), { once: true });
    });
    oscillator.start(now);
    oscillator.stop(now + 0.25);
    await ended;
  } finally {
    try { oscillator?.disconnect(); } catch {}
    try { gain?.disconnect(); } catch {}
    try { await context.close(); } catch {}
  }
}
