import { apiRequest } from './api';

export type GamificationLeaderboardRow = {
  rank: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  role: string | null;
  points: number;
  reservations: number;
  checkIns: number;
  releases: number;
  rewardCount: number;
  plannedReservations: number;
  earlyReservations: number;
};

export type GamificationRewardEntry = {
  gamification_reward_id: number;
  title: string;
  description: string;
  points: number;
  period_start?: string | null;
  period_end?: string | null;
};

export type GamificationLeaderboardResponse = {
  period: {
    start: string;
    end: string;
    label: string;
  };
  leaderboard: GamificationLeaderboardRow[];
  currentUser: GamificationLeaderboardRow | null;
  rewards: GamificationRewardEntry[];
  currentRewards: GamificationRewardEntry[];
};

export type GamificationUserOption = {
  user_id: number;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export async function getGamificationLeaderboard(userId?: number | null) {
  const query = userId ? `?userId=${encodeURIComponent(String(userId))}` : '';
  return apiRequest<GamificationLeaderboardResponse>(`/gamification/leaderboard${query}`);
}

export async function getGamificationUsers() {
  return apiRequest<GamificationUserOption[]>('/gamification/users');
}

export async function getGamificationRewards() {
  return apiRequest<{ period: GamificationLeaderboardResponse['period']; rewards: GamificationRewardEntry[] }>('/gamification/rewards');
}
import { apiRequest } from './api';

export type GamificationAchievement = {
  id: number;
  title: string;
  desc: string;
  progress: number;
  completed: boolean;
  color: string;
  bg: string;
};

export type GamificationRecentReservation = {
  reservation_id: number;
  code: string;
  zone: string;
  start_time: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
};

export type GamificationSummary = {
  user: {
    user_id: number;
    full_name: string | null;
    email: string | null;
    role: string | null;
  };
  score: {
    points: number;
    level: number;
    nextLevelPoints: number;
    progress: number;
  };
  stats: {
    reservations: number;
    approvedReservations: number;
    completedReservations: number;
    cancelledReservations: number;
    checkIns: number;
    releases: number;
    plannedReservations: number;
    earlyReservations: number;
    favoriteZone: string | null;
  };
  achievements: GamificationAchievement[];
  recentReservations: GamificationRecentReservation[];
};

export async function getUserGamification(userId: number) {
  return apiRequest<GamificationSummary>(`/gamification/user/${userId}`);
}