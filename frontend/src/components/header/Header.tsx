import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import styles from "./Header.module.scss";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/customer" className={styles.brand}>
          <div className={styles.logo}>
            <Image
              src="/main_logo/JJ Logo 1.png"
              alt="Jolly Jumbuk Lunch Bar"
              fill
              priority
              className={styles.logoImage}
            />
          </div>
        </Link>

        <div className={styles.actions}>
          <button type="button" className={cn(styles.button, styles.login)}>
            Log in
          </button>
          <button type="button" className={cn(styles.button, styles.logout)}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
