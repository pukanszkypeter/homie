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
