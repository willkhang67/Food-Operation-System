import { redirect } from "next/navigation";

/** The demo role picker is retired; send every request to the customer entry. */
export default function DemoPage() {
  redirect("/customer");
}
