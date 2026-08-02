export default function KitchenPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
      <p className="[font-family:var(--font-display)] text-2xl font-semibold">Kitchen view</p>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Đây là nơi hiển thị order đang chờ chế biến theo thời gian thực. Cần API order/kitchen
        (chưa có trong controller đã cung cấp) để build màn hình này.
      </p>
    </main>
  );
}
