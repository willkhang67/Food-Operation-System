import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "./layout.module.scss";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
