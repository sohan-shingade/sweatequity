import React from 'react';
import { WorkoutLog } from '../types';
import { formatDate } from '../lib/dates';

interface HeatmapProps {
  logs: WorkoutLog[];
  userId: string;
}

const DAYS_SHOWN = 90;

const Heatmap: React.FC<HeatmapProps> = ({ logs, userId }) => {
  const userLogs = new Set(
    logs
      .filter(l => l.userId === userId)
      .map(l => l.date)
  );

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS_SHOWN - 1 - i));
    const date = formatDate(d);
    return { date, active: userLogs.has(date) };
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>3 Months Ago</span>
        <span>Today</span>
      </div>
      <div className="grid grid-rows-7 grid-flow-col gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            title={day.date}
            className={`w-3 h-3 rounded-sm transition-colors ${
              day.active
                ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Heatmap;
