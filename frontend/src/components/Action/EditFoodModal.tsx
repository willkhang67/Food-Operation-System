"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError, menuApi } from "@/lib/api";
import type { Food, Category } from "@/types";
import styles from "./EditFoodModal.module.scss";

interface EditFoodModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditFoodModal({ isOpen, food, onClose, onSuccess }: EditFoodModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen && food) {
      setName(food.name);
      setDescription(food.description || "");
      setCookTime(String(food.cookTime ?? ""));   
      setSelectedCategoryIds(food.categories.map(c => c.id));
      setIsAvailable(food.is_available);
      setError(null);
    }
  }, [isOpen, food]);

  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        setLoadingCategories(true);
        try {
          const data = await menuApi.getCategories();
          setCategories(data);
        } catch {
          setError("Cannot load categories");
        } finally {
          setLoadingCategories(false);
        }
      };
      loadCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Food name is required");
    // if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    //   return setError("Price must be a positive number");
    if (selectedCategoryIds.length === 0)
      return setError("Please select at least one category");
    if (!food) return;

    setLoading(true);
    try {
      await adminApi.updateFood(food.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        // price: parseFloat(price),
        categoryIds: selectedCategoryIds,
        isAvailable,
        cookTime: cookTime ? parseInt(cookTime, 10) : undefined,
        // images: imageUrls.length > 0 ? imageUrls : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Cannot update food");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedCategoryIds([]);
    setIsAvailable(true);
    setError(null);
    setIsDropdownOpen(false);
    onClose();
  };

  if (!isOpen || !food) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Food</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={24} strokeWidth={2} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Food Name <span className={styles.required}>*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={loading} />
          </div>
          <div className={styles.field}>
            <label htmlFor="cookTime">
              Cook Time (min) <span className={styles.required}>*</span>
            </label>
            <input
              id="cookTime"
              type="number"
              min="1"
              step="1"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="e.g. 15"
              disabled={loading}
            />
          </div>
          {/* <div className={styles.field}>
            <label>Price (AUD) <span className={styles.required}>*</span></label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
          </div> */}
          <div className={styles.field}>
            <label>Category <span className={styles.required}>*</span></label>
            {loadingCategories ? (
              <p className={styles.muted}>Loading...</p>
            ) : (
              <div className={styles.dropdownWrapper}>
                <button type="button" className={styles.dropdownTrigger} onClick={() => setIsDropdownOpen(!isDropdownOpen)} disabled={loading}>
                  {selectedCategoryIds.length > 0 ? `Selected ${selectedCategoryIds.length} categories` : "Select categories..."}
                </button>
                {isDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {categories.map((cat) => (
                      <label key={cat.id} className={styles.dropdownItem}>
                        <input type="checkbox" checked={selectedCategoryIds.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                            else setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                          }}
                          disabled={loading}
                        />
                        <span className={styles.dropdownLabel}>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* <div className={styles.field}>
            <label>Image (URL)</label>
            <div className={styles.imageInputGroup}>
              <input type="url" value={imageInput} onChange={(e) => setImageInput(e.target.value)} disabled={loading} />
              <button type="button" className={styles.addImageBtn} onClick={handleAddImage} disabled={loading}>Add Image</button>
            </div>
            <div className={styles.imagePreviewList}>
              {imageUrls.map((url, idx) => (
                <div key={idx} className={styles.imagePreviewItem}>
                  <img src={url} className={styles.imagePreview} />
                  <button type="button" className={styles.removeImageBtn} onClick={() => handleRemoveImage(idx)} disabled={loading}>×</button>
                </div>
              ))}
            </div>
          </div> */}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={loading}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}