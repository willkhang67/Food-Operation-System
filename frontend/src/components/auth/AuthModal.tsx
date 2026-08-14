"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import styles from "./Authmodal.module.scss";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onLoginSuccess?: (user: Record<string, unknown>) => void;
}

export default function AuthModal({
  mode,
  onClose,
  onSwitchMode,
  onLoginSuccess,
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  }, [mode]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      
      const { accessToken, user } = await api.login({ email, password });

      api.setAuthData(accessToken, user);
      onLoginSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert("Sign up feature is coming soon! 🚀");
  };

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Log In" : "Sign Up"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className={styles.tabs}>
          <button
            type="button"
            className={cn(styles.tab, mode === "login" && styles.tabActive)}
            onClick={() => onSwitchMode("login")}
          >
            Log In
          </button>
          <button
            type="button"
            className={cn(styles.tab, mode === "signup" && styles.tabActive)}
            onClick={() => onSwitchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                disabled={isLoading}
              />
              <span>Show Password</span>
            </label>

            <button type="submit" className={styles.submit} disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
            </button>

            <p className={styles.switchText}>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className={styles.switchLink}
                onClick={() => onSwitchMode("signup")}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSignUp}>
            <label className={styles.field}>
              <span>Full Name</span>
              <input type="text" name="fullName" placeholder="John Doe" required disabled />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required disabled />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled
              />
            </label>

            <label className={styles.field}>
              <span>Confirm Password</span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="••••••••"
                required
                minLength={6}
                disabled
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={showPassword && showConfirmPassword}
                onChange={(e) => {
                  setShowPassword(e.target.checked);
                  setShowConfirmPassword(e.target.checked);
                }}
                disabled
              />
              <span>Show Password</span>
            </label>

            <button
              type="submit"
              className={styles.submit}
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            >
              Create Account (Coming Soon)
            </button>

            <p className={styles.switchText}>
              Already have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => onSwitchMode("login")}>
                Log In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
