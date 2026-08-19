"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, isApiError, menuApi } from "@/lib/api";
import type { Category } from "@/types";
import styles from "./AddFoodModal.module.scss";

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddFoodModal({
  isOpen,
  onClose,
  onSuccess,
}: AddFoodModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        setLoadingCategories(true);
        try {
          const data = await menuApi.getCategories();
          setCategories(data);
        } catch (err) {
          setError("Unable to load categories.");
        } finally {
          setLoadingCategories(false);
        }
      };
      loadCategories();
    }
  }, [isOpen]);

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setImageUrls([...imageUrls, imageInput.trim()]);
      setImageInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Food name is required");
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError("Price must be a positive number");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setError("Please select at least one category");
      return;
    }

    setLoading(true);
    try {
      await adminApi.createFood({
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        categoryIds: selectedCategoryIds,
        isAvailable,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Unable to add food.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setPrice("");
    setSelectedCategoryIds([]);
    setIsAvailable(true);
    setImageUrls([]);
    setImageInput("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Food</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="foodName">Food Name <span className={styles.required}>*</span></label>
            <input
              id="foodName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hotdog, ..."
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="foodDesc">Description</label>
            <textarea
              id="foodDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the food..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="foodPrice">
                Price (AUD) <span className={styles.required}>*</span>
            </label>
            <input
                id="foodPrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={loading}
            />
            </div>

          <div className={styles.field}>
            <label>Category <span className={styles.required}>*</span></label>
            {loadingCategories ? (
                <p className={styles.muted}>Loading categories...</p>
            ) : (
                <div className={styles.dropdownWrapper}>
                <button
                type="button"
                className={styles.dropdownTrigger}
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                disabled={loading}
                >
                {selectedCategoryIds.length > 0
                    ? categories
                        .filter((cat) => selectedCategoryIds.includes(cat.id))
                        .map((cat) => cat.name)
                        .join(", ")
                    : "Select categories..."}
                </button>
                {isCategoryDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                    {categories.length === 0 ? (
                        <p className={styles.muted}>No categories available</p>
                    ) : (
                        categories.map((cat) => (
                        <label key={cat.id} className={styles.dropdownItem}>
                            <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(cat.id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                                } else {
                                setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                                }
                            }}
                            disabled={loading}
                            />
                            <span className={styles.dropdownLabel}>{cat.name}</span>
                        </label>
                        ))
                    )}
                    </div>
                )}
                </div>
            )}
            </div>

          <div className={styles.field}>
            <label>Images (URL)</label>
            <div className={styles.imageInputGroup}>
              <input
                type="url"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={loading}
              />
              <button type="button" className={styles.addImageBtn} onClick={handleAddImage} disabled={loading}>
                Add
              </button>
            </div>
            {imageUrls.length > 0 && (
              <div className={styles.imagePreviewList}>
                {imageUrls.map((url, index) => (
                  <div key={index} className={styles.imagePreviewItem}>
                    <img src={url} alt={`Image ${index + 1}`} className={styles.imagePreview} />
                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() => handleRemoveImage(index)}
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Adding..." : "Add Food"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}