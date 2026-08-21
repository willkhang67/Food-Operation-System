"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import type { Category } from "@/types";
import styles from "./AddCategoryModal.module.scss";

interface EditCategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EditCategoryFormProps {
  category: Category;
  onClose: () => void;
  onSuccess?: () => void;
}

function EditCategoryForm({ category, onClose, onSuccess }: EditCategoryFormProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
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
      await adminApi.updateCategory(category.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Unable to update category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Category</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="editCategoryName">
              Category Name <span className={styles.required}>*</span>
            </label>
            <input
              id="editCategoryName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages, Main Courses..."
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="editCategoryDesc">Description (optional)</label>
            <textarea
              id="editCategoryDesc"
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditCategoryModal({
  isOpen,
  category,
  onClose,
  onSuccess,
}: EditCategoryModalProps) {
  if (!isOpen || !category) return null;

  return (
    <EditCategoryForm
      key={category.id}
      category={category}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
