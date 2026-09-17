import type { Device, LightState, OutletState, SensorState } from "../types";

interface Props {
  device: Device;
  onUpdate: (id: string, state: Record<string, unknown>) => void;
}

export function DeviceCard({ device, onUpdate }: Props) {
  return (
    <div className={`device-card device-card--${device.type}`}>
      <div className="device-card__name">{device.name}</div>
      <div className="device-card__body">
        {device.type === "light" && (
          <LightControls
            state={device.state as LightState}
            onToggle={(is_on) => onUpdate(device.id, { is_on })}
            onBrightness={(brightness) => onUpdate(device.id, { brightness })}
          />
        )}
        {device.type === "outlet" && (
          <OutletControls
            state={device.state as OutletState}
            onToggle={(is_on) => onUpdate(device.id, { is_on })}
          />
        )}
        {device.type === "sensor" && <SensorReadout state={device.state as SensorState} />}
      </div>
    </div>
  );
}

function LightControls({
  state,
  onToggle,
  onBrightness,
}: {
  state: LightState;
  onToggle: (value: boolean) => void;
  onBrightness: (value: number) => void;
}) {
  return (
    <>
      <button
        className={`toggle ${state.is_on ? "toggle--on" : ""}`}
        onClick={() => onToggle(!state.is_on)}
      >
        {state.is_on ? "On" : "Off"}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={state.brightness}
        disabled={!state.is_on}
        onChange={(e) => onBrightness(Number(e.target.value))}
      />
      <span className="device-card__detail">{state.brightness}%</span>
    </>
  );
}

function OutletControls({
  state,
  onToggle,
}: {
  state: OutletState;
  onToggle: (value: boolean) => void;
}) {
  return (
    <>
      <button
        className={`toggle ${state.is_on ? "toggle--on" : ""}`}
        onClick={() => onToggle(!state.is_on)}
      >
        {state.is_on ? "On" : "Off"}
      </button>
      <span className="device-card__detail">{state.power_w.toFixed(1)} W</span>
    </>
  );
}

function SensorReadout({ state }: { state: SensorState }) {
  return (
    <span className="device-card__reading">
      {state.value.toFixed(1)}
      {state.unit}
    </span>
  );
}
