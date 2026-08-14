"use client";

import { useState, type FormEvent } from "react";
import { toErrorDetails, toErrorMessage } from "@/lib/error-message";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./AuthModal.module.scss";

/** Matches the API's own minimum so the user is told before a round trip. */
const MIN_PASSWORD_LENGTH = 6;

interface SignupFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[] | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    setError(null);
    setDetails(undefined);
    setNotice(null);

    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { sessionStarted } = await register({ name, email, password });

      if (sessionStarted) {
        onSuccess();
        return;
      }

      // The account exists but the API declined to sign us in straight away
      // (rate limiting, most likely), so point the user at the login tab.
      setNotice("Your account is ready. Please log in to continue.");
      setIsSubmitting(false);
    } catch (submitError) {
      setError(toErrorMessage(submitError, "Could not create your account."));
      setDetails(toErrorDetails(submitError));
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Full Name</span>
        <input type="text" name="name" placeholder="John Doe" required autoComplete="name" />
      </label>

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
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
      </label>

      <label className={styles.field}>
        <span>Confirm Password</span>
        <input
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          placeholder="••••••••"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
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

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create Account"}
      </button>

      <p className={styles.switchText}>
        Already have an account?{" "}
        <button type="button" className={styles.switchLink} onClick={onSwitchToLogin}>
          Log In
        </button>
      </p>
    </form>
  );
}
