const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`);

  if (!res.ok) {
    throw new Error(`Error ${res.status} en ${endpoint}`);
  }

  return res.json();
}