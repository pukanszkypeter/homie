import { useEffect, useState } from "react";
import { fetchWeather } from "@/api";
import type { WeatherResponse } from "@/types";

const REFRESH_MS = 5 * 60 * 1000;
// Retry quickly until the backend has fetched its first data.
const RETRY_MS = 10 * 1000;

export function useWeather() {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      let delay = RETRY_MS;
      try {
        const next = await fetchWeather();
        if (cancelled) return;
        setData(next);
        setError(null);
        if (next.locations.length > 0) delay = REFRESH_MS;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
      timer = setTimeout(load, delay);
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, error };
}
