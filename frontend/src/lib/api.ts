const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new Error(`Unable to reach the quiz API at ${API}. Check that the backend is running on port 4000 and that the frontend origin is allowed.`);
  }
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? 'Request failed'); }
  return response.status === 204 ? (undefined as T) : response.json();
}
