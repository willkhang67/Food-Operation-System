"use client";

import { X } from "lucide-react";
import type { Food } from "@/types";
import styles from "./EditFoodMenuModal.module.scss";

type EditOption = "basic" | "price" | "image";

interface EditFoodMenuModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
  onSelect: (option: EditOption) => void;
}

export default function EditFoodMenuModal({
  isOpen,
  food,
  onClose,
  onSelect,
}: EditFoodMenuModalProps) {
  if (!isOpen || !food) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Food</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <p className={styles.subtitle}>
          What would you like to edit?
        </p>

        <div className={styles.options}>
          <button
            type="button"
            className={styles.option}
            onClick={() => onSelect("basic")}
          >
            <span className={styles.optionTitle}>
              Basic Information
            </span>
            <span className={styles.optionDescription}>
              Edit food name, description, category and availability.
            </span>
          </button>

          <button
            type="button"
            className={styles.option}
            onClick={() => onSelect("price")}
          >
            <span className={styles.optionTitle}>
              Update Price
            </span>
            <span className={styles.optionDescription}>
              Change the current food price
            </span>
          </button>

          <button
            type="button"
            className={styles.option}
            onClick={() => onSelect("image")}
          >
            <span className={styles.optionTitle}>
              Update Image
            </span>
            <span className={styles.optionDescription}>
              Add, remove or update food images
            </span>
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}