import { User, WorkoutLog, WeeklySummary } from '../types';

// HTTP client for the SweatEquity server (server/index.mjs).
// Same-origin by default (the server serves the built frontend); VITE_API_URL overrides in dev.
const API = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'sweat_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
  description: string;
  photoUrl?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  confidence?: string;
  notes?: string;
}

const request = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
};

export const backend = {
  // --- AUTHENTICATION ---

  getCurrentUser: async (): Promise<User | null> => {
    if (!getToken()) return null;
    try {
      return await request('/api/me');
    } catch {
      return null;
    }
  },

  signUp: async (name: string): Promise<User> => {
    const { user, token } = await request('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    localStorage.setItem(TOKEN_KEY, token);
    return user;
  },

  signInWithToken: async (token: string): Promise<User> => {
    localStorage.setItem(TOKEN_KEY, token.trim());
    const user = await backend.getCurrentUser();
    if (!user) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error('Invalid token');
    }
    return user;
  },

  signOut: async () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // --- USER MANAGEMENT ---

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> =>
    request(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  updateSharedGoals: async (_userId: string, _partnerId: string | null, newGoal: number, newWager: number) => {
    await request('/api/goals', { method: 'POST', body: JSON.stringify({ goal: newGoal, wager: newWager }) });
  },

  getUserById: async (userId: string): Promise<User | null> =>
    request(`/api/users/${userId}`),

  // --- SUMMARIES & RESET ---

  saveWeeklySummary: async (summary: WeeklySummary) => {
    await request(`/api/summaries/${summary.id}`, { method: 'PUT', body: JSON.stringify(summary) });
  },

  getWeeklyHistory: async (_userId: string): Promise<WeeklySummary[]> =>
    request('/api/summaries'),

  updateLastResetDate: async (userId: string, date: string) => {
    await request(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ lastResetDate: date }) });
  },

  // --- PARTNER SYNC ---

  findUserByCode: async (code: string): Promise<User | null> =>
    code ? request(`/api/users/code/${encodeURIComponent(code)}`) : null,

  linkPartners: async (_initiatorId: string, partnerCode: string): Promise<{ user: User; partner: User }> =>
    request('/api/link', { method: 'POST', body: JSON.stringify({ code: partnerCode }) }),

  unlinkPartner: async (_userId: string) => {
    await request('/api/unlink', { method: 'POST' });
  },

  // --- LOGS ---

  addLog: async (log: WorkoutLog) => {
    await request('/api/logs', { method: 'POST', body: JSON.stringify(log) });
  },

  updateLog: async (logId: string, data: Partial<WorkoutLog>) => {
    await request(`/api/logs/${logId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deleteLog: async (logId: string) => {
    await request(`/api/logs/${logId}`, { method: 'DELETE' });
  },

  // Fetch once, then refetch whenever the server broadcasts a change (SSE).
  subscribeToLogs: (userIds: string[], callback: (logs: WorkoutLog[]) => void) => {
    if (userIds.length === 0) return () => {};
    let alive = true;
    const fetchLogs = () =>
      request('/api/logs').then((logs: WorkoutLog[]) => { if (alive) callback(logs); }).catch(() => {});
    fetchLogs();
    const es = new EventSource(`${API}/api/events?token=${getToken()}`);
    es.onmessage = (e) => { if (e.data === 'logs' || e.data === 'users') fetchLogs(); };
    return () => { alive = false; es.close(); };
  },

  // --- FOOD ---

  analyzeFood: async (photo: string | null, description: string, date: string): Promise<FoodLog> =>
    request('/api/food', { method: 'POST', body: JSON.stringify({ photo, description, date }) }),

  getFoodLogs: async (date: string): Promise<FoodLog[]> =>
    request(`/api/food?date=${date}`),

  subscribeToFood: (date: string, callback: (entries: FoodLog[]) => void) => {
    let alive = true;
    const fetchFood = () =>
      backend.getFoodLogs(date).then((f) => { if (alive) callback(f); }).catch(() => {});
    fetchFood();
    const es = new EventSource(`${API}/api/events?token=${getToken()}`);
    es.onmessage = (e) => { if (e.data === 'food') fetchFood(); };
    return () => { alive = false; es.close(); };
  },

  updateFoodLog: async (id: string, data: Partial<FoodLog>): Promise<FoodLog> =>
    request(`/api/food/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteFoodLog: async (id: string) => {
    await request(`/api/food/${id}`, { method: 'DELETE' });
  },
};
