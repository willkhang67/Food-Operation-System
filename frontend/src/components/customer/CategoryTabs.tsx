"use client";

import type { Category } from "@/types";
import { cn } from "@/lib/cn";
import styles from "./CategoryTabs.module.scss";

interface CategoryTabsProps {
  categories: Category[];
  selectedId: string; // "all" or a Category.id
  onSelect: (id: string) => void;
}

export default function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  return (
    <div className={styles.tabs}>
      <Pill label="All" active={selectedId === "all"} onClick={() => onSelect("all")} />
      {categories.map((category) => (
        <Pill
          key={category.id}
          label={category.name}
          active={selectedId === category.id}
          onClick={() => onSelect(category.id)}
        />
      ))}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.pill, active && styles.active)}
    >
      {label}
    </button>
  );
}
