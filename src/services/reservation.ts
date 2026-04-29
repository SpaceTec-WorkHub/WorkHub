const API_URL = import.meta.env.VITE_API_URL;

export async function createReservation(spaceId: number) {
  const res = await fetch(`${API_URL}/reservation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      user_id: 1,
      space_id: spaceId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Error al reservar: ${res.status}`);
  }

  return res.json();
}