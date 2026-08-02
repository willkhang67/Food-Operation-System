import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import RoleNav from "@/components/layout/RoleNav";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Jolly Jumbuk",
  description: "Food operation ordering system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body
        className={`${fraunces.variable} ${nunito.variable} min-h-screen bg-[#F5F1E8] text-neutral-900`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <RoleNav />
        {children}
      </body>
    </html>
  );
}
