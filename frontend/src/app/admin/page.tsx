"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, isAbortError, isApiError, menuApi } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Food } from "@/types";

import StatusSwitch from "@/components/admin/StatusSwitch";
import AddFoodModal from "@/components/Action/AddFoodModal";
import EditFoodMenuModal from "@/components/admin/EditFoodMenuModal";
import EditFoodModal from "@/components/Action/EditFoodModal";
import UpdatePriceModal from "@/components/Action/UpdatePriceModal";
import UpdateImageModal from "@/components/Action/UpdateImageModal";
import DeleteFoodModal from "@/components/Action/DeleteFoodModal";

import styles from "./page.module.scss";

type FilterMode = "all" | "available" | "hidden";

type EditOption = "basic" | "price" | "image";

const FILTERS: { mode: FilterMode; label: string }[] = [
  { mode: "all", label: "All items" },
  { mode: "available", label: "Available only" },
  { mode: "hidden", label: "Hidden" },
];

export default function AdminFoodPage() {
  const { user, status } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [isEditFoodOpen, setIsEditFoodOpen] = useState(false);
  const [isUpdatePriceOpen, setIsUpdatePriceOpen] = useState(false);
  const [isUpdateImageOpen, setIsUpdateImageOpen] = useState(false);

  const [isDeleteFoodModalOpen, setIsDeleteFoodModalOpen] = useState(false);
  const [deletingFood, setDeletingFood] = useState<Food | null>(null);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const authBlocked =
    status !== "loading" && (status !== "authenticated" || !isAdmin);
  const authBlockedMessage = authBlocked
    ? "You need to log in with an Admin account"
    : null;

  useEffect(() => {
    if (status === "loading" || authBlocked) return;

    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await menuApi.getFoods({
          signal: controller.signal,
        });

        setFoods(data);
      } catch (err) {
        if (isAbortError(err)) return;

        setError(
          isApiError(err)
            ? err.message
            : "Failed to load foods.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [status, isAdmin, authBlocked]);

  const showLoading = status === "loading" || isLoading;
  const displayError = authBlockedMessage ?? error;

  const visibleFoods = useMemo(() => {
    if (filter === "available") {
      return foods.filter((food) => food.is_available);
    }

    if (filter === "hidden") {
      return foods.filter((food) => !food.is_available);
    }

    return foods;
  }, [foods, filter]);

  const reloadFoods = async () => {
    try {
      const data = await menuApi.getFoods();
      setFoods(data);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : "Failed to reload foods.",
      );
    }
  };

  const handleToggleAvailability = async (
    foodId: string,
    next: boolean,
  ) => {
    const previousFoods = foods;

    setFoods((prev) =>
      prev.map((food) =>
        food.id === foodId
          ? {
              ...food,
              is_available: next,
            }
          : food,
      ),
    );

    try {
      await adminApi.toggleFoodAvailability(foodId);
    } catch (err) {
      setFoods(previousFoods);

      setError(
        isApiError(err)
          ? err.message
          : "Failed to update availability.",
      );
    }
  };

  const handleEditOption = (option: EditOption) => {
    if (!selectedFood) return;

    setIsEditMenuOpen(false);

    if (option === "basic") {
      setIsEditFoodOpen(true);
      return;
    }

    if (option === "price") {
      setIsUpdatePriceOpen(true);
      return;
    }

    if (option === "image") {
      setIsUpdateImageOpen(true);
      return;
    }
  };

  const handleBasicInfoUpdated = async () => {
    await reloadFoods();
  };

  const handlePriceUpdated = async () => {
    await reloadFoods();
  };

  const handleImageUpdated = async () => {
    await reloadFoods();
  };

  const handleFoodDeleted = async () => {
    await reloadFoods();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Menu</h1>
          <p className={styles.subtitle}>
            {foods.length} items
          </p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={() => setIsAddFoodModalOpen(true)}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add item
        </button>
      </div>

      <div className={styles.filters}>
        {FILTERS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            className={cn(
              styles.filterPill,
              filter === mode && styles.filterPillActive,
            )}
            onClick={() => setFilter(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      {showLoading && (
        <p className={styles.stateText}>
          Loading…
        </p>
      )}

      {displayError && (
        <p
          className={cn(
            styles.stateText,
            styles.stateError,
          )}
        >
          {displayError}
        </p>
      )}

      {!showLoading && !displayError && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleFoods.map((food) => (
              <tr key={food.id}>
                <td>
                  <div className={styles.itemCell}>
                    <div className={styles.thumb}>
                      {food.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin thumbs use arbitrary Cloudinary URLs
                        <img
                          src={food.images[0].url}
                          alt={food.name}
                        />
                      ) : (
                        <span className={styles.thumbFallback}>
                          {food.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <span className={styles.itemName}>
                      {food.name}
                    </span>
                  </div>
                </td>

                <td className={styles.muted}>
                  {food.categories
                    .map((category) => category.name)
                    .join(", ") || "—"}
                </td>

                <td>
                  ${food.price.toFixed(2)}
                </td>

                <td>
                  <StatusSwitch
                    checked={food.is_available}
                    onChange={(next) =>
                      handleToggleAvailability(
                        food.id,
                        next,
                      )
                    }
                  />
                </td>

                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => {
                        setSelectedFood(food);
                        setIsEditMenuOpen(true);
                      }}
                    >
                      Edit
                    </button>

                    {filter === "hidden" && (
                      <button
                        type="button"
                        className={styles.deleteLink}
                        onClick={() => {
                          setDeletingFood(food);
                          setIsDeleteFoodModalOpen(true);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {visibleFoods.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className={styles.emptyRow}
                >
                  No suitable items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <AddFoodModal
        isOpen={isAddFoodModalOpen}
        onClose={() =>
          setIsAddFoodModalOpen(false)
        }
        onSuccess={reloadFoods}
      />

      {isEditMenuOpen && (
        <EditFoodMenuModal
          isOpen={isEditMenuOpen}
          food={selectedFood}
          onClose={() => {
            setIsEditMenuOpen(false);
            setSelectedFood(null);
          }}
          onSelect={handleEditOption}
        />
      )}

      {isEditFoodOpen && (
        <EditFoodModal
          isOpen={isEditFoodOpen}
          food={selectedFood}
          onClose={() => {
            setIsEditFoodOpen(false);
            setSelectedFood(null);
          }}
          onSuccess={handleBasicInfoUpdated}
        />
      )}

      {isUpdatePriceOpen && (
        <UpdatePriceModal
          isOpen={isUpdatePriceOpen}
          food={selectedFood}
          onClose={() => {
            setIsUpdatePriceOpen(false);
            setSelectedFood(null);
          }}
          onSuccess={handlePriceUpdated}
        />
      )}

      {isUpdateImageOpen && (
        <UpdateImageModal
          isOpen={isUpdateImageOpen}
          food={selectedFood}
          onClose={() => {
            setIsUpdateImageOpen(false);
            setSelectedFood(null);
          }}
          onSuccess={handleImageUpdated}
        />
      )}

      <DeleteFoodModal
        isOpen={isDeleteFoodModalOpen}
        food={deletingFood}
        onClose={() => {
          setIsDeleteFoodModalOpen(false);
          setDeletingFood(null);
        }}
        onSuccess={handleFoodDeleted}
      />
    </div>
  );
}