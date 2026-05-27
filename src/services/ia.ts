import { apiRequest } from './api';

export type IARecommendation = {
  space_id: number;
  location: string;
  recommendation_score: number;
};

export type IARecommendationsResponse = {
  success: boolean;
  data: IARecommendation[];
};


export async function getParkingRecommendations(): Promise<IARecommendation[]> {
  const response = await apiRequest<IARecommendationsResponse>('/parking/recommendations');
  return response.data;
}
