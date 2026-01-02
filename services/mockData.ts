import { User, WorkoutLog } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex',
    avatar: 'https://picsum.photos/seed/alex/150/150',
    goalDays: 5,
    pairingCode: 'ALX-99'
  },
  {
    id: 'u2',
    name: 'Jordan',
    avatar: 'https://picsum.photos/seed/jordan/150/150',
    goalDays: 5,
    pairingCode: 'JRD-77'
  }
];

const ACTIVITIES = ['Running', 'Weightlifting', 'Yoga', 'HIIT', 'Cycling', 'Swimming'];

export const getMockPartner = (enteredCode: string): User => {
  // In a real app, this would fetch from DB based on code
  // For demo, we just return "Jordan" with a slight variation if needed
  return {
    id: 'u2',
    name: 'Jordan',
    avatar: 'https://picsum.photos/seed/jordan/150/150',
    goalDays: 5,
    pairingCode: 'JRD-77'
  };
};

export const generateMockLogs = (daysBack: number, userIds: string[]): WorkoutLog[] => {
  const logs: WorkoutLog[] = [];
  const today = new Date();

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    userIds.forEach(uid => {
      // Randomly decide if user worked out (60% chance), but skip 'today' for demo purposes (so reminder shows)
      if (i === 0) return; 

      if (Math.random() > 0.4) {
        logs.push({
          id: `log-${uid}-${i}`,
          userId: uid,
          date: dateStr,
          activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
          durationMinutes: 30 + Math.floor(Math.random() * 60),
          verified: true,
          photoUrl: `https://picsum.photos/seed/workout${i}${uid}/300/200`
        });
      }
    });
  }
  return logs;
};