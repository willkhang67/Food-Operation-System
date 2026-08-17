"use client";

import { ShoppingBag } from "lucide-react";
import styles from "./CartBar.module.scss";

interface CartBarProps {
  totalItems: number;
  estimatedTotal: number;
  onOpen: () => void;
}

/** Floats above the customer tab bar. Renders nothing while the cart is empty. */
export default function CartBar({ totalItems, estimatedTotal, onOpen }: CartBarProps) {
  if (totalItems === 0) return null;

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.bar} onClick={onOpen}>
        <span className={styles.badge}>
          <ShoppingBag size={18} strokeWidth={2} />
          <span className={styles.count}>{totalItems}</span>
        </span>
        <span className={styles.label}>View cart</span>
        <span className={styles.notice}>Cart reset when you refresh/change/remove tabs</span>
        <span className={styles.total}>${estimatedTotal.toFixed(2)}</span>
      </button>
    </div>
  );
}
