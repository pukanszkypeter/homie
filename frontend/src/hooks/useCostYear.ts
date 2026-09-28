import { useEffect, useState } from "react";
import { fetchCostYear } from "@/api";
import type { CostYear } from "@/types";

/** One year of costs. `reload` refetches after an edit. */
export function useCostYear(year: number) {
  const [data, setData] = useState<CostYear | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCostYear(year).then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      },
      (err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [year]);

  const reload = async () => setData(await fetchCostYear(year));

  return {
    // Never hand out another year's numbers under this year's name while it loads.
    data: data?.year === year ? data : null,
    // The year chips stay put while switching.
    knownYears: data?.years ?? [],
    error,
    reload,
  };
}
