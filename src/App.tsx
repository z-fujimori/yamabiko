import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";


let ctx: AudioContext | null = null
let source: MediaStreamAudioSourceNode | null = null
let stream: MediaStream | null = null

export async function startMicThrough() {
  // macOS/Chrome系は「ユーザー操作の直後」に呼ぶのが安全
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false, // 低遅延優先（必要なら true に）
      noiseSuppression: false,
      autoGainControl: false
    }
  })

  ctx = new AudioContext({ latencyHint: "interactive" })
  await ctx.resume()

  source = ctx.createMediaStreamSource(stream)
  source.connect(ctx.destination)
}

export function stopMicThrough() {
  if (source) source.disconnect()
  source = null

  if (stream) {
    for (const t of stream.getTracks()) t.stop()
  }
  stream = null

  if (ctx) ctx.close()
  ctx = null
}


function App() {
  
  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <button onClick={() => startMicThrough()}>Start</button>
      <button onClick={() => stopMicThrough()}>Stop</button>
    </main>
  );
}

export default App;
