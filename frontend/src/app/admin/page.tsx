export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
      <p className="[font-family:var(--font-display)] text-2xl font-semibold">Admin dashboard</p>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Các endpoint quản lý (/category/all, /food/all, create/update/delete) đều yêu cầu
        JWT + role ADMIN. Cần gắn cơ chế đăng nhập trước khi build màn hình này.
      </p>
    </main>
  );
}
