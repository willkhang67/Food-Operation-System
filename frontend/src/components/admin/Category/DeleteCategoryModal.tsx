"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import type { Category } from "@/types";
import styles from "./DeleteCategoryModal.module.scss";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteCategoryModal({
  isOpen,
  category,
  onClose,
  onSuccess,
}: DeleteCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !category) return null;

  const handleDelete = async () => {
    if (!confirmDelete) {
      
      setConfirmDelete(true);
      return;
    }

    
    setLoading(true);
    setError(null);
    try {
      await adminApi.softDeleteCategory(category.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Unable to delete category");
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
          <h2 className={styles.title}>Delete Category</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Are you sure you want to delete the category <strong>“{category.name}”</strong>?
          </p>
          {!confirmDelete && (
            <p className={styles.subMessage}>
              The category will be hidden and will not be displayed on the system.
            </p>
          )}
          {confirmDelete && (
            <p className={styles.confirmMessage}>
              Final Confirmation: Are you sure you want to delete this category?
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={loading}
          >
            {confirmDelete ? "Cancel" : "Close"}
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : (confirmDelete ? "Delete" : "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}