"use client";

import styles from "./StatusSwitch.module.scss";

interface StatusSwitchProps {
  checked: boolean;
  onLabel?: string;
  offLabel?: string;
  onChange: (checked: boolean) => void;
}

export default function StatusSwitch({
  checked,
  onLabel = "On menu",
  offLabel = "Hidden",
  onChange,
}: StatusSwitchProps) {
  return (
    <label className={styles.wrapper}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={styles.input}
      />
      <span className={styles.track} />
      <span className={styles.label}>{checked ? onLabel : offLabel}</span>
    </label>
  );
}
