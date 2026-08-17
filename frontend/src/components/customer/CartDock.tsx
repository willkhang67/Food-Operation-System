"use client";

import { useState } from "react";
import { useCart } from "@/providers/CartProvider";
import CartBar from "./CartBar";
import CartSheet from "./CartSheet";

/**
 * Owns whether the cart sheet is showing, so the bar and the sheet cannot
 * disagree about it and the customer layout has a single thing to mount.
 */
export default function CartDock() {
  const { totalItems, estimatedTotal } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <CartBar
        totalItems={totalItems}
        estimatedTotal={estimatedTotal}
        onOpen={() => setIsOpen(true)}
      />
      {isOpen && <CartSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}
