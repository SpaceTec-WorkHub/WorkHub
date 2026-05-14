import { apiRequest } from './api';
import type { GamificationRewardEntry as SharedGamificationRewardEntry, GamificationUserOption as SharedGamificationUserOption } from './gamification';

export type ZoneOption = {
  zone_id: number;
  name: string;
};

export type EmergencyZoneBlockResponse = {
  block: unknown;
  cancelledReservations: number;
};

export type SpecialEventResponse = {
  title: string;
  zone_id: number;
  createdReservations: number;
  cancelledReservations: number;
  blockedSpaces: number;
};

export type EmergencyZoneBlockPayload = {
  zone_id: number;
  reason: string;
  start_time: string;
  end_time?: string;
};

export type SpecialEventPayload = {
  title: string;
  zone_id: number;
  start_time: string;
  end_time: string;
  user_id: number;
};

export type GamificationRewardPayload = {
  title: string;
  description: string;
  points: number;
  user_id: number;
  reward_date?: string;
};

export type GamificationRewardsResponse = {
  period: {
    start: string;
    end: string;
    label: string;
  };
  rewards: GamificationRewardEntry[];
};

export type GamificationUserOption = SharedGamificationUserOption;
export type GamificationRewardEntry = SharedGamificationRewardEntry;

export async function getZones() {
  return apiRequest<ZoneOption[]>('/zone');
}

export async function getGamificationUsers() {
  return apiRequest<GamificationUserOption[]>('/gamification/users');
}

export async function getGamificationRewards() {
  return apiRequest<GamificationRewardsResponse>('/gamification/rewards');
}

export async function createEmergencyZoneBlock(
  payload: EmergencyZoneBlockPayload,
): Promise<EmergencyZoneBlockResponse> {
  return apiRequest('/block/emergency-zone', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSpecialEventReservations(
  payload: SpecialEventPayload,
): Promise<SpecialEventResponse> {
  return apiRequest('/reservation/admin/special-event', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createGamificationReward(payload: GamificationRewardPayload) {
  return apiRequest('/gamification/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGamificationReward(id: number, payload: Partial<GamificationRewardPayload>) {
  return apiRequest(`/gamification/rewards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGamificationReward(id: number) {
  return apiRequest(`/gamification/rewards/${id}`, {
    method: 'DELETE',
  });
}