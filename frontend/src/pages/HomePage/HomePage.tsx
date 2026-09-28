import { ChartColumn, CloudSun, Lightbulb, ListChecks } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon/ComingSoon";
import { CostWidget } from "@/components/CostWidget/CostWidget";
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
          <ComingSoon />
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
