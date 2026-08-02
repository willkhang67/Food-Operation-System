import Link from "next/link";

const CARDS = [
  { href: "/customer", title: "Customer", desc: "Xem menu, đặt món theo category." },
  { href: "/kitchen", title: "Kitchen", desc: "Theo dõi order đang chờ chế biến." },
  { href: "/admin", title: "Admin", desc: "Quản lý món ăn, category, đơn hàng." },
] as const;

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-center">
      <p className="[font-family:var(--font-display)] text-3xl font-semibold">Jolly Jumbuk</p>
      <p className="mt-2 text-neutral-500">Chọn một khu vực để xem demo.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="[font-family:var(--font-display)] text-lg font-semibold">{card.title}</p>
            <p className="mt-1 text-sm text-neutral-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
