"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import styles from "./Authmodal.module.scss";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    console.log(`[${mode}] submit - chưa nối API`);
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

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show Password</span>
            </label>

            <button type="submit" className={styles.submit}>
              Log In
            </button>
            <p className={styles.switchText}>
              Don't have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => onSwitchMode("signup")}>
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Full Name</span>
              <input type="text" name="fullName" placeholder="John Doe" required />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Confirm Password</span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="••••••••"
                required
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={showPassword && showConfirmPassword}
                onChange={(event) => {
                  setShowPassword(event.target.checked);
                  setShowConfirmPassword(event.target.checked);
                }}
              />
              <span>Show Password</span>
            </label>

            <button type="submit" className={styles.submit}>
              Create Account
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