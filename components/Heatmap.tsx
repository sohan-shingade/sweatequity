import React from 'react';
import { WorkoutLog } from '../types';

interface HeatmapProps {
  logs: WorkoutLog[];
  userId: string;
  year: number;
}

const Heatmap: React.FC<HeatmapProps> = ({ logs, userId, year }) => {
  // Generate simplified grid of days
  // In a real app, use a library like 'react-calendar-heatmap' or strict D3
  // Here we simulate the grid with CSS grid for visual effect
  
  const userLogs = new Set(
    logs
      .filter(l => l.userId === userId)
      .map(l => l.date)
  );

  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i)); // Last 90 days
    return {
      date: d.toISOString().split('T')[0],
      active: false // calculated below
    };
  }).map(day => ({
    ...day,
    active: userLogs.has(day.date)
  }));

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