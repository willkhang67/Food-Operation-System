"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
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
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [categoriesRes, foodsRes] = await Promise.all([
          api.getCategories(),
          api.getFoods(),
        ]);
        if (!cancelled) {
          setCategories(categoriesRes);
          setFoods(foodsRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load menu.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFoods = useMemo(() => {
    if (selectedCategoryId === "all") return foods;
    return foods.filter((food) =>
      food.categories.some((category) => category.id === selectedCategoryId),
    );
  }, [foods, selectedCategoryId]);

  return (
    <main className={styles.page}>
      {/* <div className={styles.storeHeader}>
        <div className={styles.brand}>
          <div className={styles.brandBadge}>JJ</div>
          <div>
            <p className={styles.brandName}>Jolly Jumbuk</p>
            <p className={styles.brandTagline}>Pick your feed</p>
          </div>
        </div>
        <div className={styles.avatar}>
          <UserGlyph />
        </div>
      </div> */}

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

function UserGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7" />
    </svg>
  );
}
