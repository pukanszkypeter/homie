import { useClock } from "@/hooks/useClock";
import { formatTime } from "@/utils/formatTime";
import { getGreeting } from "./greeting";
import styles from "./GreetingHeader.module.css";

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
        {formatTime(now)}
      </time>
    </header>
  );
}
