import { useClock } from "@/hooks/useClock";
import { getGreeting } from "./greeting";
import styles from "./GreetingHeader.module.css";

const timeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateFormat = new Intl.DateTimeFormat([], {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function GreetingHeader() {
  const now = useClock();

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.greeting}>{getGreeting(now.getHours())}</h1>
        <p className={styles.date}>{dateFormat.format(now)}</p>
      </div>
      <time className={styles.time} dateTime={now.toISOString()}>
        {timeFormat.format(now)}
      </time>
    </header>
  );
}
