import Link from "next/link";
import styles from "./page.module.scss";

const CARDS = [
  { href: "/customer", title: "Customer", desc: "Xem menu, đặt món theo category." },
  { href: "/kitchen", title: "Kitchen", desc: "Theo dõi order đang chờ chế biến." },
  { href: "/admin", title: "Admin", desc: "Quản lý món ăn, category, đơn hàng." },
] as const;

export default function DemoPage() {
  return (
    <main className={styles.page}>
      <p className={styles.title}>Jolly Jumbuk</p>
      <p className={styles.subtitle}>Chọn một khu vực để xem demo.</p>

      <div className={styles.grid}>
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className={styles.card}>
            <p className={styles.cardTitle}>{card.title}</p>
            <p className={styles.cardDescription}>{card.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
