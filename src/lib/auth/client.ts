import { createAuthClient } from "better-auth/react";

/** GitHub OAuth and same-origin Better Auth sessions only. */
export const authClient = createAuthClient();
export const authEnabled = true;

export async function signIn(
  providerId = "github",
  options: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  if (providerId !== "github") throw new Error("Only GitHub sign-in is supported.");
  const response = await authClient.signIn.social({
    provider: "github",
    callbackURL: options.callbackURL ?? "/",
    errorCallbackURL: options.errorCallbackURL ?? "/",
  });
  if (response.error) throw new Error(response.error.message || "GitHub sign-in failed.");
  if (response.data?.url && typeof window !== "undefined") window.location.assign(response.data.url);
}

export async function signOut(): Promise<void> {
  const response = await authClient.signOut();
  if (response.error) throw new Error(response.error.message || "Sign-out failed.");
  if (typeof window !== "undefined") window.location.assign("/");
}
