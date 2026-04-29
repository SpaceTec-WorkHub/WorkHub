const API_URL = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3000';

export async function apiRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = `Error ${res.status} en ${endpoint}`;

    try {
      const errorBody = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(errorBody.message)) {
        message = errorBody.message.join(', ');
      } else if (typeof errorBody.message === 'string') {
        message = errorBody.message;
      }
    } catch {
      // Keep the default message when the backend does not return JSON.
    }

    throw new Error(message);
  }

  return res.json();
}