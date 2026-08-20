"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import type { Food } from "@/types";
import styles from "./AddFoodModal.module.scss";

interface ImageItem {
  id: string;
  url: string;
}

interface UpdateImageModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UpdateImageFormProps {
  food: Food;
  onClose: () => void;
  onSuccess?: () => void;
}

function UpdateImageForm({ food, onClose, onSuccess }: UpdateImageFormProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [originalImages, setOriginalImages] = useState<ImageItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadImages() {
      setLoadingImages(true);

      try {
        const data = await adminApi.getFoodImages(food.id);

        const mapped = data.map((image) => ({
          id: image.id,
          url: image.url,
        }));

        if (!controller.signal.aborted) {
          setImages(mapped);
          setOriginalImages(mapped);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(isApiError(err) ? err.message : "Unable to load images.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingImages(false);
      }
    }

    void loadImages();

    return () => controller.abort();
  }, [food.id]);

  const handleAddImage = () => {
    const url = newImageUrl.trim();

    if (!url) return;

    if (images.some((image) => image.url === url)) {
      setError("This image already exists.");
      return;
    }

    setImages([
      ...images,
      {
        id: `new-${Date.now()}`,
        url,
      },
    ]);

    setNewImageUrl("");
    setError(null);
  };

  const handleRemoveImage = (id: string) => {
    setImages(images.filter((image) => image.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const deletedImages = originalImages.filter(
        (original) => !images.some((current) => current.id === original.id),
      );

      const addedImages = images.filter((image) => image.id.startsWith("new-"));

      for (const image of deletedImages) {
        await adminApi.deleteFoodImage(food.id, image.id);
      }

      for (const image of addedImages) {
        await adminApi.addFoodImage(food.id, image.url);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Unable to update images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Update Images</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Add Image (URL)</label>

            <div className={styles.imageInputGroup}>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={loading}
              />

              <button
                type="button"
                className={styles.addImageBtn}
                onClick={handleAddImage}
                disabled={loading}
              >
                Add
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Images ({images.length})</label>

            {loadingImages ? (
              <p className={styles.muted}>Loading images...</p>
            ) : images.length === 0 ? (
              <p className={styles.muted}>No images available.</p>
            ) : (
              <div className={styles.imagePreviewList}>
                {images.map((image) => (
                  <div key={image.id} className={styles.imagePreviewItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- previews use arbitrary admin-supplied URLs */}
                    <img src={image.url} alt="Food" className={styles.imagePreview} />

                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() => handleRemoveImage(image.id)}
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
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UpdateImageModal({
  isOpen,
  food,
  onClose,
  onSuccess,
}: UpdateImageModalProps) {
  if (!isOpen || !food) return null;

  return <UpdateImageForm key={food.id} food={food} onClose={onClose} onSuccess={onSuccess} />;
}
