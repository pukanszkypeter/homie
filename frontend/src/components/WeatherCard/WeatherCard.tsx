import { useState } from "react";
import { ChipGroup } from "@/components/ChipGroup/ChipGroup";
import { useWeather } from "@/hooks/useWeather";
import { formatTime } from "@/utils/formatTime";
import { CurrentConditions } from "./CurrentConditions";
import { ForecastRow } from "./ForecastRow";
import styles from "./WeatherCard.module.css";

export function WeatherCard() {
  const { data, error } = useWeather();
  const [selected, setSelected] = useState<string | null>(null);

  if (!data || data.locations.length === 0) {
    const message = data || error ? "Weather not available" : "Loading weather…";
    return <p className={styles.status}>{message}</p>;
  }

  const active = data.locations.find((l) => l.name === selected) ?? data.locations[0];

  return (
    <div className={styles.card}>
      <ChipGroup
        label="Location"
        options={data.locations.map((l) => ({ value: l.name, label: l.name }))}
        selected={active.name}
        onSelect={setSelected}
      />
      <CurrentConditions weather={active} />
      <ForecastRow days={active.daily.slice(1)} />
      {data.updated_at && (
        <p className={styles.footer}>
          Updated {formatTime(new Date(data.updated_at))} · Weather data by Open-Meteo.com
        </p>
      )}
    </div>
  );
}
