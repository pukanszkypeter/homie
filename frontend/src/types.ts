export type DeviceType = "light" | "ac" | "speaker";

export interface LightState {
  is_on: boolean;
  brightness: number;
  // Not every light has a color-temp DP - absent means "no control to show" (this light
  // doesn't have one). null means it does, but hasn't been read yet (e.g. offline since
  // before its first successful poll) - show the control, just without a value yet.
  color_temp?: number | null;
}

export interface AcState {
  is_on: boolean;
  mode: string | null;
  fan_mode: string | null;
  target_temp: number | null;
  swing_mode: string | null;
  optional_mode: string | null;
  auto_clean: boolean | null;
  // Read-only - the unit's own sensor, not something the slider writes to.
  current_temp: number | null;
  // Read-only - null means this unit doesn't report filter wear at all, not "unknown".
  filter_status: string | null;
  filter_usage: number | null;
  // Read-only - only meaningful (non-"ready") while a clean cycle is actually running.
  auto_clean_state: string | null;
  auto_clean_progress: number | null;
  // Read-only - cumulative lifetime Wh off the unit's own meter.
  energy_wh: number | null;
  // The modes/speeds/etc this specific unit reports supporting, read from the device rather
  // than assumed - null until the first successful poll.
  available_modes: string[] | null;
  available_fan_modes: string[] | null;
  available_swing_modes: string[] | null;
  available_optional_modes: string[] | null;
}

export interface SpeakerState {
  is_on: boolean;
  volume: number | null;
  is_muted: boolean | null;
}

export type DeviceState = LightState | AcState | SpeakerState;

interface DeviceBase {
  id: string;
  name: string;
  room: string;
  // Per-state-key caveats worth surfacing in the UI, e.g. a control that's real but has no
  // physical effect on this particular fixture.
  notes?: Record<string, string>;
  // False when the last poll (or write attempt) couldn't reach the device - state is left at
  // its last-known values, just flagged as stale, rather than cleared.
  online: boolean;
}

// A discriminated union on `type` (rather than a flat `state: DeviceState`) so that checking
// `device.type` narrows `device.state` to the matching shape - no `as LightState`/`as AcState`
// casts needed at the call site.
export interface LightDevice extends DeviceBase {
  type: "light";
  state: LightState;
}

export interface AcDevice extends DeviceBase {
  type: "ac";
  state: AcState;
}

export interface SpeakerDevice extends DeviceBase {
  type: "speaker";
  state: SpeakerState;
}

export type Device = LightDevice | AcDevice | SpeakerDevice;

export interface DeviceUpdateMessage {
  type: "device_update";
  device: Device;
}

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  is_day: boolean;
}

export interface DailyForecast {
  date: string;
  weather_code: number;
  temp_max: number;
  temp_min: number;
  precipitation_probability: number | null;
}

export interface LocationWeather {
  name: string;
  current: CurrentWeather;
  daily: DailyForecast[];
}

export interface WeatherResponse {
  updated_at: string | null;
  locations: LocationWeather[];
}

export type TodosStatus = "not_configured" | "loading" | "sign_in_required" | "ok" | "unavailable";

export interface TodoTask {
  id: string;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  is_recurring: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  is_shared: boolean;
  tasks: TodoTask[];
}

export interface TodosResponse {
  status: TodosStatus;
  updated_at: string | null;
  lists: TodoList[];
}

export type CostColor =
  "yellow" | "blue" | "coral" | "purple" | "green" | "orange" | "cyan" | "lime" | "pink";

export interface CostItem {
  id: number;
  name: string;
  unit: string | null;
}

export interface CostSection {
  id: number;
  name: string;
  color: CostColor;
  items: CostItem[];
}

export interface CostCell {
  amount_huf: number | null; // null means a quantity was logged but the price isn't known yet
  quantity: number | null;
  unit_price: number | null;
  note: string | null;
}

export interface CostItemYear extends CostItem {
  months: (CostCell | null)[]; // January..December, null = no data
  total_huf: number;
}

export interface CostSectionYear {
  id: number;
  name: string;
  color: CostColor;
  items: CostItemYear[];
  month_totals: (number | null)[];
  total_huf: number;
}

export interface CostYear {
  year: number;
  years: number[];
  sections: CostSectionYear[];
  month_totals: (number | null)[];
  total_huf: number;
}

export interface CostSeriesPoint {
  month: string; // "YYYY-MM"
  amount_huf: number | null;
  quantity: number | null;
  unit_price: number | null;
  note: string | null;
}

export interface CostItemSeries extends CostItem {
  points: CostSeriesPoint[];
}

export interface CostMonthTotal {
  month: string;
  total_huf: number;
}

export interface CostSummary {
  latest: CostMonthTotal | null;
  previous: CostMonthTotal | null;
  by_section: { name: string; total_huf: number }[];
  trend: CostMonthTotal[];
}

export interface CostEntryInput {
  amount_huf: number | null; // amount_huf and quantity can't both be null - nothing to save
  quantity: number | null;
  note: string | null;
}
