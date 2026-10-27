export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined"
        ? { "x-buildspace-client": clientId() }
        : {}),
      ...options.headers,
    },
  });
  const b = await r.json();
  if (!r.ok) {
    if (r.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("buildspace-session-expired"));
    throw new ApiError(b.error ?? "Request failed", r.status);
  }
  return b;
}

let tabId: string | undefined;
export function clientId() {
  return (tabId ??= crypto.randomUUID());
}
