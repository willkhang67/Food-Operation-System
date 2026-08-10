"use client";

import { useState, type FormEvent } from "react";
import { toErrorDetails, toErrorMessage } from "@/lib/error-message";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./AuthModal.module.scss";

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[] | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Read before awaiting: currentTarget is nulled once the handler yields.
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setIsSubmitting(true);
    setError(null);
    setDetails(undefined);

    try {
      await login({ email, password });
      onSuccess();
    } catch (submitError) {
      setError(toErrorMessage(submitError, "Could not sign you in."));
      setDetails(toErrorDetails(submitError));
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
      </label>

      <label className={styles.field}>
        <span>Password</span>
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </label>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        <span>Show password</span>
      </label>

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          {details && (
            <ul className={styles.errorList}>
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Log In"}
      </button>

      <p className={styles.switchText}>
        Don&apos;t have an account?{" "}
        <button type="button" className={styles.switchLink} onClick={onSwitchToSignup}>
          Sign Up
        </button>
      </p>
    </form>
  );
}
