"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuApi } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { queryKeys } from "@/lib/query-keys";
import { useCart } from "@/providers/CartProvider";
import CategoryTabs from "@/components/customer/CategoryTabs";
import FoodCard from "@/components/customer/FoodCard";
import styles from "./page.module.scss";

/** Public menu changes rarely mid-lunch; longer staleTime avoids tab-switch refetch. */
const MENU_STALE_MS = 60_000;

export default function CustomerMenuPage() {
  const { add } = useCart();
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const categoriesQuery = useQuery({
    queryKey: queryKeys.menu.categories,
    queryFn: ({ signal }) => menuApi.getCategories({ signal }),
    staleTime: MENU_STALE_MS,
    // Menu is public; focus refetch is noise while browsing tabs.
    refetchOnWindowFocus: false,
  });

  const foodsQuery = useQuery({
    queryKey: queryKeys.menu.foods,
    queryFn: ({ signal }) => menuApi.getFoods({ signal }),
    staleTime: MENU_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const categories = categoriesQuery.data ?? [];

  // First visit only — keep showing cached rows while a background refresh runs.
  const isLoading =
    (categoriesQuery.isPending && !categoriesQuery.data) ||
    (foodsQuery.isPending && !foodsQuery.data);

  const errorSource = categoriesQuery.error ?? foodsQuery.error;
  const error = errorSource ? toErrorMessage(errorSource, "Failed to load menu.") : null;

  const filteredFoods = useMemo(() => {
    const foods = foodsQuery.data ?? [];
    if (selectedCategoryId === "all") return foods;
    return foods.filter((food) =>
      food.categories.some((category) => category.id === selectedCategoryId),
    );
  }, [foodsQuery.data, selectedCategoryId]);

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
          filteredFoods.map((food) => (
            <FoodCard key={food.id} food={food} onAdd={add} />
          ))}
      </div>
    </main>
  );
}
