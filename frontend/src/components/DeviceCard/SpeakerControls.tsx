import type { SpeakerState } from "@/types";
import { ControlGroup, ControlRow } from "./ControlRow";
import { Stepper } from "./Stepper";
import { Switch } from "./Switch";

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

interface Props {
  state: SpeakerState;
  online: boolean;
  onVolume: (value: number) => void;
  onMuted: (value: boolean) => void;
}

// Input-source switching isn't here on purpose - the only command this hardware's capability
// offers is a "next source" cycle, and it's a confirmed no-op (ACCEPTED, no state change across
// repeated live tests), so there's nothing real to build a control for. No bass/treble/EQ
// either - the device simply doesn't declare any sound-shaping capability at all.
export function SpeakerControls({ state, online, onVolume, onMuted }: Props) {
  const disabled = !state.is_on || !online;

  return (
    <ControlGroup>
      <ControlRow label="Volume">
        <Stepper
          value={state.volume}
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          unit="%"
          disabled={disabled}
          decreaseLabel="Decrease volume"
          increaseLabel="Increase volume"
          onChange={onVolume}
        />
      </ControlRow>
      <ControlRow label="Mute">
        <Switch
          label="Mute"
          isOn={state.is_muted ?? false}
          disabled={disabled}
          onToggle={onMuted}
        />
      </ControlRow>
    </ControlGroup>
  );
}
