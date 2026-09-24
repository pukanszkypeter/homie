import type { Device, DeviceState, WeatherResponse } from "./types";

const API_BASE = "http://localhost:8001";
const WS_URL = "ws://localhost:8001/ws";

export async function fetchWeather(): Promise<WeatherResponse> {
  const res = await fetch(`${API_BASE}/api/weather`);
  if (!res.ok) throw new Error(`Failed to fetch weather: ${res.status}`);
  return res.json();
}

export async function fetchDevices(): Promise<Device[]> {
  const res = await fetch(`${API_BASE}/api/devices`);
  if (!res.ok) throw new Error(`Failed to fetch devices: ${res.status}`);
  return res.json();
}

export async function patchDevice(id: string, state: Partial<DeviceState>): Promise<Device> {
  const res = await fetch(`${API_BASE}/api/devices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Failed to update device: ${res.status}`);
  }
  return res.json();
}

export function connectDeviceStream(onDevice: (device: Device) => void): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByCaller = false;

  const connect = () => {
    socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "device_update") {
        onDevice(message.device as Device);
      }
    };
    socket.onclose = () => {
      if (!closedByCaller) {
        reconnectTimer = setTimeout(connect, 2000);
      }
    };
  };

  connect();

  return () => {
    closedByCaller = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
