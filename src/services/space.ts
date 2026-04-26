const API_URL = import.meta.env.VITE_API_URL;

export type ApiSpace = {
  space_id: number;
  code: string;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  is_accessible: boolean;
  is_priority: boolean;
  zone?: {
    name: string;
  };
  space_type?: {
    name: string;
  };
};

export async function getSpace(): Promise<ApiSpace[]> {
  const res = await fetch(`${API_URL}/space`);

  if (!res.ok) {
    throw new Error(`Error al cargar espacios: ${res.status}`);
  }

  return res.json();
}