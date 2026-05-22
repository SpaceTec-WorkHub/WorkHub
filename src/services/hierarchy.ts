import { apiRequest } from './api';
import type { ApiSpace } from './space';

export type BuildingRecord = {
  building_id: number;
  name: string;
};

export type FloorRecord = {
  floor_id: number;
  name: string;
  building_id: number;
  floor_type: 'office' | 'parking';
};

export type ZoneRecord = {
  zone_id: number;
  name: string;
  floor_id: number;
};

export type HierarchySpaceRecord = ApiSpace;

export async function getBuildings() {
  return apiRequest<BuildingRecord[]>('/building');
}

export async function getFloors() {
  return apiRequest<FloorRecord[]>('/floor');
}

export async function getZones() {
  return apiRequest<ZoneRecord[]>('/zone');
}

export async function getSpaces() {
  return apiRequest<HierarchySpaceRecord[]>('/space');
}
