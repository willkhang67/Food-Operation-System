"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import styles from "./AddCategoryModal.module.scss";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    try {
      await adminApi.createCategory({ name: name.trim(), description: description.trim() || undefined });
      // Reset form
      setName("");
      setDescription("");
      onSuccess?.();
      onClose(); // tự động đóng sau khi thành công
    } catch (err) {
      setError(isApiError(err) ? err.message : "Unable to add category");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Category</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="categoryName">Category Name <span className={styles.required}>*</span></label>
            <input
              id="categoryName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages, Main Courses..."
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="categoryDesc">Description (optional)</label>
            <textarea
              id="categoryDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the category..."
              rows={3}
              disabled={loading}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Adding..." : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}