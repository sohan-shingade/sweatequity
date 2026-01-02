export interface User {
  id: string;
  name: string;
  avatar: string;
  goalDays: number; // e.g., 6 days a week
  pairingCode: string; // The code to share
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string; // ISO string
  activity: string;
  durationMinutes: number;
  photoUrl?: string; // Proof
  verified: boolean;
}

export interface WeekState {
  startDate: string; // Start of the current week
  wagerAmount: number; // e.g., 20 ($20)
}

export enum BattleStatus {
  WINNING = 'WINNING',
  LOSING = 'LOSING',
  TIED = 'TIED'
}

export interface RefereeResponse {
  analysis: string;
  tone: 'motivational' | 'roast' | 'neutral';
}

export type OnboardingStep = 'PROFILE' | 'PARTNER' | 'COMPLETED';
