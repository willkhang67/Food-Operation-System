"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { isAbortError, isApiError, menuApi } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Category } from "@/types";
import styles from "./page.module.scss";

export default function AdminCategoriesPage() {
  const { user, status } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

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

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: đổi sang endpoint admin (/category/all) khi cần thấy cả
        // category đang inactive, chưa chỉ active như hiện tại.
        const data = await menuApi.getCategories({ signal: controller.signal });
        setCategories(data);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(isApiError(err) ? err.message : "Failed to load categories.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [status, isAdmin]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>{categories.length} categories</p>
        </div>
        <button type="button" className={styles.addButton}>
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
                  {/* TODO: mở form/trang edit khi có chức năng chỉnh sửa */}
                  <button type="button" className={styles.editLink}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  Chưa có category nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}