"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { isAbortError, isApiError, menuApi } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Category } from "@/types";
import AddCategoryModal from "@/components/admin/Category/AddCategoryModal";
import EditCategoryModal from "@/components/admin/Category/EditCategoryModal";
import DeleteCategoryModal from "@/components/admin/Category/DeleteCategoryModal";
import styles from "./page.module.scss";

export default function AdminCategoriesPage() {
  const { user, status } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const loadCategories = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await menuApi.getCategories({ signal });
      setCategories(data);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(isApiError(err) ? err.message : "Failed to load categories.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    if (status !== "authenticated" || !isAdmin) {
      setCategories([]);
      setError("You need to log in with an Admin account");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    loadCategories(controller.signal);
    return () => controller.abort();
  }, [status, isAdmin]);

  const handleCategoryAdded = () => {
    loadCategories();
  };

  const handleCategoryUpdated = () => {
    loadCategories();
  };

  const handleCategoryDeleted = () => {
    loadCategories();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>{categories.length} categories</p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add category
        </button>
      </div>

      {isLoading && <p className={styles.stateText}>Loading…</p>}
      {error && <p className={cn(styles.stateText, styles.stateError)}>{error}</p>}

      {!isLoading && !error && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className={styles.itemName}>{category.name}</td>
                <td className={styles.muted}>{category.description ?? "—"}</td>
                <td>
                  <span
                    className={cn(
                      styles.statusPill,
                      category.status === 1 ? styles.statusActive : styles.statusInactive,
                    )}
                  >
                    {category.status === 1 ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => {
                        setEditingCategory(category);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className={styles.deleteLink}
                      onClick={() => {
                        setDeletingCategory(category);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  Not found any categories
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleCategoryAdded}
      />

      <EditCategoryModal
        isOpen={isEditModalOpen}
        category={editingCategory}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={handleCategoryUpdated}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        category={deletingCategory}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCategory(null);
        }}
        onSuccess={handleCategoryDeleted}
      />
    </div>
  );
}