"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import KitchenOrderCard from "@/components/kitchen/KitchenOrderCard";
import { isApiError, orderApi } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { useNow } from "@/hooks/useNow";
import { queryKeys } from "@/lib/query-keys";
import { ApiErrorCode } from "@/types";
import styles from "./kitchen.module.scss";

const POLL_MS = 5_000;

function KitchenQueue() {
  const queryClient = useQueryClient();
  const nowMs = useNow();
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const queueQuery = useQuery({
    queryKey: queryKeys.orders.kitchen,
    queryFn: ({ signal }) => orderApi.getKitchenQueue({ signal }),
    staleTime: 0,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const markReady = useMutation({
    mutationFn: (orderId: string) => orderApi.updateStatus(orderId, "ready"),
    onMutate: (orderId) => {
      setActionErrors((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.kitchen });
      // Customer My Orders on another device will catch up via focus/refresh;
      // same-browser staff preview still benefits from a targeted wipe.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.mine(updated.userId),
      });
    },
    onError: (error, orderId) => {
      let message = toErrorMessage(error, "Could not mark this order ready.");
      if (isApiError(error)) {
        if (error.code === ApiErrorCode.Forbidden) {
          message = "You do not have permission to update kitchen orders.";
        } else if (error.code === ApiErrorCode.ValidationError) {
          message = error.message;
          void queryClient.invalidateQueries({ queryKey: queryKeys.orders.kitchen });
        }
      }
      setActionErrors((current) => ({ ...current, [orderId]: message }));
    },
  });

  const orders = queueQuery.data ?? [];
  const isFirstLoad = queueQuery.isPending && !queueQuery.data;
  const loadError = queueQuery.error
    ? toErrorMessage(queueQuery.error, "Could not load the kitchen queue.")
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Kitchen</h1>
          <p className={styles.subtitle}>
            Paid orders only. Countdown is an estimate — press Mark ready when food is done.
          </p>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => void queryClient.invalidateQueries({ queryKey: queryKeys.orders.kitchen })}
          disabled={queueQuery.isFetching}
        >
          {queueQuery.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {loadError && (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      )}

      {isFirstLoad && <p className={styles.status}>Loading queue…</p>}

      {!isFirstLoad && !loadError && orders.length === 0 && (
        <p className={styles.empty}>No orders waiting. New paid tickets appear here automatically.</p>
      )}

      {orders.length > 0 && (
        <ul className={styles.list}>
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              nowMs={nowMs}
              isMarkingReady={markReady.isPending && markReady.variables === order.id}
              actionError={actionErrors[order.id] ?? null}
              onMarkReady={() => markReady.mutate(order.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

/** Client page so refused visitors never receive the kitchen shell in the RSC payload. */
export default function KitchenPage() {
  return (
    <RouteGuard roles={["admin", "staff"]}>
      <KitchenQueue />
    </RouteGuard>
  );
}
