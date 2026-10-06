import type { AcState } from "@/types";
import { FAN_LABELS, MODE_LABELS, OPTIONAL_MODE_LABELS, SWING_LABELS, labelFor } from "./acLabels";
import { ControlGroup, ControlRow } from "./ControlRow";
import { Stepper } from "./Stepper";
import { Switch } from "./Switch";
import styles from "./DeviceCard.module.css";

const MIN_TEMP = 16;
const MAX_TEMP = 30;
// "all" is declared in supportedFanOscillationModes but doesn't hold as its own position on
// this hardware - selecting it silently lands on "vertical" instead, confirmed on both the
// real unit and the Samsung app, in every mode (not just dry) - so it's never offered.
const UNUSABLE_SWING_MODES = ["all"];
// Dry runs the fan at its own fixed speed; Auto picks the fan speed itself too - both are the
// AC deciding fan speed on its own, not something this UI should let you override.
const FAN_LOCKED_MODES = ["dry", "auto"];

interface Props {
  state: AcState;
  online: boolean;
  onMode: (mode: string) => void;
  onFanMode: (fanMode: string) => void;
  onSwingMode: (swingMode: string) => void;
  onOptionalMode: (optionalMode: string) => void;
  onTargetTemp: (value: number) => void;
  onAutoClean: (value: boolean) => void;
}

interface SelectFieldProps {
  label: string;
  options: string[];
  value: string | null;
  labels: Record<string, string>;
  disabled: boolean;
  onChange: (value: string) => void;
}

function SelectRow({ label, options, value, labels, disabled, onChange }: SelectFieldProps) {
  return (
    <ControlRow label={label}>
      <select
        className={styles.select}
        aria-label={label}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {value === null && (
          <option value="" disabled>
            —
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor(labels, option)}
          </option>
        ))}
      </select>
    </ControlRow>
  );
}

export function AcControls({
  state,
  online,
  onMode,
  onFanMode,
  onSwingMode,
  onOptionalMode,
  onTargetTemp,
  onAutoClean,
}: Props) {
  const disabled = !state.is_on || !online;
  // Fan-only mode doesn't run the compressor at all - there's no active heating/cooling for a
  // target temperature to mean anything.
  const isTempLocked = state.mode === "wind";
  const isFanLocked = FAN_LOCKED_MODES.includes(state.mode ?? "");
  // Speed boost always drives the fan to turbo, but SmartThings' own fanMode field doesn't
  // get updated when it's engaged via optional_mode (confirmed directly against the raw API -
  // its last-changed timestamp predates the mode switch) - there's nothing to poll for here,
  // so the real value is inferred instead of shown stale.
  const isSpeedBoost = state.optional_mode === "speed";
  // "ready" is the idle state - only show progress while a cycle is actually running.
  const isCleaning = state.auto_clean_state !== null && state.auto_clean_state !== "ready";
  const swingOptions =
    state.available_swing_modes?.filter((mode) => !UNUSABLE_SWING_MODES.includes(mode)) ?? null;

  const hasReadings = state.current_temp !== null || state.energy_wh !== null;

  return (
    <>
      {hasReadings && (
        <ControlGroup>
          {state.current_temp !== null && (
            <ControlRow label="Room temperature">{`${state.current_temp}°C`}</ControlRow>
          )}
          {state.energy_wh !== null && (
            <ControlRow label="Lifetime energy used">
              {`${(state.energy_wh / 1000).toFixed(1)} kWh`}
            </ControlRow>
          )}
        </ControlGroup>
      )}

      <ControlGroup>
        <ControlRow label="Target temperature">
          <Stepper
            value={state.target_temp}
            min={MIN_TEMP}
            max={MAX_TEMP}
            unit="°C"
            disabled={disabled || isTempLocked}
            decreaseLabel="Decrease target temperature"
            increaseLabel="Increase target temperature"
            onChange={onTargetTemp}
          />
        </ControlRow>

        <SelectRow
          label="Mode"
          options={state.available_modes ?? Object.keys(MODE_LABELS)}
          value={state.mode}
          labels={MODE_LABELS}
          disabled={disabled}
          onChange={onMode}
        />

        <SelectRow
          label="Fan speed"
          options={state.available_fan_modes ?? Object.keys(FAN_LABELS)}
          value={isSpeedBoost ? "turbo" : state.fan_mode}
          labels={FAN_LABELS}
          disabled={disabled || isFanLocked || isSpeedBoost}
          onChange={onFanMode}
        />

        {swingOptions && swingOptions.length > 0 && (
          <SelectRow
            label="Swing"
            options={swingOptions}
            value={state.swing_mode}
            labels={SWING_LABELS}
            disabled={disabled}
            onChange={onSwingMode}
          />
        )}

        {state.available_optional_modes && state.available_optional_modes.length > 0 && (
          <SelectRow
            label="Special mode"
            options={state.available_optional_modes}
            value={state.optional_mode}
            labels={OPTIONAL_MODE_LABELS}
            disabled={disabled}
            onChange={onOptionalMode}
          />
        )}

        <ControlRow
          label={isCleaning ? `Auto clean (${state.auto_clean_progress}%)` : "Auto clean"}
        >
          <Switch
            label="Auto clean"
            isOn={state.auto_clean ?? false}
            disabled={disabled}
            onToggle={onAutoClean}
          />
        </ControlRow>
      </ControlGroup>
    </>
  );
}
