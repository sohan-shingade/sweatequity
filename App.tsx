import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Flame, 
  Calendar, 
  Activity, 
  Plus, 
  TrendingUp,
  Bell,
  Clock,
  Settings,
  Pencil,
  Trash2,
  PieChart as PieChartIcon,
  X,
  Maximize2,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { backend } from './services/backend';
import { User, WorkoutLog, WeekState, OnboardingStep, WeeklySummary } from './types';
import { formatDate, todayStr, getStartOfWeek, addDays, displayDate } from './lib/dates';
import Heatmap from './components/Heatmap';
import LogModal from './components/LogModal';
import Onboarding from './components/Onboarding';
import SettingsModal from './components/SettingsModal';
import SummaryModal from './components/SummaryModal';
import HistoryModal from './components/HistoryModal';

// --- Helpers ---

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ size?: number }>;
  colorClass?: string;
}

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) => (
  <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start justify-between backdrop-blur-sm">
    <div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      {subtext && <p className={`text-xs mt-1 ${colorClass || 'text-slate-500'}`}>{subtext}</p>}
    </div>
    <div className={`p-2 rounded-lg bg-slate-700/50 ${colorClass?.replace('text-', 'text-') || 'text-slate-400'}`}>
      <Icon size={20} />
    </div>
  </div>
);

const ReminderBanner = ({ hasLoggedToday, userName }: { hasLoggedToday: boolean, userName: string }) => {
  if (hasLoggedToday) return null;

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between animate-pulse-slow">
      <div className="flex items-center gap-3">
        <div className="bg-orange-500/20 p-2 rounded-full text-orange-400">
          <Clock size={20} />
        </div>
        <div>
          <h4 className="text-orange-200 font-bold text-sm">Action Required</h4>
          <p className="text-orange-200/70 text-xs">You haven't logged a workout yet today, {userName}.</p>
        </div>
      </div>
      <div className="hidden md:block text-right">
        <p className="text-[10px] text-orange-300 uppercase font-bold tracking-wider">Alert</p>
        <p className="text-xs text-orange-400">Streak at risk!</p>
      </div>
    </div>
  );
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

function App() {
  // Auth & Onboarding State
  const [appState, setAppState] = useState<OnboardingStep>('AUTH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // App Data
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [weekState, setWeekState] = useState<WeekState>({
    startDate: formatDate(getStartOfWeek(new Date())),
    wagerAmount: 20
  });
  
  // UI State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [pendingSummary, setPendingSummary] = useState<WeeklySummary | null>(null);

  // --- Initialization ---
  
  useEffect(() => {
    const initSession = async () => {
      setIsLoadingAuth(true);
      try {
        const user = await backend.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setWeekState(prev => ({ ...prev, wagerAmount: user.wagerAmount }));
          
          if (user.partnerId) {
            const partnerData = await backend.getUserById(user.partnerId);
            if (partnerData) {
              setPartner(partnerData);
              setAppState('COMPLETED');
            } else {
              setAppState('PARTNER');
            }
          } else {
            setAppState(user.goalDays > 0 ? 'PARTNER' : 'PROFILE');
          }
        } else {
          setAppState('AUTH');
        }
      } catch (err) {
        console.error("Session init failed", err);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    initSession();
  }, []);

  // --- Real-Time Sync Subscription ---
  
  useEffect(() => {
    if (appState === 'COMPLETED' && currentUser && partner) {
      const unsubscribe = backend.subscribeToLogs(
        [currentUser.id, partner.id], 
        (updatedLogs) => setLogs(updatedLogs)
      );
      return () => unsubscribe();
    }
  }, [appState, currentUser, partner]);

  // --- Weekly Reset Logic ---
  
  useEffect(() => {
    const checkWeeklyReset = async () => {
      if (appState !== 'COMPLETED' || !currentUser || !partner || logs.length === 0) return;

      const currentWeekStartStr = formatDate(getStartOfWeek(new Date()));
      const lastResetStr = (currentUser.lastResetDate || '1970-01-01').slice(0, 10);

      // Check if we have entered a new week since the last recorded reset
      if (currentWeekStartStr > lastResetStr) {
        // 1. Range of the PREVIOUS week: [start - 7 days, start)
        const lastWeekStartStr = addDays(currentWeekStartStr, -7);
        const lastWeekEndStr = addDays(currentWeekStartStr, -1);

        const lastWeekLogs = logs.filter(l =>
          l.date >= lastWeekStartStr && l.date <= lastWeekEndStr
        );

        const u1Logs = lastWeekLogs.filter(l => l.userId === currentUser.id).length;
        const u2Logs = lastWeekLogs.filter(l => l.userId === partner.id).length;

        const summary: WeeklySummary = {
          id: `sum-${lastWeekStartStr}`,
          weekStarting: lastWeekStartStr,
          weekEnding: lastWeekEndStr,
          participantIds: [currentUser.id, partner.id],
          stats: {
            [currentUser.id]: {
              name: currentUser.name,
              avatar: currentUser.avatar,
              goal: currentUser.goalDays,
              actual: u1Logs,
              debt: Math.max(0, (currentUser.goalDays - u1Logs) * currentUser.wagerAmount),
              wager: currentUser.wagerAmount
            },
            [partner.id]: {
              name: partner.name,
              avatar: partner.avatar,
              goal: partner.goalDays,
              actual: u2Logs,
              debt: Math.max(0, (partner.goalDays - u2Logs) * partner.wagerAmount),
              wager: partner.wagerAmount
            }
          }
        };

        // 2. Save history and update user's last reset timestamp
        await backend.saveWeeklySummary(summary);
        await backend.updateLastResetDate(currentUser.id, currentWeekStartStr);

        // 3. Trigger popup
        setPendingSummary(summary);

        // 4. Update UI current week start
        setWeekState(prev => ({ ...prev, startDate: currentWeekStartStr }));
      }
    };

    checkWeeklyReset();
  }, [appState, currentUser, partner, logs]);

  // --- Handlers ---

  const handleSaveLog = async (activity: string, duration: number, photoUrl: string, subType?: string, date?: string) => {
    if (!currentUser) return;
    if (editingLog) {
      await backend.updateLog(editingLog.id, {
        activity, durationMinutes: duration, photoUrl, date: date || editingLog.date, subType: subType || null
      });
      setEditingLog(null);
    } else {
      await backend.addLog({
        id: Date.now().toString(),
        userId: currentUser.id,
        date: date || todayStr(),
        activity, subType, durationMinutes: duration, photoUrl, verified: true
      });
    }
  };

  const handleEditClick = (log: WorkoutLog) => {
    setEditingLog(log);
    setIsLogModalOpen(true);
  };

  const handleDeleteClick = async (logId: string) => {
    if (confirm("Are you sure you want to delete this log?")) {
      await backend.deleteLog(logId);
    }
  };

  // --- Derived State ---

  const currentWeekLogs = useMemo(() => {
    return logs.filter(l => l.date >= weekState.startDate);
  }, [logs, weekState.startDate]);

  const hasLoggedToday = useMemo(() => {
    if (!currentUser) return false;
    const today = todayStr();
    return logs.some(l => l.userId === currentUser.id && l.date === today);
  }, [logs, currentUser]);

  const user1Stats = useMemo(() => {
    if (!currentUser) return null;
    const userLogs = currentWeekLogs.filter(l => l.userId === currentUser.id);
    const count = userLogs.length;
    const goal = currentUser.goalDays;
    const debt = Math.max(0, (goal - count) * currentUser.wagerAmount);
    return { count, goal, debt, logs: userLogs };
  }, [currentWeekLogs, currentUser]);

  const user2Stats = useMemo(() => {
    if (!partner) return null;
    const userLogs = currentWeekLogs.filter(l => l.userId === partner.id);
    const count = userLogs.length;
    const goal = partner.goalDays;
    const debt = Math.max(0, (goal - count) * partner.wagerAmount);
    return { count, goal, debt, logs: userLogs };
  }, [currentWeekLogs, partner]);

  // Current streak: consecutive days with a log, counting back from today
  // (today itself doesn't break the streak if not yet logged).
  const streak = useMemo(() => {
    if (!currentUser) return 0;
    const days = new Set(logs.filter(l => l.userId === currentUser.id).map(l => l.date));
    let count = 0;
    let day = todayStr();
    if (!days.has(day)) day = addDays(day, -1); // grace for today
    while (days.has(day)) {
      count++;
      day = addDays(day, -1);
    }
    return count;
  }, [logs, currentUser]);

  const weeklyMinutes = useMemo(() => {
    if (!currentUser) return 0;
    return currentWeekLogs
      .filter(l => l.userId === currentUser.id)
      .reduce((sum, l) => sum + l.durationMinutes, 0);
  }, [currentWeekLogs, currentUser]);

  // Minutes per weekday for the current week, both users
  const volumeData = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels.map((name, i) => {
      const dayStr = addDays(weekState.startDate, i);
      const dayLogs = currentWeekLogs.filter(l => l.date === dayStr);
      return {
        name,
        u1: dayLogs.filter(l => l.userId === currentUser?.id).reduce((s, l) => s + l.durationMinutes, 0),
        u2: dayLogs.filter(l => l.userId === partner?.id).reduce((s, l) => s + l.durationMinutes, 0),
      };
    });
  }, [currentWeekLogs, weekState.startDate, currentUser, partner]);

  const activityData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    logs.forEach(log => {
      counts[log.activity] = (counts[log.activity] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [logs]);

  const getProgressColor = (current: number, goal: number) => {
    if (current >= goal) return 'bg-emerald-500';
    if (current >= goal / 2) return 'bg-yellow-500';
    return 'bg-rose-500';
  };

  // --- Render Flow ---

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (appState !== 'COMPLETED' || !currentUser) {
    return (
      <Onboarding 
        initialStep={appState} 
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
        onComplete={(u, p) => { setCurrentUser(u); setPartner(p); setAppState('COMPLETED'); }} 
        onSignOut={async () => { await backend.signOut(); setCurrentUser(null); setAppState('AUTH'); }}
      />
    );
  }

  if (!partner || !user1Stats || !user2Stats) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-0">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg">
              <Flame className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Sweat<span className="text-emerald-400">Equity</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
             >
               <History size={20} />
               <span className="hidden sm:inline">History</span>
             </button>
             <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
             >
               <Settings size={20} />
             </button>
             <div className="flex items-center gap-3 bg-slate-800 rounded-full pl-3 pr-1 py-1 border border-slate-700">
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">{currentUser.name}</span>
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                </div>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        <ReminderBanner hasLoggedToday={hasLoggedToday} userName={currentUser.name} />

        {/* The Arena (Weekly Battle) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Weekly Arena
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                Week of {displayDate(weekState.startDate)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm font-mono text-emerald-400">
              ${weekState.wagerAmount} STAKE
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Current User Card */}
            <div className={`relative rounded-2xl p-6 border transition-all ${user1Stats.debt > 0 ? 'bg-rose-950/10 border-rose-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover" alt={currentUser.name} />
                  <div>
                    <h3 className="font-bold text-lg text-white">You</h3>
                    <p className="text-xs text-slate-400">Goal: {user1Stats.goal} days</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-xs uppercase font-bold ${user1Stats.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                     {user1Stats.debt > 0 ? 'At Risk' : 'Safe'}
                   </p>
                   <p className={`text-2xl font-mono font-bold ${user1Stats.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                     ${user1Stats.debt}
                   </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-mono">{user1Stats.count}/{user1Stats.goal}</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ${getProgressColor(user1Stats.count, user1Stats.goal)}`}
                    style={{ width: `${Math.min(100, (user1Stats.count / user1Stats.goal) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Partner Card */}
             <div className={`relative rounded-2xl p-6 border transition-all ${user2Stats.debt > 0 ? 'bg-rose-950/10 border-rose-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <img src={partner.avatar} className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover" alt={partner.name} />
                  <div>
                    <h3 className="font-bold text-lg text-white">{partner.name}</h3>
                    <p className="text-xs text-slate-400">Goal: {user2Stats.goal} days</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-xs uppercase font-bold ${user2Stats.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                     {user2Stats.debt > 0 ? 'At Risk' : 'Safe'}
                   </p>
                   <p className={`text-2xl font-mono font-bold ${user2Stats.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                     ${user2Stats.debt}
                   </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-mono">{user2Stats.count}/{user2Stats.goal}</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ${getProgressColor(user2Stats.count, user2Stats.goal)}`}
                    style={{ width: `${Math.min(100, (user2Stats.count / user2Stats.goal) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Workouts" value={logs.filter(l => l.userId === currentUser.id).length} icon={Activity} colorClass="text-blue-400" subtext="Your total" />
          <StatCard title="At Risk" value={`$${user1Stats.goal * currentUser.wagerAmount + user2Stats.goal * partner.wagerAmount}`} icon={TrendingUp} colorClass="text-emerald-400" subtext="Max this week" />
          <StatCard title="This Week" value={`${weeklyMinutes}m`} icon={Bell} colorClass="text-orange-400" subtext="Your minutes" />
          <StatCard title="Streak" value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`} icon={Flame} colorClass="text-rose-400" subtext="Current streak" />
        </section>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400"/> Consistency Map
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <img src={currentUser.avatar} className="w-5 h-5 rounded-full object-cover" />
                       <span className="text-sm text-slate-300">You</span>
                    </div>
                    <Heatmap logs={logs} userId={currentUser.id} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <img src={partner.avatar} className="w-5 h-5 rounded-full object-cover" />
                       <span className="text-sm text-slate-300">{partner.name}</span>
                    </div>
                    <Heatmap logs={logs} userId={partner.id} />
                  </div>
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-4">
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-80">
                  <h3 className="text-lg font-bold text-white mb-4">Volume</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData}>
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                      <Bar dataKey="u1" name="You" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="u2" name={partner.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-80">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <PieChartIcon size={16} /> Types
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={activityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {activityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
            <h3 className="text-lg font-bold text-white mb-6">Recent Proof</h3>
            <div className="space-y-6">
              {logs.slice(0, 10).map((log) => {
                const isMe = log.userId === currentUser.id;
                const user = isMe ? currentUser : partner;
                return (
                  <div key={log.id} className={`relative pl-6 border-l-2 transition-colors pb-4 ${isMe ? 'border-emerald-500/50' : 'border-slate-800'}`}>
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isMe ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-900 border-slate-600'}`}></div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-200 text-sm">{isMe ? 'You' : user.name}</span>
                          <span className="text-slate-500 text-xs">• {displayDate(log.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">
                          Did <span className="text-emerald-400 font-medium">{log.activity}</span>
                          {log.subType && <span className="text-slate-500 text-xs ml-1">• {log.subType}</span>}
                          <span className="text-slate-500 text-xs ml-1">for {log.durationMinutes}m</span>
                        </p>
                      </div>
                      {isMe && (
                        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(log)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteClick(log.id)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    {log.photoUrl && (
                      <div onClick={() => setExpandedImage(log.photoUrl || null)} className="group relative rounded-lg overflow-hidden h-32 w-full bg-slate-800 mt-2 cursor-pointer transition-transform active:scale-95">
                        <img src={log.photoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Proof" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Maximize2 size={24} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {logs.length === 0 && <div className="text-center text-slate-500 text-sm py-4">No activity yet.</div>}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button onClick={() => { setEditingLog(null); setIsLogModalOpen(true); }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-emerald-500 hover:bg-emerald-400 text-white p-4 rounded-full shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 z-50 group">
        <Plus size={28} />
      </button>

      {/* Modals */}
      <LogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} currentUser={currentUser} onSubmit={handleSaveLog} initialData={editingLog} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentUser={currentUser} partner={partner} onUnlink={async () => { await backend.unlinkPartner(currentUser.id); setAppState('PARTNER'); setIsSettingsOpen(false); }} onSignOut={async () => { await backend.signOut(); setAppState('AUTH'); setIsSettingsOpen(false); }} />
      <SummaryModal summary={pendingSummary} isOpen={!!pendingSummary} onClose={() => setPendingSummary(null)} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} currentUser={currentUser} />

      {expandedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn" onClick={() => setExpandedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={32} /></button>
          <img src={expandedImage} alt="Workout Proof" className="max-w-full max-h-full rounded-xl shadow-2xl animate-scaleUp" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default App;