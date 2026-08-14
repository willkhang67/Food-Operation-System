"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import type { Food } from "@/types";
import StatusSwitch from "@/components/admin/StatusSwitch";
import styles from "./page.module.scss";

type FilterMode = "all" | "available" | "hidden";

const FILTERS: { mode: FilterMode; label: string }[] = [
  { mode: "all", label: "All items" },
  { mode: "available", label: "Available only" },
  { mode: "hidden", label: "Hidden" },
];

export default function AdminFoodPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  const loadFoods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!api.isAuthenticated() || !api.isAdmin()) {
        throw new Error("You need to log in with an Admin account");
      }
      
      const data = await api.getFoods();
      setFoods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load foods.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();

    const handleLogin = () => loadFoods();
    
    const handleLogout = () => {
      setFoods([]);
      setError("You must be logged in to view admin panel.");
      setIsLoading(false);
    };

    window.addEventListener("auth:login", handleLogin);
    window.addEventListener("auth:logout", handleLogout);

    return () => {
      window.removeEventListener("auth:login", handleLogin);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [loadFoods]);

  const visibleFoods = useMemo(() => {
    if (filter === "available") return foods.filter((food) => food.is_available);
    if (filter === "hidden") return foods.filter((food) => !food.is_available);
    return foods;
  }, [foods, filter]);

  const handleToggleAvailability = async (foodId: string, next: boolean) => {
    const previousFoods = foods;
    setFoods((prev) =>
      prev.map((food) => (food.id === foodId ? { ...food, is_available: next } : food)),
    );

    try {
      await api.toggleFoodAvailability(foodId);
    } catch (err) {
      setFoods(previousFoods);
      setError(err instanceof Error ? err.message : "Failed to update availability.");
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Menu</h1>
          <p className={styles.subtitle}>{foods.length} items</p>
        </div>
        <button type="button" className={styles.addButton}>
          <Plus size={16} strokeWidth={2.5} />
          Add item
        </button>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            className={cn(styles.filterPill, filter === mode && styles.filterPillActive)}
            onClick={() => setFilter(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className={styles.stateText}>Loading…</p>}
      {error && <p className={cn(styles.stateText, styles.stateError)}>{error}</p>}

      {!isLoading && !error && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFoods.map((food) => (
              <tr key={food.id}>
                <td>
                  <div className={styles.itemCell}>
                    <div className={styles.thumb}>
                      {food.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={food.images[0].url} alt={food.name} />
                      ) : (
                        <span className={styles.thumbFallback}>{food.name.slice(0, 2)}</span>
                      )}
                    </div>
                    <span className={styles.itemName}>{food.name}</span>
                  </div>
                </td>
                <td className={styles.muted}>
                  {food.categories.map((category) => category.name).join(", ") || "—"}
                </td>
                <td>${food.price.toFixed(2)}</td>
                <td>
                  <StatusSwitch
                    checked={food.is_available}
                    onChange={(next) => handleToggleAvailability(food.id, next)}
                  />
                </td>
                <td>
                  <button type="button" className={styles.editLink}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {visibleFoods.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  Không có món nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}