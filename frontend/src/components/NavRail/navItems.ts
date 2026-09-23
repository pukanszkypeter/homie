import { ChartColumn, House, Lightbulb, ListChecks, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/devices", label: "Devices", icon: Lightbulb },
  { to: "/todos", label: "Todos", icon: ListChecks },
  { to: "/stats", label: "Stats", icon: ChartColumn },
];
