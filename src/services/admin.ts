import { apiRequest } from './api';
import type { GamificationRewardEntry as SharedGamificationRewardEntry, GamificationUserOption as SharedGamificationUserOption } from './gamification';

export type ZoneOption = {
  zone_id: number;
  name: string;
};

export type RoleRecord = {
  role_id: number;
  name: string;
};

export type EmergencyZoneBlockResponse = {
  block: unknown;
  cancelledReservations: number;
};

export type SpaceBlockResponse = {
  blocks: Array<{
    block_id: number;
    space_id: number;
  }>;
  cancelledReservations: number;
};

export type BlockRecord = {
  block_id: number;
  reason: string;
  start_time: string;
  end_time: string | null;
  space_id: number | null;
  zone_id: number | null;
  space?: {
    space_id: number;
    code: string;
    zone?: {
      name: string;
    };
  } | null;
  zone?: {
    zone_id: number;
    name: string;
  } | null;
};

export type SpecialEventResponse = {
  title: string;
  zone_id: number;
  createdReservations: number;
  cancelledReservations: number;
  blockedSpaces: number;
};

export type AdminUserRecord = {
  user_id: number;
  email: string | null;
  full_name: string | null;
  user_type: 'internal' | 'external';
  status: 'active' | 'inactive';
  role?: {
    role_id: number;
    name: string;
  } | null;
};

export type AdminUserPayload = {
  email: string;
  password: string;
  full_name: string;
  user_type: 'internal' | 'external';
  status: 'active' | 'inactive';
  role_id?: number;
};

export type AdminUserUpdatePayload = Partial<AdminUserPayload>;

export type EmergencyZoneBlockPayload = {
  zone_id: number;
  reason: string;
  start_time: string;
  end_time?: string;
};

export type SpaceBlockPayload = {
  space_ids: number[];
  reason: string;
  start_time: string;
  end_time?: string;
};

export type UpdateBlockPayload = {
  reason?: string;
  start_time?: string;
  end_time?: string;
  space_id?: number;
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

export async function getRoles() {
  return apiRequest<RoleRecord[]>('/role');
}

export async function getGamificationUsers() {
  return apiRequest<GamificationUserOption[]>('/gamification/users');
}

export async function getGamificationRewards() {
  return apiRequest<GamificationRewardsResponse>('/gamification/rewards');
}

export async function getUsers() {
  return apiRequest<AdminUserRecord[]>('/users');
}

export async function createUser(payload: AdminUserPayload) {
  return apiRequest<AdminUserRecord>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId: number, payload: AdminUserUpdatePayload) {
  return apiRequest<AdminUserRecord>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: number) {
  return apiRequest<AdminUserRecord>(`/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function createEmergencyZoneBlock(
  payload: EmergencyZoneBlockPayload,
): Promise<EmergencyZoneBlockResponse> {
  return apiRequest('/block/emergency-zone', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSpaceBlocks(payload: SpaceBlockPayload): Promise<SpaceBlockResponse> {
  return apiRequest('/block/spaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getBlocks() {
  return apiRequest<BlockRecord[]>('/block');
}

export async function updateBlock(blockId: number, payload: UpdateBlockPayload) {
  return apiRequest<BlockRecord>(`/block/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteBlock(blockId: number) {
  return apiRequest<BlockRecord>(`/block/${blockId}`, {
    method: 'DELETE',
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