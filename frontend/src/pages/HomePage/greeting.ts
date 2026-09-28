import { Moon, Sun, type LucideIcon } from "lucide-react";

interface Greeting {
  text: string;
  Icon: LucideIcon;
  tone: "day" | "night";
}

export function getGreeting(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return { text: "Good morning", Icon: Sun, tone: "day" };
  if (hour >= 12 && hour < 18) return { text: "Good afternoon", Icon: Sun, tone: "day" };
  return { text: "Good evening", Icon: Moon, tone: "night" };
}
