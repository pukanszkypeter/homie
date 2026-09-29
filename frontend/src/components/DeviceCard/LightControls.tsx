import type { LightState } from "@/types";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import { TickSlider } from "./TickSlider";

interface Props {
  state: LightState;
  notes?: Record<string, string>;
  onBrightness: (value: number) => void;
  onColorTemp: (value: number) => void;
}

export function LightControls({ state, notes, onBrightness, onColorTemp }: Props) {
  return (
    <>
      <TickSlider
        value={state.brightness}
        zeroMeans={1}
        disabled={!state.is_on}
        ariaLabel="Brightness"
        label="Brightness"
        onChange={onBrightness}
      />
      {state.color_temp !== undefined && (
        <TickSlider
          value={state.color_temp}
          disabled={!state.is_on}
          ariaLabel="Color temperature"
          label="Color Temp"
          endLabels={["Warm", "Neutral", "Cold"]}
          colorFor={colorTempPercentToRgb}
          onChange={onColorTemp}
          note={notes?.color_temp}
        />
      )}
    </>
  );
}
