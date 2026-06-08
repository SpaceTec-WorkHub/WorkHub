import { apiRequest } from './api';

export type CarpoolTripStatus =
  | 'draft'
  | 'open'
  | 'full'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TripRiderStatus =
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'boarded'
  | 'no_show'
  | 'completed';

export type Vehicle = {
  vehicle_id: number;
  plate_number: string;
  brand: string;
  model: string;
  color?: string | null;
  year?: number | null;
  seats_total: number;
  is_active: boolean;
  owner_id: number;
};

export type TripRider = {
  trip_id: number;
  user_id: number;
  status: TripRiderStatus;
  requested_at: string;
  responded_at?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  user?: {
    user_id: number;
    full_name?: string;
    email?: string;
  };
};

export type CarpoolTrip = {
  trip_id: number;
  trip_date: string;
  departure_time?: string | null;
  meeting_point_confirmed_at?: string | null;
  cancellation_reason?: string | null;
  status: CarpoolTripStatus;
  seats_available: number;
  seats_total: number;
  origin: string;
  destination: string;
  meeting_point?: string | null;
  notes?: string | null;
  driver_id: number;
  vehicle_id: number;
  driver?: {
    user_id: number;
    full_name?: string;
    email?: string;
  };
  vehicle?: Vehicle;
  tripRiders?: TripRider[];
};

export type CreateCarpoolTripPayload = {
  trip_date: string;
  departure_time?: string;
  vehicle_id: number;
  origin: string;
  destination: string;
  meeting_point?: string;
  notes?: string;
  driver_id: number;
};

export async function getCarpoolTrips() {
  return apiRequest<CarpoolTrip[]>('/carpool-trip');
}

export async function getCarpoolTrip(tripId: number) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}`);
}

export async function createCarpoolTrip(payload: CreateCarpoolTripPayload) {
  return apiRequest<CarpoolTrip>('/carpool-trip', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestRide(tripId: number, userId: number) {
  return apiRequest<TripRider>(`/carpool-trip/${tripId}/riders/${userId}`, {
    method: 'POST',
  });
}

export async function cancelRide(tripId: number, userId: number) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}/riders/${userId}`, {
    method: 'DELETE',
  });
}

export async function getVehiclesByOwner(ownerId: number) {
  return apiRequest<Vehicle[]>(`/vehicle/owner/${ownerId}`);
}

export async function getTripsByDriver(driverId: number) {
  return apiRequest<CarpoolTrip[]>(`/carpool-trip/driver/${driverId}`);
}

export async function acceptRider(tripId: number, userId: number, driverId: number) {
  return apiRequest<TripRider>(`/carpool-trip/${tripId}/riders/${userId}/accept`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId }),
  });
}

export async function rejectRider(tripId: number, userId: number, driverId: number) {
  return apiRequest<TripRider>(`/carpool-trip/${tripId}/riders/${userId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId }),
  });
}

export async function startTrip(tripId: number, driverId: number) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}/start`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId }),
  });
}

export async function confirmMeetingPoint(tripId: number, driverId: number) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}/confirm-meeting-point`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId }),
  });
}

export async function completeTrip(tripId: number, driverId: number) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId }),
  });
}

export async function cancelTrip(tripId: number, driverId: number, reason: string) {
  return apiRequest<CarpoolTrip>(`/carpool-trip/${tripId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ driverId, reason }),
  });
}

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
