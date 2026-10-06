import type { LightState } from "@/types";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import { ControlBlock, ControlGroup } from "./ControlRow";
import { TickSlider } from "./TickSlider";

interface Props {
  state: LightState;
  notes?: Record<string, string>;
  online: boolean;
  onBrightness: (value: number) => void;
  onColorTemp: (value: number) => void;
}

export function LightControls({ state, notes, online, onBrightness, onColorTemp }: Props) {
  const disabled = !state.is_on || !online;
  return (
    <ControlGroup>
      <ControlBlock>
        <TickSlider
          value={state.brightness}
          zeroMeans={1}
          disabled={disabled}
          ariaLabel="Brightness"
          label="Brightness"
          onChange={onBrightness}
        />
      </ControlBlock>
      {state.color_temp !== undefined && state.color_temp !== null && (
        <ControlBlock>
          <TickSlider
            value={state.color_temp}
            disabled={disabled}
            ariaLabel="Color temperature"
            label="Color temperature"
            endLabels={["Warm", "Neutral", "Cold"]}
            colorFor={colorTempPercentToRgb}
            onChange={onColorTemp}
            note={notes?.color_temp}
          />
        </ControlBlock>
      )}
    </ControlGroup>
  );
}
