"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight,} from "lucide-react";

import type { Food } from "@/types";
import styles from "./FoodImageModal.module.scss";

interface FoodImageModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
}

export default function FoodImageModal({
  isOpen,
  food,
  onClose,
}: FoodImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen, food]);

  if (!isOpen || !food) {
    return null;
  }

  const images = food.images ?? [];

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0
        ? images.length - 1
        : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === images.length - 1
        ? 0
        : prev + 1
    );
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* LEFT - IMAGE */}
        <div className={styles.imagePanel}>
          <img
            src={currentImage.url}
            alt={food.name}
            className={styles.mainImage}
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.arrow} ${styles.leftArrow}`}
                onClick={handlePrevious}
                aria-label="Previous image"
              >
                <ChevronLeft size={32} />
              </button>

              <button
                type="button"
                className={`${styles.arrow} ${styles.rightArrow}`}
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {images.length > 1 && (
            <div className={styles.counter}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* RIGHT - FOOD INFORMATION */}
        <div className={styles.infoPanel}>
          <h2 className={styles.name}>
            {food.name}
          </h2>

          <p className={styles.price}>
            ${food.price.toFixed(2)}
          </p>

          {food.description && (
            <div className={styles.descriptionSection}>
              <h3>Description</h3>
              <p>{food.description}</p>
            </div>
          )}

          {food.categories &&
            food.categories.length > 0 && (
              <div className={styles.categorySection}>
                <h3>Category</h3>

                <div className={styles.categories}>
                  {food.categories.map((category) => (
                    <span
                      key={category.id}
                      className={styles.category}
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}