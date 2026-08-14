"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import AuthModal, { type AuthMode } from "@/components/auth/AuthModal";

interface AuthDialogContextValue {
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function useAuthDialog(): AuthDialogContextValue {
  const value = useContext(AuthDialogContext);

  if (!value) {
    throw new Error("useAuthDialog must be used inside <AuthDialogProvider>.");
  }

  return value;
}

/**
 * Owns the single auth modal for the whole app, so anything that needs to ask
 * the visitor to sign in — the header, a route guard, a checkout button — can
 * open it without each keeping its own copy of the dialog state.
 */
export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null);

  const openAuth = useCallback((next: AuthMode) => setMode(next), []);
  const closeAuth = useCallback(() => setMode(null), []);

  return (
    <AuthDialogContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {mode && <AuthModal mode={mode} onClose={closeAuth} onSwitchMode={setMode} />}
    </AuthDialogContext.Provider>
  );
}
