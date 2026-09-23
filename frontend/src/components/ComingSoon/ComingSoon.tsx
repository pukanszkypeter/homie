import styles from "./ComingSoon.module.css";

interface Props {
  message?: string;
}

export function ComingSoon({ message = "Coming soon" }: Props) {
  return <p className={styles.text}>{message}</p>;
}
