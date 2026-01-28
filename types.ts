export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  goalDays: number;
  pairingCode: string;
  partnerId?: string | null; // ID of the linked partner
  wagerAmount: number;
  lastResetDate?: string; // ISO date of last weekly reset
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string; // ISO string
  activity: string;
  subType?: string; // e.g. "Push", "Pull", "Upper Body"
  durationMinutes: number;
  photoUrl?: string; // Proof
  verified: boolean;
}

export interface WeeklySummary {
  id: string;
  weekStarting: string;
  weekEnding: string;
  participantIds: string[];
  stats: {
    [userId: string]: {
      name: string;
      avatar: string;
      goal: number;
      actual: number;
      debt: number;
      wager: number;
    }
  };
}

export interface WeekState {
  startDate: string; // Start of the current week
  wagerAmount: number; // e.g., 20 ($20)
}

export type OnboardingStep = 'AUTH' | 'PROFILE' | 'PARTNER' | 'COMPLETED';