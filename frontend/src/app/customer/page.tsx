"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Category, Food } from "@/types";
import CategoryTabs from "@/components/customer/CategoryTabs";
import FoodCard from "@/components/customer/FoodCard";
import BottomNav from "@/components/customer/BottomNav";

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
    <main className="mx-auto max-w-md pb-24">
      {/* Restaurant header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-[#F5F1E8] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E07B39] text-sm font-bold text-white">
            JJ
          </div>
          <div>
            <p className="[font-family:var(--font-display)] text-xl font-semibold leading-tight">
              Jolly Jumbuk
            </p>
            <p className="text-sm text-neutral-500">Pick your feed</p>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
          <UserGlyph />
        </div>
      </div>

      <CategoryTabs
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <p className="px-4 pb-2 text-xs text-neutral-500">
        Welshpool WA &middot; Open 6 AM &ndash; 2 PM
      </p>

      <div className="flex flex-col gap-4 px-4">
        {isLoading && <p className="py-10 text-center text-sm text-neutral-500">Loading menu…</p>}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!isLoading && !error && filteredFoods.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-500">No items in this category yet.</p>
        )}

        {!isLoading &&
          !error &&
          filteredFoods.map((food) => <FoodCard key={food.id} food={food} />)}
      </div>

      <BottomNav />
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
