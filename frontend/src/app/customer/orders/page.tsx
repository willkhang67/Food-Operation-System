import BottomNav from "@/components/customer/BottomNav";
import PlaceholderPage from "@/components/common/PlaceholderPage";

export default function OrdersPage() {
  return (
    <PlaceholderPage
      title="Your orders"
      description="Chưa có API order — nối vào khi backend cung cấp endpoint tương ứng."
      width="mobile"
    >
      <BottomNav />
    </PlaceholderPage>
  );
}
