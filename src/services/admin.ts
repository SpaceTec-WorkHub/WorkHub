import { apiRequest } from './api';
import type { GamificationRewardEntry as SharedGamificationRewardEntry, GamificationUserOption as SharedGamificationUserOption } from './gamification';

export type AdminSiteRecord = {
  site_id: number;
  name: string;
};

export type ZoneOption = {
  zone_id: number;
  name: string;
};

export type AdminBuildingRecord = {
  building_id: number;
  name: string;
  site_id: number;
  site?: AdminSiteRecord | null;
  floors?: AdminFloorRecord[];
};

export type AdminFloorRecord = {
  floor_id: number;
  name: string;
  building_id: number;
  floor_type: 'office' | 'parking';
  building?: AdminBuildingRecord | null;
  zones?: AdminZoneRecord[];
};

export type AdminZoneRecord = {
  zone_id: number;
  name: string;
  floor_id: number;
  floor?: AdminFloorRecord | null;
  spaces?: AdminSpaceRecord[];
};

export type AdminSpaceTypeRecord = {
  space_type_id: number;
  name: string;
};

export type AdminSpaceRecord = {
  space_id: number;
  code: string;
  is_accessible: boolean;
  is_priority: boolean;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  zone_id: number;
  zone?: AdminZoneRecord | null;
  space_type_id?: number;
  space_type?: AdminSpaceTypeRecord | null;
};

export type RoleRecord = {
  role_id: number;
  name: string;
};

export type BuildingPayload = {
  name: string;
  site_id: number;
};

export type FloorPayload = {
  name: string;
  building_id: number;
  floor_type?: 'office' | 'parking';
};

export type ZonePayload = {
  name: string;
  floor_id: number;
};

export type SpacePayload = {
  code: string;
  is_accessible: boolean;
  is_priority: boolean;
  status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  space_type_id: number;
  zone_id: number;
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

export async function getSites() {
  return apiRequest<AdminSiteRecord[]>('/site');
}

export async function getSpaceTypes() {
  return apiRequest<AdminSpaceTypeRecord[]>('/space-type');
}

export async function getAdminBuildings() {
  return apiRequest<AdminBuildingRecord[]>('/building');
}

export async function getAdminFloors() {
  return apiRequest<AdminFloorRecord[]>('/floor');
}

export async function getAdminZones() {
  return apiRequest<AdminZoneRecord[]>('/zone');
}

export async function getAdminSpaces() {
  return apiRequest<AdminSpaceRecord[]>('/space');
}

export async function createBuilding(payload: BuildingPayload) {
  return apiRequest<AdminBuildingRecord>('/building', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBuilding(buildingId: number, payload: Partial<BuildingPayload>) {
  return apiRequest<AdminBuildingRecord>(`/building/${buildingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteBuilding(buildingId: number) {
  return apiRequest<AdminBuildingRecord>(`/building/${buildingId}`, {
    method: 'DELETE',
  });
}

export async function createFloor(payload: FloorPayload) {
  return apiRequest<AdminFloorRecord>('/floor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFloor(floorId: number, payload: Partial<FloorPayload>) {
  return apiRequest<AdminFloorRecord>(`/floor/${floorId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteFloor(floorId: number) {
  return apiRequest<AdminFloorRecord>(`/floor/${floorId}`, {
    method: 'DELETE',
  });
}

export async function createZone(payload: ZonePayload) {
  return apiRequest<AdminZoneRecord>('/zone', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateZone(zoneId: number, payload: Partial<ZonePayload>) {
  return apiRequest<AdminZoneRecord>(`/zone/${zoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteZone(zoneId: number) {
  return apiRequest<AdminZoneRecord>(`/zone/${zoneId}`, {
    method: 'DELETE',
  });
}

export async function createSpace(payload: SpacePayload) {
  return apiRequest<AdminSpaceRecord>('/space', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSpace(spaceId: number, payload: Partial<SpacePayload>) {
  return apiRequest<AdminSpaceRecord>(`/space/${spaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteSpace(spaceId: number) {
  return apiRequest<AdminSpaceRecord>(`/space/${spaceId}`, {
    method: 'DELETE',
  });
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