import { useMemo } from "react";
import { authClient } from "./client";

export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: false;
};
export type CurrentUserState = { user: AppUser | null; isPending: boolean };

export function useCurrentUserState(): CurrentUserState {
  const { data, isPending } = authClient.useSession();
  const id = data?.user.id ?? null;
  const displayName = data?.user.name ?? null;
  const primaryEmail = data?.user.email ?? null;
  const profileImageUrl = data?.user.image ?? null;
  const user = useMemo<AppUser | null>(() => id ? {
    id, displayName, primaryEmail, profileImageUrl, isDevFallback: false,
  } : null, [id, displayName, primaryEmail, profileImageUrl]);
  return useMemo(() => ({ user, isPending }), [user, isPending]);
}
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
