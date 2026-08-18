import type { Metadata } from "next";
import MyAccount from "./MyAccount";

export const metadata: Metadata = {
  title: "Account",
  // The page shows a customer's contact details; it has no business in an index.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <MyAccount />;
}
