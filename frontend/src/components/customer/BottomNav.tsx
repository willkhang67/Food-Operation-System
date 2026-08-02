"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardList, User } from "lucide-react";

const TABS = [
  { href: "/customer", label: "Menu", icon: LayoutGrid },
  { href: "/customer/orders", label: "Orders", icon: ClipboardList },
  { href: "/customer/account", label: "Account", icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={
                isActive
                  ? "flex flex-col items-center gap-1 px-4 py-1 text-[#E07B39]"
                  : "flex flex-col items-center gap-1 px-4 py-1 text-neutral-500"
              }
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
