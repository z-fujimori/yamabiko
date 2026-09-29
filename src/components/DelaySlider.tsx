

export function DelaySlider(props: {
  delaySec: number;
  setDelaySec: React.Dispatch<React.SetStateAction<number>>,
}) {
  const { delaySec, setDelaySec } = props;

  return (
    <div style={{ display: "grid", gap: 2, width: 240 }}>
      <label
        style={{
          display: "grid",
          gap: 3,
          width: 240,
          userSelect: "none",
        }}
      >

        <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
        />

        <div className='text-xs' style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Delay</span>
          <span>{delaySec.toFixed(1)}s</span>
        </div>
      </label>
    </div>
  );
}
