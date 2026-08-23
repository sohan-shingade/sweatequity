import { useState, useEffect, useMemo } from 'react';
import { Flame, X } from 'lucide-react';

import { backend } from './services/backend';
import { User, WorkoutLog, WeekState, OnboardingStep, WeeklySummary } from './types';
import { formatDate, todayStr, getStartOfWeek, addDays } from './lib/dates';
import LogModal from './components/LogModal';
import Onboarding from './components/Onboarding';
import SummaryModal from './components/SummaryModal';
import FoodSection from './components/FoodSection';
import BottomNav, { Tab } from './components/BottomNav';
import HomeTab from './components/HomeTab';
import ProgressTab from './components/ProgressTab';
import ProfileTab from './components/ProfileTab';

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
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
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

  const tabTitles: { [key in Tab]: string } = {
    home: 'Home',
    fuel: 'Fuel',
    progress: 'Progress',
    profile: 'Profile',
  };

  const handleCenterLog = () => {
    if (activeTab === 'fuel') {
      setIsFoodModalOpen(true);
    } else {
      setEditingLog(null);
      setIsLogModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Slim sticky header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg">
              <Flame className="text-white" size={16} />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              Sweat<span className="text-emerald-400">Equity</span>
            </h1>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1">
            ${weekState.wagerAmount} stake
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 pb-28">
        <h2 className="sr-only">{tabTitles[activeTab]}</h2>

        {activeTab === 'home' && (
          <HomeTab
            currentUser={currentUser}
            partner={partner}
            myStats={user1Stats}
            partnerStats={user2Stats}
            streak={streak}
            weeklyMinutes={weeklyMinutes}
            hasLoggedToday={hasLoggedToday}
            logs={logs}
            weekStart={weekState.startDate}
            wager={weekState.wagerAmount}
            onLog={() => { setEditingLog(null); setIsLogModalOpen(true); }}
            onEditLog={handleEditClick}
            onDeleteLog={handleDeleteClick}
            onExpandImage={setExpandedImage}
          />
        )}

        {activeTab === 'fuel' && (
          <FoodSection
            currentUser={currentUser}
            partner={partner}
            isModalOpen={isFoodModalOpen}
            setIsModalOpen={setIsFoodModalOpen}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab
            currentUser={currentUser}
            partner={partner}
            logs={logs}
            volumeData={volumeData}
            activityData={activityData}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            currentUser={currentUser}
            partner={partner}
            onUnlink={async () => { await backend.unlinkPartner(currentUser.id); setAppState('PARTNER'); }}
            onSignOut={async () => { await backend.signOut(); setAppState('AUTH'); }}
          />
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} onLog={handleCenterLog} />

      {/* Modals */}
      <LogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} currentUser={currentUser} onSubmit={handleSaveLog} initialData={editingLog} />
      <SummaryModal summary={pendingSummary} isOpen={!!pendingSummary} onClose={() => setPendingSummary(null)} />

      {expandedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn" onClick={() => setExpandedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 active:text-white bg-white/10 p-2 rounded-full transition-colors"><X size={32} /></button>
          <img src={expandedImage} alt="Workout Proof" className="max-w-full max-h-full rounded-xl shadow-2xl animate-scaleUp" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default App;
