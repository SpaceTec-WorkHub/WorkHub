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
};

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

  return apiRequest('/reservation', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      user_id: userId,
    }),
  });
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