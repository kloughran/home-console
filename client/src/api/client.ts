// Thin wrapper around fetch that returns typed JSON or throws ApiError.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, options);

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? `HTTP ${res.status}`, res.status);
  }
  return data as T;
}

export const apiPost = <T>(url: string, body: unknown): Promise<T> =>
  fetchJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const apiPut = <T>(url: string, body: unknown): Promise<T> =>
  fetchJson<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const apiDelete = (url: string): Promise<null> =>
  fetchJson<null>(url, { method: 'DELETE' });
