import { useState } from 'react';
import { SoundButton } from './MainButton'
import VolumeSlider from './VolumeSlider';
import { DelaySlider } from './DelaySlider';
import IconQuestion from './IconQuestion';

const MainView = () => {
  const [isOn, setIsOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [delaySec, setDelaySec] = useState(0.0);

  return (
    <main className="container flex flex-col items-center justify-center min-h-screen">
      {/* <h1 className="text-xl font-bold mb-2">Welcome to yamabiko.app</h1> */}
      <IconQuestion />
      <SoundButton isOn={isOn} setIsOn={setIsOn} volume={volume} delaySec={delaySec} />
      <VolumeSlider volume={volume} setVolume={setVolume} sliderEnabled={isOn} />
      <DelaySlider delaySec={delaySec} setDelaySec={setDelaySec} disabled={isOn} />
      {/* <p className="text-sm mt-2">※ハウリング防止のためイヤホン推奨</p> */}
    
    </main>
  )
}

export default MainView