"use client";

import type { Food } from "@/types";

interface FoodCardProps {
  food: Food;
  onAdd?: (food: Food) => void;
}

export default function FoodCard({ food, onAdd }: FoodCardProps) {
  const imageUrl = food.images?.[0]?.url;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-neutral-200">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images come from an arbitrary backend host
          <img src={imageUrl} alt={food.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
        {!food.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-800">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="[font-family:var(--font-display)] text-lg font-semibold text-neutral-900">
            {food.name}
          </p>
          <p className="text-sm font-semibold text-[#E07B39]">
            ${food.price.toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          disabled={!food.is_available}
          onClick={() => onAdd?.(food)}
          aria-label={`Add ${food.name}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E07B39] text-xl font-bold text-white transition-transform enabled:hover:scale-105 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
