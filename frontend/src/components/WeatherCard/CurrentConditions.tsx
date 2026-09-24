import type { LocationWeather } from "@/types";
import { formatTemperature } from "./format";
import { describeWeather } from "./weatherCodes";
import styles from "./CurrentConditions.module.css";

interface Props {
  weather: LocationWeather;
}

export function CurrentConditions({ weather }: Props) {
  const { current, daily } = weather;
  const { label, icon: Icon } = describeWeather(current.weather_code, current.is_day);
  const today = daily[0];

  return (
    <div className={styles.current}>
      <Icon size={72} className={styles.icon} aria-hidden />
      <div>
        <div className={styles.temperature}>{formatTemperature(current.temperature)}</div>
        <div className={styles.label}>{label}</div>
      </div>
      <dl className={styles.details}>
        <dt>Feels like</dt>
        <dd>{formatTemperature(current.feels_like)}</dd>
        <dt>Wind</dt>
        <dd>{Math.round(current.wind_speed)} km/h</dd>
        <dt>Humidity</dt>
        <dd>{Math.round(current.humidity)}%</dd>
        <dt>Today</dt>
        <dd>
          {formatTemperature(today.temp_max)} / {formatTemperature(today.temp_min)}
        </dd>
      </dl>
    </div>
  );
}
