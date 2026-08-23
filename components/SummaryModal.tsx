import React from 'react';
import { WeeklySummary } from '../types';
import { displayDate } from '../lib/dates';
import { X, Trophy, TrendingDown, DollarSign, CheckCircle2, ChevronRight } from 'lucide-react';

interface SummaryModalProps {
  summary: WeeklySummary | null;
  isOpen: boolean;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ summary, isOpen, onClose }) => {
  if (!isOpen || !summary) return null;

  const userIds = Object.keys(summary.stats);
  const user1 = summary.stats[userIds[0]];
  const user2 = summary.stats[userIds[1]];

  const winner = user1.debt < user2.debt ? user1 : (user2.debt < user1.debt ? user2 : null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scaleUp">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500"></div>
        
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Trophy className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Last Week's Results</h2>
          <p className="text-slate-400 font-medium">
            {displayDate(summary.weekStarting)} - 
            {displayDate(summary.weekEnding)}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[user1, user2].map((u, i) => (
            <div key={i} className={`p-6 rounded-2xl border transition-all ${u.debt > 0 ? 'bg-rose-950/10 border-rose-900/30' : 'bg-emerald-950/10 border-emerald-900/30'}`}>
              <div className="flex items-center gap-4 mb-4">
                <img src={u.avatar} className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover" alt={u.name} />
                <div className="text-left">
                  <h3 className="font-bold text-white">{u.name}</h3>
                  <p className="text-xs text-slate-400">{u.actual}/{u.goal} workouts</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Status</span>
                  {u.actual >= u.goal ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Goal Met
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <TrendingDown size={14} /> Missed {u.goal - u.actual}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Amount Owed</span>
                  <span className={`text-xl font-mono font-bold ${u.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ${u.debt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {winner && (
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Trophy size={18} className="text-yellow-500" />
              </div>
              <span className="text-slate-200 font-medium">Winner: <strong className="text-white">{winner.name}</strong></span>
            </div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Victory!</span>
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
        >
          Start New Week <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SummaryModal;