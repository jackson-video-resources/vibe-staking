// VITE_ADMIN_KEY is injected at build time — set it in .env alongside ADMIN_KEY
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ADMIN_KEY) {
    headers["x-admin-key"] = ADMIN_KEY;
  }
  const res = await fetch(`/api${path}`, {
    headers,
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "API error");
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};
