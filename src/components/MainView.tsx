import { useState } from 'react';
import { SoundButton } from './MainButton'
import VolumeSlider from './VolumeSlider';
import { DelaySlider } from './DelaySlider';
import IconQuestion from './IconQuestion';
import { WindowPinButton } from './WindowPinButton';

const MainView = () => {
  const [isOn, setIsOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [delaySec, setDelaySec] = useState(0.0);
    const [error, setError] = useState<string | null>(null);

  return (
    <main className="container flex flex-col items-center justify-center min-h-screen select-none">
      {/* <h1 className="text-xl font-bold mb-2">Welcome to yamabiko.app</h1> */}
      <IconQuestion />
      <SoundButton isOn={isOn} setIsOn={setIsOn} volume={volume} delaySec={delaySec} err={error} setError={setError} />

      {error && 
        <div style={{ maxWidth: 360, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }} className='mt-1'>
          {error}
        </div> 
      ||
        <div>
          <VolumeSlider volume={volume} setVolume={setVolume} sliderEnabled={isOn} />
          <DelaySlider delaySec={delaySec} setDelaySec={setDelaySec} disabled={isOn} />
        </div>
      }
      {/* <p className="text-sm mt-2">※ハウリング防止のためイヤホン推奨</p> */}
      <WindowPinButton />
    
    </main>
  )
}

export default MainView