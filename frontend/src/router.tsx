import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/layouts/AppShell/AppShell";
import { DevicesPage } from "@/pages/DevicesPage/DevicesPage";
import { HomePage } from "@/pages/HomePage/HomePage";
import { StatsPage } from "@/pages/StatsPage/StatsPage";
import { TodosPage } from "@/pages/TodosPage/TodosPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "todos", element: <TodosPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
