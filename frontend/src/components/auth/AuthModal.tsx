"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./AuthModal.module.scss";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { login, register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No mount gate is needed: the provider only renders this dialog once a
  // visitor has opened it, so `document` exists by the time createPortal runs.
  // Switching between Log In and Sign Up remounts the component — see the `key`
  // in AuthDialogProvider — which is what clears the fields and the error.

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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await login({ email, password });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Backend chưa có /auth/register nên register() sẽ throw — hiện lỗi rõ
  // ràng thay vì im lặng. Bỏ đoạn try/catch báo lỗi này khi backend đã có.
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("fullName") as string;

    try {
      const result = await register({ email, password, name });
      if (result.sessionStarted) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              <input type="text" name="fullName" placeholder="John Doe" required disabled={isLoading} />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required disabled={isLoading} />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
              <span>Show Password</span>
            </label>

            <button type="submit" className={styles.submit} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Account"}
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