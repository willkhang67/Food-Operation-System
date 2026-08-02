import BottomNav from "@/components/customer/BottomNav";

export default function OrdersPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-24 text-center">
      <p className="[font-family:var(--font-display)] text-xl font-semibold">Your orders</p>
      <p className="mt-2 text-sm text-neutral-500">
        Chưa có API order — nối vào khi backend cung cấp endpoint tương ứng.
      </p>
      <BottomNav />
    </main>
  );
}
