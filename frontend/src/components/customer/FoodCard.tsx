"use client";

import type { Food } from "@/types";
import styles from "./FoodCard.module.scss";

interface FoodCardProps {
  food: Food;
  onAdd?: (food: Food) => void;
}

export default function FoodCard({ food, onAdd }: FoodCardProps) {
  const imageUrl = food.images?.[0]?.url;

  return (
    <div className={styles.card}>
      <div className={styles.media}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images come from an arbitrary backend host
          <img src={imageUrl} alt={food.name} className={styles.image} />
        ) : (
          <div className={styles.imageFallback}>No image</div>
        )}
        {!food.is_available && (
          <div className={styles.soldOutOverlay}>
            <span className={styles.soldOutBadge}>Sold out</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div>
          <p className={styles.name}>{food.name}</p>
          <p className={styles.price}>${food.price.toFixed(2)}</p>
        </div>

        <button
          type="button"
          disabled={!food.is_available}
          onClick={() => onAdd?.(food)}
          aria-label={`Add ${food.name}`}
          className={styles.addButton}
        >
          +
        </button>
      </div>
    </div>
  );
}
