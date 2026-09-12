"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { isSessionWalletMatch } from "@/lib/auth/session-utils";
import { organizationApi } from "@/lib/organizations/client";

export const sessionQueryKey = ["workspace-session"] as const;

export function useSession() {
  const { address } = useAccount();
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: organizationApi.getSession,
    staleTime: 30_000,
    retry: false,
  });
  const session = query.data?.authenticated ? query.data.session : undefined;
  const walletMatches = isSessionWalletMatch(session?.walletAddress, address);
  return {
    ...query,
    session,
    walletMatches,
    isAuthenticated: Boolean(session),
    currentWallet: address,
  };
}

export function useSessionActions() {
  const queryClient = useQueryClient();
  return {
    refreshSession: () =>
      queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
    clearSession: () =>
      queryClient.setQueryData(sessionQueryKey, { authenticated: false }),
  };
}
