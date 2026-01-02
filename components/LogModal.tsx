import React, { useState } from 'react';
import { User } from '../types';
import { X, Upload, Camera } from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmit: (activity: string, duration: number, photoUrl: string) => void;
}

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, currentUser, onSubmit }) => {
  const [activity, setActivity] = useState('Running');
  const [duration, setDuration] = useState(45);
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate uploading an image by picking a random seed
    const randomSeed = Math.floor(Math.random() * 1000);
    const mockPhoto = `https://picsum.photos/seed/${randomSeed}/400/300`;
    onSubmit(activity, duration, mockPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Log Workout</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Activity</label>
            <select 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option>Running</option>
              <option>Weightlifting</option>
              <option>Cycling</option>
              <option>Yoga</option>
              <option>CrossFit</option>
              <option>Swimming</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Duration (Minutes)</label>
            <input 
              type="number" 
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Proof of Sweat</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-colors cursor-pointer bg-slate-800/50">
              <Camera size={24} className="mb-2" />
              <span className="text-sm">Tap to take photo</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">*In a real app, this opens the camera.</p>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
          >
            Submit Log
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogModal;