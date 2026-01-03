import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, Upload, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmit: (activity: string, duration: number, photoUrl: string) => void;
}

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, currentUser, onSubmit }) => {
  const [activity, setActivity] = useState('Running');
  const [duration, setDuration] = useState(45);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize image to avoid Firestore 1MB limit
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 800;

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress as JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setPreviewUrl(dataUrl);
          }
          setIsProcessing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass the real previewUrl (base64) or empty string if none
    onSubmit(activity, duration, previewUrl || '');
    // Reset state
    setActivity('Running');
    setDuration(45);
    setPreviewUrl(null);
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
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                previewUrl ? 'border-emerald-500 bg-slate-800' : 'border-slate-700 hover:border-emerald-500 hover:text-emerald-500 bg-slate-800/50 text-slate-500'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
              
              {isProcessing ? (
                <div className="animate-pulse flex flex-col items-center">
                   <Upload size={24} className="mb-2" />
                   <span className="text-sm">Compressing...</span>
                </div>
              ) : previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white p-2 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Camera size={24} className="mb-2" />
                  <span className="text-sm">Tap to upload photo</span>
                  <span className="text-xs text-slate-600 mt-1">Supports JPG, PNG</span>
                </>
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
          >
            {isProcessing ? 'Processing...' : 'Submit Log'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogModal;