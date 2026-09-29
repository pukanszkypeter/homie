// Tuya's common default range for a "dual white" bulb's temp_value DP (0-1000, linear) -
// not confirmed as this specific product's declared range, but the standard convention
// across their catalog for this DP. See CLAUDE.md / TuyaDeviceConfig.color_temp_range.
const MIN_KELVIN = 2700;
const MAX_KELVIN = 6500;

export function colorTempPercentToRgb(percent: number): string {
  const kelvin = MIN_KELVIN + (percent / 100) * (MAX_KELVIN - MIN_KELVIN);
  return kelvinToRgb(kelvin);
}

// Tanner Helland's Kelvin -> RGB approximation (the standard one for this), valid roughly
// 1000-40000K. Note 6500K itself renders close to white, not blue - a strict blackbody
// reading, not a stylized "ice blue" - genuinely accurate CCT bulbs don't look that blue.
function kelvinToRgb(kelvin: number): string {
  const temp = kelvin / 100;
  const r = temp <= 66 ? 255 : clamp(329.698727446 * (temp - 60) ** -0.1332047592);
  const g =
    temp <= 66
      ? clamp(99.4708025861 * Math.log(temp) - 161.1195681661)
      : clamp(288.1221695283 * (temp - 60) ** -0.0755148492);
  const b =
    temp >= 66
      ? 255
      : temp <= 19
        ? 0
        : clamp(138.5177312231 * Math.log(temp - 10) - 305.0447927307);
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
