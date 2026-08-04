"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROLES = [
  { href: "/demo", label: "DEMO" },
  { href: "/customer", label: "Customer" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/admin", label: "Admin" },
] as const;

export default function RoleNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-center gap-2 bg-[#211C16] px-4 py-3">
      {ROLES.map((role) => {
        const isActive = pathname === role.href || pathname.startsWith(`${role.href}/`);
        return (
          <Link
            key={role.href}
            href={role.href}
            className={
              isActive
                ? "rounded-full bg-[#E07B39] px-4 py-1.5 text-sm font-semibold text-white transition-colors"
                : "rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide text-neutral-400 transition-colors hover:text-white"
            }
          >
            {role.label}
          </Link>
        );
      })}
    </nav>
  );
}
