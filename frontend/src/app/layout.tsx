import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import Header from "@/components/header/Header";
import RoleNav from "@/components/layout/RoleNav";
import { AuthDialogProvider } from "@/providers/AuthDialogProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";
import styles from "./layout.module.scss";

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
    <html lang="en">
      <body className={`${fraunces.variable} ${nunito.variable}`}>
        <QueryProvider>
          <AuthProvider>
            <AuthDialogProvider>
              <div className={styles.topBar}>
                <Header />
                <RoleNav />
              </div>
              {children}
            </AuthDialogProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
