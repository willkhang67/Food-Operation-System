"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { adminApi, isApiError } from "@/lib/api";
import type { Food, FoodBasic } from "@/types";
import styles from "./UpdatePriceModal.module.scss";

interface UpdatePriceModalProps {
  isOpen: boolean;
  food: Food | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpdatePriceModal({isOpen, food, onClose, onSuccess,}: UpdatePriceModalProps) {
  const [newPrice, setNewPrice] = useState("");
  const [history, setHistory] = useState<FoodBasic[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !food) return;

    setNewPrice("");
    setHistory([]);
    setShowHistory(false);
    setError(null);
  }, [isOpen, food]);

  if (!isOpen || !food) return null;

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    setLoadingHistory(true);
    setError(null);

    try {
      const data = await adminApi.getPriceHistory(food.id);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : "Unable to load price history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPrice) {
      setError("Please enter a new price.");
      return;
    }

    const price = Number(newPrice);

    if (Number.isNaN(price) || price <= 0) {
      setError("Price must be a positive number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminApi.updatePrice(food.name, {
        price,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : "Unable to update price."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${
          showHistory ? styles.modalWithHistory : ""
        }`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Update Price</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div
          className={
            showHistory
              ? styles.contentWithHistory
              : styles.content
          }
        >
          {showHistory && (
            <div className={styles.historyPanel}>
              <div className={styles.historyHeader}>
                <h3>Price History</h3>
              </div>

              {loadingHistory ? (
                <p className={styles.muted}>
                  Loading price history...
                </p>
              ) : history.length === 0 ? (
                <p className={styles.muted}>
                  No price history available.
                </p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>Food Name</th>
                        <th>Time</th>
                        <th>Price</th>
                      </tr>
                    </thead>

                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>

                          <td>
                            {formatDate(item.createdAt)}
                          </td>

                          <td>
                            ${Number(item.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.priceRow}>
              <div className={styles.field}>
                <label>Current Price</label>

                <input
                  type="text"
                  value={`$${Number(food.price).toFixed(2)}`}
                  disabled
                />
              </div>

              <div className={styles.field}>
                <label>
                  New Price{" "}
                  <span className={styles.required}>*</span>
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(e.target.value)
                  }
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.historyButton}
              onClick={handleShowHistory}
              disabled={loading || loadingHistory}
            >
              {loadingHistory
                ? "Loading..."
                : showHistory
                  ? "Hide Price History"
                  : "Price History"}
            </button>

            {error && (
              <p className={styles.error}>{error}</p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={loading}
              >
                Close
              </button>

              <button
                type="submit"
                className={styles.saveBtn}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}