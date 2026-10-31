import { useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { signIn, signOut } from "./client";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

export const SIGN_IN_PATH = "/";
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  return !isPending && !user ? <>{children}</> : null;
}
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}
export function SignInGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const state = resolveSignInGateState({ isPending, hasUser: user !== null });
  if (state === "pending") return null;
  return state === "signed_in" ? <>{children}</> : <>{fallback ?? <SignInButtons />}</>;
}
export function SignInButtons() {
  const [error, setError] = useState("");
  return <div className="flex w-full max-w-sm flex-col gap-2">
    <button type="button" className="w-full rounded-md border border-neutral-600 px-4 py-2"
      onClick={() => void signIn("github").catch(e => setError(String(e)))}>Continue with GitHub</button>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}
export function UserButton() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return <div className="flex items-center gap-2">
    <span className="text-sm">{user.displayName ?? user.primaryEmail ?? "Account"}</span>
    <button type="button" disabled={busy} onClick={() => {
      setBusy(true); void signOut().catch(() => setBusy(false));
    }} className="text-sm underline">{busy ? "Signing out…" : "Sign out"}</button>
  </div>;
}
