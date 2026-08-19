"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import type { Food } from "@/types";
import styles from "./DeleteFoodModal.module.scss";

interface DeleteFoodModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteFoodModal({ isOpen, food, onClose, onSuccess }: DeleteFoodModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !food) return null;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminApi.softDeleteFood(food.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Can not delete food");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    setError(null);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Delete Food</h2>
          <button className={styles.closeButton} onClick={handleClose}><X size={24} strokeWidth={2} /></button>
        </div>
        <div className={styles.content}>
          <p className={styles.message}>Are you sure you want to delete the food <strong>“{food.name}”</strong>?</p>
          {!confirmDelete && <p className={styles.subMessage}>The food will be hidden (status=0) and will not be displayed.</p>}
          {confirmDelete && <p className={styles.confirmMessage}>⚠️ Final confirmation: Are you sure you want to delete this food?</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={loading}>
            {confirmDelete ? "Cancel" : "Close"}
          </button>
          <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : (confirmDelete ? "Delete" : "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}