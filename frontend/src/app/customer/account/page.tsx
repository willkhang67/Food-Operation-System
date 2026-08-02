import BottomNav from "@/components/customer/BottomNav";

export default function AccountPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-24 text-center">
      <p className="[font-family:var(--font-display)] text-xl font-semibold">Account</p>
      <p className="mt-2 text-sm text-neutral-500">
        Chưa có API auth — nối vào khi có endpoint đăng nhập / hồ sơ.
      </p>
      <BottomNav />
    </main>
  );
}
