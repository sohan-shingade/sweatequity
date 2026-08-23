import React, { useState, useEffect } from 'react';
import { User, WeeklySummary } from '../types';
import { displayDate } from '../lib/dates';
import { backend } from '../services/backend';
import { X, Calendar, History, Loader2, Trophy } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      backend.getWeeklyHistory(currentUser.id)
        .then(setSummaries)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <History className="text-emerald-500" size={24} />
            <h2 className="text-xl font-bold text-white">Battle History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Loading your legacy...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
              <Calendar className="mx-auto text-slate-700 mb-3" size={40} />
              <p className="text-slate-500 text-sm">No history yet. Complete a week to see it here!</p>
            </div>
          ) : (
            summaries.map((sum) => {
              const uids = Object.keys(sum.stats);
              const me = sum.stats[currentUser.id];
              const partner = sum.stats[uids.find(id => id !== currentUser.id) || ''];
              const dateRange = `${displayDate(sum.weekStarting)} - ${displayDate(sum.weekEnding)}`;
              
              return (
                <div key={sum.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{dateRange}</span>
                    <div className="flex gap-1">
                       {me.debt === 0 && <Trophy size={14} className="text-yellow-500" />}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <img src={me.avatar} className="w-8 h-8 rounded-full object-cover grayscale-[0.5]" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">You</p>
                        <p className={`text-sm font-mono ${me.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${me.debt}
                        </p>
                      </div>
                    </div>
                    {partner && (
                      <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
                        <img src={partner.avatar} className="w-8 h-8 rounded-full object-cover grayscale-[0.5]" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{partner.name}</p>
                          <p className={`text-sm font-mono ${partner.debt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ${partner.debt}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
           <p className="text-[10px] text-slate-600 font-medium">HISTORY IS UPDATED EVERY MONDAY</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;