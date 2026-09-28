import { useEffect, useState } from "react";
import { fetchCostSummary } from "@/api";
import type { CostSummary } from "@/types";

// Costs only change when someone edits them, so a slow poll is plenty.
const REFRESH_MS = 60 * 1000;

export function useCostSummary() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const next = await fetchCostSummary();
        if (cancelled) return;
        setData(next);
        setFailed(false);
      } catch {
        if (cancelled) return;
        setFailed(true);
      }
      timer = setTimeout(load, REFRESH_MS);
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, failed };
}
