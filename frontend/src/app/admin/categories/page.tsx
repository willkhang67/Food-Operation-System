"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import type { Category } from "@/types";
import styles from "./page.module.scss";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        
        const data = await api.getCategories();
        if (!cancelled) setCategories(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load categories.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>{categories.length} categories</p>
        </div>
        <button type="button" className={styles.addButton}>
          <Plus size={16} strokeWidth={2.5} />
          Add category
        </button>
      </div>

      {isLoading && <p className={styles.stateText}>Loading…</p>}
      {error && <p className={cn(styles.stateText, styles.stateError)}>{error}</p>}

      {!isLoading && !error && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className={styles.itemName}>{category.name}</td>
                <td className={styles.muted}>{category.description ?? "—"}</td>
                <td>
                  <span
                    className={cn(
                      styles.statusPill,
                      category.status === 1 ? styles.statusActive : styles.statusInactive,
                    )}
                  >
                    {category.status === 1 ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button type="button" className={styles.editLink}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  No categories yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
