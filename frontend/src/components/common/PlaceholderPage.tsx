import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./PlaceholderPage.module.scss";

interface PlaceholderPageProps {
  title: string;
  description: string;
  width?: "wide" | "mobile";
  children?: ReactNode;
}

export default function PlaceholderPage({
  title,
  description,
  width = "wide",
  children,
}: PlaceholderPageProps) {
  return (
    <main className={cn(styles.page, styles[width])}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {children}
    </main>
  );
}
