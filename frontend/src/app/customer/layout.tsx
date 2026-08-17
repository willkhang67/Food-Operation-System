import type { ReactNode } from "react";
import CartDock from "@/components/customer/CartDock";
import CustomerNav from "@/components/customer/CustomerNav";
import { CartProvider } from "@/providers/CartProvider";

/** Cart state is scoped to the customer area; kitchen and admin never load it. */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <CustomerNav />
      {children}
      <CartDock />
    </CartProvider>
  );
}
