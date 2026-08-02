"use client";

import type { Category } from "@/types";

interface CategoryTabsProps {
  categories: Category[];
  selectedId: string; // "all" or a Category.id
  onSelect: (id: string) => void;
}

export default function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      className={
        active
          ? "shrink-0 rounded-full bg-[#E07B39] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
          : "shrink-0 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-[#E07B39]/50"
      }
    >
      {label}
    </button>
  );
}
