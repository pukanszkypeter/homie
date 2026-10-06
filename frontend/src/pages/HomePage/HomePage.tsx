import { ChartColumn, CloudSun, Lightbulb, ListChecks } from "lucide-react";
import { CostWidget } from "@/components/CostWidget/CostWidget";
import { DevicesWidget } from "@/components/DevicesWidget/DevicesWidget";
import { TodoCard } from "@/components/TodoCard/TodoCard";
import { WeatherCard } from "@/components/WeatherCard/WeatherCard";
import { Widget } from "@/components/Widget/Widget";
import { GreetingHeader } from "./GreetingHeader";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <div className={styles.home}>
      <GreetingHeader />
      <div className={styles.grid}>
        <Widget title="Weather" icon={CloudSun}>
          <WeatherCard />
        </Widget>
        <Widget title="Devices" icon={Lightbulb} to="/devices">
          <DevicesWidget />
        </Widget>
        <Widget title="Todos" icon={ListChecks}>
          <TodoCard />
        </Widget>
        <Widget title="Costs" icon={ChartColumn} to="/stats">
          <CostWidget />
        </Widget>
      </div>
    </div>
  );
}
