"use client";

import { useEffect, useMemo, useState } from "react";
import { isAbortError, isApiError, menuApi } from "@/lib/api";
import type { Category, Food } from "@/types";
import CategoryTabs from "@/components/customer/CategoryTabs";
import FoodCard from "@/components/customer/FoodCard";
import styles from "./page.module.scss";

export default function CustomerMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [categoriesRes, foodsRes] = await Promise.all([
          menuApi.getCategories({ signal }),
          menuApi.getFoods({ signal }),
        ]);
        setCategories(categoriesRes);
        setFoods(foodsRes);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(isApiError(err) ? err.message : "Failed to load menu.");
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const filteredFoods = useMemo(() => {
    if (selectedCategoryId === "all") return foods;
    return foods.filter((food) =>
      food.categories.some((category) => category.id === selectedCategoryId),
    );
  }, [foods, selectedCategoryId]);

  return (
    <main className={styles.page}>
      <CategoryTabs
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <p className={styles.openingHours}>Welshpool WA &middot; Open 6 AM &ndash; 2 PM</p>

      <div className={styles.list}>
        {isLoading && <p className={styles.status}>Loading menu…</p>}

        {error && <p className={styles.error}>{error}</p>}

        {!isLoading && !error && filteredFoods.length === 0 && (
          <p className={styles.status}>No items in this category yet.</p>
        )}

        {!isLoading &&
          !error &&
          filteredFoods.map((food) => <FoodCard key={food.id} food={food} />)}
      </div>
    </main>
  );
}