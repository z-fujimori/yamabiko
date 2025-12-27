import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { SoundButton } from "./components/MainButton";

function App() {
  
  return (
    <main className="container flex flex-col items-center justify-center min-h-screen">
      <h1>Welcome to yamabiko.app</h1>
      {/* <button onClick={() => startMicThrough()}>Start</button>
      <button onClick={() => stopMicThrough()}>Stop</button> */}
      <SoundButton />
      <p>※ハウリング防止のためイヤホン推奨</p>
    </main>
  );
}

export default App;
