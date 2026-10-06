import { useState } from "react";
import { ControlBlock, ControlGroup } from "@/components/DeviceCard/ControlRow";
import { TickSlider } from "@/components/DeviceCard/TickSlider";
import type { DeviceUpdateHandler } from "@/components/DeviceTile/DeviceTile";
import { Dialog } from "@/components/Dialog/Dialog";
import type { LightDevice } from "@/types";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import styles from "./FloorSection.module.css";

interface Props {
  floor: string;
  lights: LightDevice[];
  onUpdate: DeviceUpdateHandler;
  onClose: () => void;
}

// What one slider should show for several lamps: their shared value, or - when they don't
// agree - the middle of them, flagged as mixed so the number isn't passed off as real.
function summarize(values: number[]): { value: number; mixed: boolean } | null {
  if (values.length === 0) return null;
  const mixed = values.some((value) => value !== values[0]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { value: mixed ? Math.round(average / 10) * 10 : values[0], mixed };
}

const isNumber = (value: number | null | undefined): value is number => typeof value === "number";

export function FloorLightsDialog({ floor, lights, onUpdate, onClose }: Props) {
  // Only lamps that are on - the same rule as a single lamp's own dialog, which doesn't let
  // you adjust it while it's off either.
  const targets = lights.filter((light) => light.online && light.state.is_on === true);
  const withColorTemp = targets.filter((light) => isNumber(light.state.color_temp));
  // With nothing on there's nothing to read a value from - fall back to whatever the floor's
  // lamps last reported, so the (disabled) sliders still show something sensible.
  const shown = targets.length > 0 ? targets : lights;
  const brightness = summarize(shown.map((light) => light.state.brightness).filter(isNumber));
  const colorTemp = summarize(shown.map((light) => light.state.color_temp).filter(isNumber));
  // Once a value is picked here it stays on screen as picked: the writes land one lamp at a
  // time, and re-deriving from the lamps meanwhile would flash "Mixed" on the way there.
  const [chosenBrightness, setChosenBrightness] = useState<number | null>(null);
  const [chosenColorTemp, setChosenColorTemp] = useState<number | null>(null);

  const note =
    targets.length === 0
      ? "No lamps on this floor are on right now."
      : `Applies to the ${targets.length} ${targets.length === 1 ? "lamp" : "lamps"} on this floor that ${targets.length === 1 ? "is" : "are"} on right now.`;

  return (
    <Dialog title={`${floor} lights`} size="compact" onClose={onClose}>
      <div className={styles.sheet}>
        <p className={styles.note}>{note}</p>
        <ControlGroup>
          <ControlBlock>
            <TickSlider
              value={chosenBrightness ?? brightness?.value ?? 50}
              valueLabel={chosenBrightness === null && brightness?.mixed ? "Mixed" : undefined}
              zeroMeans={1}
              disabled={targets.length === 0}
              ariaLabel={`${floor} brightness`}
              label="Brightness"
              onChange={(value) => {
                setChosenBrightness(value);
                targets.forEach((light) => onUpdate(light.id, { brightness: value }));
              }}
            />
          </ControlBlock>
          {colorTemp !== null && (
            <ControlBlock>
              <TickSlider
                value={chosenColorTemp ?? colorTemp.value}
                valueLabel={chosenColorTemp === null && colorTemp.mixed ? "Mixed" : undefined}
                disabled={withColorTemp.length === 0}
                ariaLabel={`${floor} color temperature`}
                label="Color temperature"
                endLabels={["Warm", "Neutral", "Cold"]}
                colorFor={colorTempPercentToRgb}
                onChange={(value) => {
                  setChosenColorTemp(value);
                  withColorTemp.forEach((light) => onUpdate(light.id, { color_temp: value }));
                }}
              />
            </ControlBlock>
          )}
        </ControlGroup>
      </div>
    </Dialog>
  );
}
