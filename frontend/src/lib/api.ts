const API = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "payrollflow.token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/login")) {
      setToken(null);
    }
    throw new ApiError(payload.error ?? "Erreur réseau", response.status);
  }
  return payload;
}
