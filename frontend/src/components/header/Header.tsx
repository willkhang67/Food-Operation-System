import Image from "next/image";
import Link from "next/link";
import "./Header.scss";

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link href="/customer" className="header__brand">
          <div className="header__logo">
            <Image
              src="/main_logo/JJ Logo 1.png"
              alt="Jolly Jumbuk Lunch Bar"
              fill
              priority
              className="header__logo-image"
            />
          </div>
        </Link>

        <div className="header__actions">
          <button type="button" className="header__button header__button--login">
            Log in
          </button>
          <button type="button" className="header__button header__button--logout">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
