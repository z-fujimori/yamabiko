import React from 'react'

const VolumeSlider = (config: {
    volume: number,
    setVolume: React.Dispatch<React.SetStateAction<number>>,
    sliderEnabled: boolean,
}) => {
  return (
    <div>
      <label
        style={{
          display: "grid",
          gap: 6,
          width: 240,
          opacity: config.sliderEnabled ? 1 : 0.5,
          userSelect: "none",
        }}
      >
        <div className='text-xs' style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Volume</span>
          <span>{Math.round(config.volume * 100)}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.volume}
          onChange={(e) => config.setVolume(Number(e.target.value))}
          disabled={!config.sliderEnabled}   // ★ ONの時だけ操作可能
        />
      </label>
    </div>
  )
}

export default VolumeSlider