import { apiRequest } from './api';

export type IARecommendation = {
  parking_recommendation: {
    space_id: number;
    space_code: string;
    zone_name: string;
    best_day_to_attend: string;
    affinity_probability: number;
  };
  workspace_recommendation: {
    space_id: number;
    space_code: string;
    zone_name: string;
    best_day_to_attend: string;
    affinity_probability: number;
  };
};

export type GlobalDayRanking = {
  position: number;
  day_id: number;
  day_name: string;
  estimated_traffic_index: number;
};

export type IAGlobalRecommendation = {
  resource_type_id: number;
  resource_name: string;
  best_days_to_attend_ranking: GlobalDayRanking[];
};

export async function getParkingRecommendations(userId: number): Promise<IARecommendation> {
  const res = await apiRequest<{ success: boolean; data: IARecommendation }>(`/parking/recommendations?user_id=${userId}`);
  return res.data;
}

export async function getGlobalRecommendations(tipo: 1 | 2 | 3): Promise<IAGlobalRecommendation> {
  const res = await apiRequest<{ success: boolean; data: IAGlobalRecommendation }>(`/parking/global-recommendations?tipo=${tipo}`);
  return res.data;
}