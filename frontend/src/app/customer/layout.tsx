import type { ReactNode } from "react";
import CustomerNav from "@/components/customer/CustomerNav";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomerNav />
      {children}
    </>
  );
}
