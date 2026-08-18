import type { Metadata } from "next";
import MyOrders from "./MyOrders";

export const metadata: Metadata = {
  title: "Your orders",
  // The page lists order references and totals; it has no business in an index.
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <MyOrders />;
}
