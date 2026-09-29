import { useEffect, useRef, useState } from "react";
import { connectDeviceStream, fetchDevices, patchDevice } from "../api";
import type { Device, DeviceState } from "../types";

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const devicesRef = useRef<Device[]>([]);
  // Each request to a device is a real round trip, sometimes to the device itself - sending a
  // second one before the first finishes doesn't just risk them resolving out of order, it
  // means the device visibly (and correctly!) works through every intermediate value one at a
  // time, which reads as "jumping around" even though each step is real. Only one request per
  // device may be in flight; anything that arrives while one's running replaces whatever was
  // queued behind it, so an abandoned intermediate value (drag through 70 on the way to 80)
  // never gets sent at all - only the latest value once the device is free again.
  const inFlightRef = useRef<Record<string, boolean>>({});
  const queuedRef = useRef<Record<string, Partial<DeviceState> | undefined>>({});

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

  const send = async (id: string, state: Partial<DeviceState>) => {
    inFlightRef.current[id] = true;
    try {
      const updated = await patchDevice(id, state);
      const next = devicesRef.current.map((d) => (d.id === updated.id ? updated : d));
      devicesRef.current = next;
      setDevices(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlightRef.current[id] = false;
      const queued = queuedRef.current[id];
      if (queued) {
        queuedRef.current[id] = undefined;
        send(id, queued);
      }
    }
  };

  const updateDevice = (id: string, state: Partial<DeviceState>) => {
    if (inFlightRef.current[id]) {
      // Merge onto whatever's already queued (not replace) - a toggle and a brightness change
      // arriving close together should both still land, not have one silently drop the other.
      queuedRef.current[id] = { ...queuedRef.current[id], ...state };
      return;
    }
    send(id, state);
  };

  return { devices, error, updateDevice };
}
