import React from 'react';
import { User, WorkoutLog } from '../types';
import { displayDate } from '../lib/dates';
import { Flame, Clock, Pencil, Trash2, Trophy } from 'lucide-react';

export interface WeekStats {
  count: number;
  goal: number;
  debt: number;
}

interface HomeTabProps {
  currentUser: User;
  partner: User;
  myStats: WeekStats;
  partnerStats: WeekStats;
  streak: number;
  weeklyMinutes: number;
  hasLoggedToday: boolean;
  logs: WorkoutLog[];
  weekStart: string;
  wager: number;
  onLog: () => void;
  onEditLog: (log: WorkoutLog) => void;
  onDeleteLog: (logId: string) => void;
  onExpandImage: (url: string) => void;
}

const progressColor = (current: number, goal: number) => {
  if (current >= goal) return 'bg-emerald-500';
  if (current >= goal / 2) return 'bg-yellow-500';
  return 'bg-rose-500';
};

const BattleRow = ({ user, label, stats }: { user: User; label: string; stats: WeekStats }) => (
  <div className="flex items-center gap-3">
    <img src={user.avatar} className="w-11 h-11 rounded-full border-2 border-slate-700 object-cover shrink-0" alt={label} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-bold text-white text-sm truncate">{label}</span>
        <span className="text-xs font-mono text-slate-400 shrink-0 ml-2">
          {stats.count}/{stats.goal}
          <span className={`ml-2 font-bold ${stats.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {stats.debt > 0 ? `-$${stats.debt}` : 'safe'}
          </span>
        </span>
      </div>
      <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${progressColor(stats.count, stats.goal)}`}
          style={{ width: `${Math.min(100, (stats.count / Math.max(1, stats.goal)) * 100)}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const HomeTab: React.FC<HomeTabProps> = ({
  currentUser, partner, myStats, partnerStats, streak, weeklyMinutes,
  hasLoggedToday, logs, weekStart, wager, onLog, onEditLog, onDeleteLog, onExpandImage,
}) => (
  <div className="space-y-4">

    {/* Nudge — tappable */}
    {!hasLoggedToday && (
      <button
        onClick={onLog}
        className="w-full bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 flex items-center gap-3 text-left active:bg-orange-500/20 transition-colors"
      >
        <div className="bg-orange-500/20 p-2 rounded-full text-orange-400 shrink-0">
          <Clock size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-orange-200 font-bold text-sm">No workout logged today</p>
          <p className="text-orange-200/60 text-xs">Tap to log one — streak at risk.</p>
        </div>
      </button>
    )}

    {/* This Week — head-to-head */}
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2 text-sm">
          <Trophy size={16} className="text-yellow-500" /> This Week
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          {displayDate(weekStart)} · <span className="text-emerald-400">${wager}/miss</span>
        </span>
      </div>
      <div className="space-y-4">
        <BattleRow user={currentUser} label="You" stats={myStats} />
        <BattleRow user={partner} label={partner.name} stats={partnerStats} />
      </div>
    </section>

    {/* Quick stats */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-xl"><Flame size={20} /></div>
        <div>
          <p className="text-xl font-bold text-white leading-tight">{streak}</p>
          <p className="text-[11px] text-slate-500">day streak</p>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl"><Clock size={20} /></div>
        <div>
          <p className="text-xl font-bold text-white leading-tight">{weeklyMinutes}m</p>
          <p className="text-[11px] text-slate-500">this week</p>
        </div>
      </div>
    </div>

    {/* Activity feed */}
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <h3 className="font-bold text-white text-sm mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {logs.slice(0, 10).map((log) => {
          const isMe = log.userId === currentUser.id;
          const user = isMe ? currentUser : partner;
          return (
            <div key={log.id} className="flex gap-3">
              <img src={user.avatar} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300">
                      <span className="font-bold text-slate-100">{isMe ? 'You' : user.name}</span>
                      {' '}· <span className="text-emerald-400">{log.activity}</span>
                      {log.subType && <span className="text-slate-500"> ({log.subType})</span>}
                      {' '}<span className="text-slate-500">{log.durationMinutes}m</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {displayDate(log.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {isMe && (
                    <div className="flex items-center shrink-0">
                      <button onClick={() => onEditLog(log)} className="p-2 -my-1 text-slate-500 active:text-emerald-400"><Pencil size={15} /></button>
                      <button onClick={() => onDeleteLog(log.id)} className="p-2 -my-1 -mr-2 text-slate-500 active:text-rose-400"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                {log.photoUrl && (
                  <div
                    onClick={() => onExpandImage(log.photoUrl!)}
                    className="rounded-xl overflow-hidden h-36 w-full bg-slate-800 mt-2 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <img src={log.photoUrl} className="w-full h-full object-cover" alt="Proof" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {logs.length === 0 && <div className="text-center text-slate-500 text-sm py-4">No activity yet. Log your first workout!</div>}
      </div>
    </section>
  </div>
);

export default HomeTab;
