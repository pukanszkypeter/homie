import type {
  CostCell,
  CostColor,
  CostEntryInput,
  CostItem,
  CostItemSeries,
  CostSection,
  CostSummary,
  CostYear,
  Device,
  DeviceState,
  TodosResponse,
  TodoTask,
  WeatherResponse,
} from "./types";

const API_BASE = "http://localhost:8001";
const WS_URL = "ws://localhost:8001/ws";

async function failureMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.detail ?? `${fallback}: ${res.status}`;
}

async function costsRequest<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/costs${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) throw new Error(await failureMessage(res, fallback));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const fetchCostYear = (year: number) =>
  costsRequest<CostYear>(`/years/${year}`, "Failed to fetch costs");

export const fetchCostSummary = () =>
  costsRequest<CostSummary>("/summary", "Failed to fetch cost summary");

export const fetchCostItemSeries = (itemId: number) =>
  costsRequest<CostItemSeries>(`/items/${itemId}/series`, "Failed to fetch item history");

export const deleteCostYear = (year: number) =>
  costsRequest<void>(`/years/${year}`, "Failed to delete year", { method: "DELETE" });

export const updateCostSection = (
  sectionId: number,
  changes: { name?: string; color?: CostColor },
) =>
  costsRequest<CostSection>(
    `/sections/${sectionId}`,
    "Failed to update section",
    jsonBody("PATCH", changes),
  );

export const updateCostItem = (itemId: number, changes: { name?: string; unit?: string | null }) =>
  costsRequest<CostItem>(`/items/${itemId}`, "Failed to rename item", jsonBody("PATCH", changes));

export const moveCostSection = (year: number, sectionId: number, direction: "up" | "down") =>
  costsRequest<void>(
    `/years/${year}/sections/${sectionId}/move`,
    "Failed to move section",
    jsonBody("POST", { direction }),
  );

export const moveCostItem = (year: number, itemId: number, direction: "up" | "down") =>
  costsRequest<void>(
    `/years/${year}/items/${itemId}/move`,
    "Failed to move item",
    jsonBody("POST", { direction }),
  );

export const addCostSection = (year: number, name: string) =>
  costsRequest<CostSection>(
    `/years/${year}/sections`,
    "Failed to add section",
    jsonBody("POST", { name }),
  );

export const deleteCostSection = (year: number, sectionId: number) =>
  costsRequest<void>(`/years/${year}/sections/${sectionId}`, "Failed to remove section", {
    method: "DELETE",
  });

export const addCostItem = (year: number, sectionId: number, name: string, unit: string | null) =>
  costsRequest<CostItem>(
    `/years/${year}/items`,
    "Failed to add item",
    jsonBody("POST", { section_id: sectionId, name, unit }),
  );

export const deleteCostItem = (year: number, itemId: number) =>
  costsRequest<void>(`/years/${year}/items/${itemId}`, "Failed to remove item", {
    method: "DELETE",
  });

export const copyCostStructure = (year: number, copyFrom: number) =>
  costsRequest<void>(
    `/years/${year}/structure`,
    "Failed to copy",
    jsonBody("POST", { copy_from: copyFrom }),
  );

export const saveCostEntry = (itemId: number, month: string, entry: CostEntryInput) =>
  costsRequest<CostCell>(
    `/items/${itemId}/entries/${month}`,
    "Failed to save",
    jsonBody("PUT", entry),
  );

export const deleteCostEntry = (itemId: number, month: string) =>
  costsRequest<void>(`/items/${itemId}/entries/${month}`, "Failed to clear", {
    method: "DELETE",
  });

export async function fetchTodos(): Promise<TodosResponse> {
  const res = await fetch(`${API_BASE}/api/todos`);
  if (!res.ok) throw new Error(await failureMessage(res, "Failed to fetch todos"));
  return res.json();
}

export async function addTodoTask(listId: string, title: string): Promise<TodoTask> {
  const res = await fetch(`${API_BASE}/api/todos/lists/${encodeURIComponent(listId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await failureMessage(res, "Failed to add task"));
  return res.json();
}

export async function completeTodoTask(listId: string, taskId: string): Promise<TodoTask> {
  const res = await fetch(
    `${API_BASE}/api/todos/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: true }),
    },
  );
  if (!res.ok) throw new Error(await failureMessage(res, "Failed to complete task"));
  return res.json();
}

export async function deleteTodoTask(listId: string, taskId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/todos/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await failureMessage(res, "Failed to delete task"));
}

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
