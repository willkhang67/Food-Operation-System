"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import styles from "./AuthModal.module.scss";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

/**
 * Mounted only in response to a click, so it never renders during SSR and can
 * portal into document.body without a hydration guard.
 *
 * Each mode renders its own form component, so switching tabs unmounts one and
 * mounts the other — field and error state reset on their own.
 */
export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
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
          <LoginForm onSuccess={onClose} onSwitchToSignup={() => onSwitchMode("signup")} />
        ) : (
          <SignupForm onSuccess={onClose} onSwitchToLogin={() => onSwitchMode("login")} />
        )}
      </div>
    </div>,
    document.body,
  );
}
