import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { LogOut, UserMinus, X, ShieldAlert, Camera, Loader2, Save, Target } from 'lucide-react';
import { backend } from '../services/backend';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partner: User | null;
  onUnlink: () => void;
  onSignOut: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, currentUser, partner, onUnlink, onSignOut 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Goal Settings State
  const [goal, setGoal] = useState(currentUser.goalDays);
  const [wager, setWager] = useState(currentUser.wagerAmount);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGoal(currentUser.goalDays);
      setWager(currentUser.wagerAmount);
      setSaveSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize logic - Keep profile pics smaller (e.g., 300px)
          const canvas = document.createElement('canvas');
          const MAX_DIM = 300;
          let width = img.width;
          let height = img.height;

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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Save immediately
            backend.updateProfile(currentUser.id, { avatar: dataUrl })
              .then(() => {
                window.location.reload(); 
              })
              .catch(console.error)
              .finally(() => setIsUploading(false));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveContract = async () => {
    setIsSavingSettings(true);
    try {
      await backend.updateSharedGoals(currentUser.id, currentUser.partnerId || null, goal, wager);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      // Force reload to update app state immediately
      window.location.reload();
    } catch (error) {
      console.error("Failed to update contract", error);
      alert("Failed to update battle contract.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Profile Section */}
          <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600 group-hover:border-emerald-500 transition-colors">
                 {isUploading ? (
                   <div className="w-full h-full flex items-center justify-center bg-slate-900">
                     <Loader2 className="animate-spin text-emerald-500" size={20} />
                   </div>
                 ) : (
                   <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                 )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarSelect}
              />
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg">{currentUser.name}</h3>
              <p className="text-xs text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded inline-block mt-1">
                {currentUser.pairingCode}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Click avatar to change</p>
            </div>
          </div>

          <div className="border-t border-slate-800 my-4"></div>

          {/* Battle Contract Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Target size={16} /> Battle Contract
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
              <p className="text-xs text-slate-400">
                Changes here affect <strong>both</strong> you and {partner ? partner.name : 'your partner'}.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Weekly Goal</label>
                   <select 
                      value={goal}
                      onChange={(e) => setGoal(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg outline-none focus:border-emerald-500"
                   >
                     {[1,2,3,4,5,6,7].map(n => (
                       <option key={n} value={n}>{n} Days</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Miss Penalty ($)</label>
                   <div className="relative">
                     <span className="absolute left-3 top-3 text-slate-500">$</span>
                     <input 
                        type="number" 
                        value={wager}
                        onChange={(e) => setWager(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-3 pl-7 rounded-lg outline-none focus:border-emerald-500"
                     />
                   </div>
                </div>
              </div>

              <button 
                onClick={handleSaveContract}
                disabled={isSavingSettings || (goal === currentUser.goalDays && wager === currentUser.wagerAmount)}
                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  saveSuccess 
                    ? 'bg-green-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSavingSettings ? <Loader2 className="animate-spin" size={16} /> : (saveSuccess ? 'Updated!' : <><Save size={16}/> Update Contract</>)}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 my-4"></div>

          {/* Actions */}
          <div className="space-y-3">
            {partner && (
              <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-xl space-y-3">
                 <div className="flex items-start gap-3">
                    <ShieldAlert className="text-rose-500 shrink-0" size={20} />
                    <div>
                      <h4 className="text-rose-200 font-bold text-sm">Zone of Danger</h4>
                      <p className="text-rose-200/70 text-xs mt-1">
                        Unlinking will end the current battle with <strong>{partner.name}</strong> immediately.
                      </p>
                    </div>
                 </div>
                 <button 
                  onClick={() => {
                    if(confirm("Are you sure you want to end the battle?")) onUnlink();
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <UserMinus size={18} /> End Battle with {partner.name}
                </button>
              </div>
            )}

            <button 
              onClick={onSignOut}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
          
          <div className="text-center">
             <p className="text-[10px] text-slate-600">SweatEquity v1.0.3</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;