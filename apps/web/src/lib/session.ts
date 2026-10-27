"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
export const sessionQuery = {
  queryKey: ["me"],
  queryFn: () =>
    api<{ user: { id: string; name: string; email: string } | null }>(
      "auth/me",
    ),
};
export const useSession = () => useQuery(sessionQuery);
export function accountInitials(name?: string) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "…"
  );
}
