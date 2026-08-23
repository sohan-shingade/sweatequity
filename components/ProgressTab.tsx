import React, { useState, useEffect } from 'react';
import { User, WorkoutLog, WeeklySummary } from '../types';
import { displayDate } from '../lib/dates';
import { backend } from '../services/backend';
import Heatmap from './Heatmap';
import { Calendar, Loader2, Trophy, PieChart as PieChartIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

interface ProgressTabProps {
  currentUser: User;
  partner: User;
  logs: WorkoutLog[];
  volumeData: { name: string; u1: number; u2: number }[];
  activityData: { name: string; value: number }[];
}

const ProgressTab: React.FC<ProgressTabProps> = ({ currentUser, partner, logs, volumeData, activityData }) => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    backend.getWeeklyHistory(currentUser.id)
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentUser.id]);

  return (
    <div className="space-y-4">

      {/* Consistency */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" /> Consistency
        </h3>
        <div className="space-y-5">
          {[{ user: currentUser, label: 'You' }, { user: partner, label: partner.name }].map(({ user, label }) => (
            <div key={user.id}>
              <div className="flex items-center gap-2 mb-2">
                <img src={user.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                <span className="text-xs text-slate-300 font-semibold">{label}</span>
              </div>
              <Heatmap logs={logs} userId={user.id} />
            </div>
          ))}
        </div>
      </section>

      {/* Weekly volume */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="font-bold text-white text-sm mb-2">This Week&apos;s Volume</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="u1" name="You" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="u2" name={partner.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>You</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{partner.name}</span>
        </div>
      </section>

      {/* Workout types */}
      {activityData.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
            <PieChartIcon size={15} className="text-slate-400" /> Workout Types
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={activityData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {activityData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
            {activityData.map((a, i) => (
              <span key={a.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                {a.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Battle history */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="font-bold text-white text-sm mb-4">Battle History</h3>
        {isLoading ? (
          <div className="flex justify-center py-8 text-slate-500">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm">No history yet — finish a week to see it here.</p>
            <p className="text-[10px] text-slate-600 mt-1">Updated every Monday</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((sum) => {
              const me = sum.stats[currentUser.id];
              const other = sum.stats[Object.keys(sum.stats).find(id => id !== currentUser.id) || ''];
              return (
                <div key={sum.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {displayDate(sum.weekStarting)} – {displayDate(sum.weekEnding)}
                    </span>
                    {me && me.debt === 0 && <Trophy size={13} className="text-yellow-500" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ s: me, label: 'You' }, { s: other, label: other?.name }].map(({ s, label }, i) => s && (
                      <div key={i} className={`flex items-center gap-2.5 ${i === 1 ? 'border-l border-slate-700 pl-3' : ''}`}>
                        <img src={s.avatar} className="w-8 h-8 rounded-full object-cover grayscale-[0.5]" alt="" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{label}</p>
                          <p className={`text-sm font-mono ${s.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {s.actual}/{s.goal} · ${s.debt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProgressTab;
