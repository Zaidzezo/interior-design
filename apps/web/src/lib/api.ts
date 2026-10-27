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
  if (!r.ok) throw new ApiError(b.error ?? "Request failed", r.status);
  return b;
}

let tabId: string | undefined;
export function clientId() {
  return (tabId ??= crypto.randomUUID());
}
