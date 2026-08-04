import PlaceholderPage from "@/components/common/PlaceholderPage";

export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin dashboard"
      description="Các endpoint quản lý (/category/all, /food/all, create/update/delete) đều yêu cầu JWT + role ADMIN. Cần gắn cơ chế đăng nhập trước khi build màn hình này."
    />
  );
}
