import { useEffect, useRef, useState } from "react";
import { connectDeviceStream, fetchDevices, patchDevice } from "../api";
import type { Device, DeviceState } from "../types";

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const devicesRef = useRef<Device[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchDevices()
      .then((initial) => {
        if (cancelled) return;
        devicesRef.current = initial;
        setDevices(initial);
      })
      .catch((err) => setError(err.message));

    const disconnect = connectDeviceStream((updated) => {
      const next = devicesRef.current.map((d) => (d.id === updated.id ? updated : d));
      devicesRef.current = next;
      setDevices(next);
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, []);

  const updateDevice = async (id: string, state: Partial<DeviceState>) => {
    try {
      const updated = await patchDevice(id, state);
      const next = devicesRef.current.map((d) => (d.id === updated.id ? updated : d));
      devicesRef.current = next;
      setDevices(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return { devices, error, updateDevice };
}
