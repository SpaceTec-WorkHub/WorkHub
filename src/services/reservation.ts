import { apiRequest } from './api';
import { getStoredSession, isAdminUser } from './auth';

export type ReservationTimeSlot = {
  label: string;
  start_time: string;
  end_time: string;
  available_space_count: number;
  is_available: boolean;
};

export type ReservationSpace = {
  space_id: number;
  code: string;
  is_accessible: boolean;
  is_priority: boolean;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  zone: { name: string } | null;
  space_type: { name: string } | null;
};

export type ReservationRecord = {
  reservation_id: number;
  start_time: string;
  end_time: string;
  status: 'reserved' | 'checked_in' | 'checked_out' | 'no_show' | 'cancelled' | 'checkout_pending' | 'incident';
  user_id: number;
  space_id: number;
  space: ReservationSpace;
  reassigned_space_id?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  no_show_at?: string | null;
  incident_notes?: string | null;
  latitude_check_in?: number | null;
  longitude_check_in?: number | null;
  incidents?: {
    incident_id: number;
    type: 'occupied' | 'reassignment' | 'other';
    description: string;
    status: 'open' | 'resolved';
    created_at: string;
  }[];
};

export type ReservationIncidentPayload = {
  type: 'occupied' | 'reassignment' | 'other';
  description: string;
  notes?: string;
};

export type ReservationIncidentResponse = {
  incident: {
    incident_id: number;
    type: 'occupied' | 'reassignment' | 'other';
    description: string;
    status: 'open' | 'resolved';
    created_at: string;
  };
  alternative_space: ReservationSpace | null;
  reservation: ReservationRecord;
};

export type CheckInLocation = {
  latitude: number;
  longitude: number;
};

function getCurrentSessionUser() {
  const session = getStoredSession();
  const user = session?.user as { user_id?: number } | undefined;

  return {
    userId: user?.user_id ?? null,
    isAdmin: isAdminUser(),
  };
}

function withActorQuery(path: string) {
  const { userId, isAdmin } = getCurrentSessionUser();
  const searchParams = new URLSearchParams();

  if (userId) {
    searchParams.set('user_id', String(userId));
  }

  searchParams.set('is_admin', String(isAdmin));

  return `${path}?${searchParams.toString()}`;
}

export type ReservationPayload = {
  start_time: string;
  end_time: string;
  user_id: number;
  space_id: number;
  code?: string;
  event_id?: number;
};

function generateReservationCode() {
  try {
      // Modern browsers support crypto.randomUUID()
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        // Use full UUID (without hyphens) for maximum entropy
        return `RES-${(crypto as any).randomUUID().replace(/-/g, '').toUpperCase()}`;
    }
  } catch {
    // fallthrough
  }

  // Fallback: short random base36 string
  const rand = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36).toUpperCase();
  return `RES-${rand.slice(0, 8)}`;
}

export async function getReservationTimeSlots(date: string) {
  return apiRequest<ReservationTimeSlot[]>(`/reservation/availability/slots?date=${encodeURIComponent(date)}`);
}

export async function getReservationSpaces(date: string, startTime: string, endTime: string) {
  return apiRequest<ReservationSpace[]>(
    `/reservation/availability/spaces?date=${encodeURIComponent(date)}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`,
  );
}

export async function getUserReservations(userId: number) {
  return apiRequest<ReservationRecord[]>(`/reservation/user/${userId}`);
}

export async function createReservation(payload: Omit<ReservationPayload, 'user_id'> & { user_id?: number }) {
  const session = getStoredSession();
  const user = session?.user as { user_id?: number } | undefined;
  const userId = payload.user_id ?? user?.user_id;

  if (!userId) {
    throw new Error('No se encontró la sesión del usuario.');
  }

    const code = payload.code ?? generateReservationCode();

    // Crear reintentos si el código es duplicado
    let lastError: any = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptCode = attempt === 1 ? code : generateReservationCode();

      try {
        return await apiRequest('/reservation', {
          method: 'POST',
          body: JSON.stringify({
            start_time: payload.start_time,
            end_time: payload.end_time,
            code: attemptCode,
            user_id: userId,
            space_id: payload.space_id,
            ...(payload.event_id ? { event_id: payload.event_id } : {}),
          }),
        });
      } catch (err: any) {
        lastError = err;

        const msg = String(err?.message ?? '').toLowerCase();

        // If backend returned HTTP 409 the default message from apiRequest contains '409'.
        // Also handle textual hints like 'conflict', 'duplicate', 'unique' or 'code'.
        const shouldRetry = msg.includes('409') || /conflict|duplicate|unique|code/.test(msg);

        if (!shouldRetry) {
          throw err;
        }

        // If this was the last attempt, rethrow the error.
        if (attempt === maxAttempts) {
          throw err;
        }

        // Otherwise, loop and try again with a fresh code.
      }
    }

    throw lastError;
}

export async function updateReservation(
  reservationId: number,
  payload: Partial<Pick<ReservationPayload, 'start_time' | 'end_time' | 'space_id'>> & {
    status?: ReservationRecord['status'];
  },
) {
  return apiRequest<ReservationRecord>(`/reservation/${reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelReservation(reservationId: number) {
  return updateReservation(reservationId, { status: 'cancelled' });
}

export async function deleteReservation(reservationId: number) {
  return apiRequest(`/reservation/${reservationId}`, {
    method: 'DELETE',
  });
}

export async function getActiveReservations() {
  return apiRequest<ReservationRecord[]>(withActorQuery('/reservation/active'));
}

export async function getReservationHistory() {
  return apiRequest<ReservationRecord[]>(withActorQuery('/reservation/history'));
}

export async function checkInReservation(
  reservationId: number,
  location?: CheckInLocation,
) {
  const { userId, isAdmin } = getCurrentSessionUser();

  if (!userId) {
    throw new Error('No se encontró la sesión del usuario.');
  }

  return apiRequest<ReservationRecord>(`/reservation/${reservationId}/check-in`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      is_admin: isAdmin,
      latitude: location?.latitude,
      longitude: location?.longitude,
    }),
  });
}

export async function checkOutReservation(reservationId: number) {
  const { userId, isAdmin } = getCurrentSessionUser();

  if (!userId) {
    throw new Error('No se encontró la sesión del usuario.');
  }

  return apiRequest<ReservationRecord>(`/reservation/${reservationId}/check-out`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      is_admin: isAdmin,
    }),
  });
}

export async function extendReservation(reservationId: number, newEndTime: string) {
  const { userId, isAdmin } = getCurrentSessionUser();

  if (!userId) {
    throw new Error('No se encontró la sesión del usuario.');
  }

  return apiRequest<ReservationRecord>(`/reservation/${reservationId}/extend`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      is_admin: isAdmin,
      new_end_time: newEndTime,
    }),
  });
}

export async function reportReservationIncident(
  reservationId: number,
  payload: ReservationIncidentPayload,
) {
  const { userId, isAdmin } = getCurrentSessionUser();

  if (!userId) {
    throw new Error('No se encontró la sesión del usuario.');
  }

  return apiRequest<ReservationIncidentResponse>(`/reservation/${reservationId}/report-incident`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      is_admin: isAdmin,
      ...payload,
    }),
  });
}