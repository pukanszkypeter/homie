export type DeviceType = "light" | "outlet" | "sensor";

export interface LightState {
  is_on: boolean;
  brightness: number;
}

export interface OutletState {
  is_on: boolean;
  power_w: number;
}

export interface SensorState {
  kind: "temperature" | "humidity";
  value: number;
  unit: string;
}

export type DeviceState = LightState | OutletState | SensorState;

export interface Device {
  id: string;
  name: string;
  room: string;
  type: DeviceType;
  state: DeviceState;
}

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
