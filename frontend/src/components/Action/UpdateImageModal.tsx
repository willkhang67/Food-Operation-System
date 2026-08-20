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

export default function UpdateImageModal({
  isOpen,
  food,
  onClose,
  onSuccess,
}: UpdateImageModalProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const [originalImages, setOriginalImages] = useState<ImageItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !food) return;

    setError(null);
    setNewImageUrl("");

    const loadImages = async () => {
      setLoadingImages(true);

      try {
        const data = await adminApi.getFoodImages(food.id);

        const mapped = data.map((image) => ({
          id: image.id,
          url: image.url,
        }));

        setImages(mapped);
        setOriginalImages(mapped);
      } catch (err) {
        setError(
          isApiError(err)
            ? err.message
            : "Unable to load images."
        );
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [isOpen, food]);

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

    if (!food) return;

    setError(null);
    setLoading(true);

    try {
      /*
       * 1. Những ảnh bị xóa
       */
      const deletedImages = originalImages.filter(
        (original) =>
          !images.some((current) => current.id === original.id)
      );

      /*
       * 2. Những ảnh mới được thêm
       */
      const addedImages = images.filter(
        (image) => image.id.startsWith("new-")
      );

      /*
       * 3. Delete ảnh cũ
       */
      for (const image of deletedImages) {
        await adminApi.deleteFoodImage(
          food.id,
          image.id
        );
      }

      /*
       * 4. Add ảnh mới
       */
      for (const image of addedImages) {
        await adminApi.addFoodImage(
          food.id,
          image.url
        );
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : "Unable to update images."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImages([]);
    setOriginalImages([]);
    setNewImageUrl("");
    setError(null);
    onClose();
  };

  if (!isOpen || !food) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Update Images</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Add image */}
          <div className={styles.field}>
            <label>Add Image (URL)</label>

            <div className={styles.imageInputGroup}>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) =>
                  setNewImageUrl(e.target.value)
                }
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

          {/* Images */}
          <div className={styles.field}>
            <label>
              Images ({images.length})
            </label>

            {loadingImages ? (
              <p className={styles.muted}>
                Loading images...
              </p>
            ) : images.length === 0 ? (
              <p className={styles.muted}>
                No images available.
              </p>
            ) : (
              <div className={styles.imagePreviewList}>
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={styles.imagePreviewItem}
                  >
                    <img
                      src={image.url}
                      alt="Food"
                      className={styles.imagePreview}
                      onClick={() => setSelectedImage(image)}
                    />

                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() =>
                        handleRemoveImage(image.id)
                      }
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
          {selectedImage && (
          <div
            className={styles.imageViewerOverlay}
            onClick={() => setSelectedImage(null)}
          >
            <div
              className={styles.imageViewer}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.imageViewerClose}
                onClick={() => setSelectedImage(null)}
              >
                <X size={24} />
              </button>

              <img
                src={selectedImage.url}
                alt="Food preview"
                className={styles.imageViewerImage}
              />
            </div>
          </div>
        )}
    </div>
  );
}