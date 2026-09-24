import { Droplets } from "lucide-react";
import type { DailyForecast } from "@/types";
import { formatTemperature } from "./format";
import { describeWeather } from "./weatherCodes";
import styles from "./ForecastRow.module.css";

const weekdayFormat = new Intl.DateTimeFormat([], { weekday: "short" });

interface Props {
  days: DailyForecast[];
}

export function ForecastRow({ days }: Props) {
  return (
    <ul className={styles.row}>
      {days.map((day) => {
        const { label, icon: Icon } = describeWeather(day.weather_code, true);
        return (
          <li key={day.date} className={styles.day}>
            <span className={styles.weekday}>
              {weekdayFormat.format(new Date(`${day.date}T12:00:00`))}
            </span>
            <Icon size={32} aria-label={label} />
            <span>
              <strong>{formatTemperature(day.temp_max)}</strong>{" "}
              <span className={styles.low}>{formatTemperature(day.temp_min)}</span>
            </span>
            {day.precipitation_probability !== null && (
              <span className={styles.rain}>
                <Droplets size={14} aria-hidden />
                {Math.round(day.precipitation_probability)}%
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
