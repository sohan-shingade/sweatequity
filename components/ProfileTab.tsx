import React, { useRef, useState } from 'react';
import { User } from '../types';
import { LogOut, UserMinus, ShieldAlert, Camera, Loader2, Save, Target, KeyRound, Copy, Check } from 'lucide-react';
import { backend, getToken } from '../services/backend';

interface ProfileTabProps {
  currentUser: User;
  partner: User | null;
  onUnlink: () => void;
  onSignOut: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, partner, onUnlink, onSignOut }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [goal, setGoal] = useState(currentUser.goalDays);
  const [wager, setWager] = useState(currentUser.wagerAmount);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 300;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          backend.updateProfile(currentUser.id, { avatar: canvas.toDataURL('image/jpeg', 0.7) })
            .then(() => window.location.reload())
            .catch(console.error)
            .finally(() => setIsUploading(false));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveContract = async () => {
    setIsSavingSettings(true);
    try {
      await backend.updateSharedGoals(currentUser.id, currentUser.partnerId || null, goal, wager);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update contract', error);
      alert('Failed to update battle contract.');
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Profile card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
        <div className="relative cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700">
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-emerald-500" size={20} />
              </div>
            ) : (
              <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-700 rounded-full p-1.5 text-slate-300">
            <Camera size={12} />
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-white text-lg truncate">{currentUser.name}</h3>
          <p className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded inline-block mt-1">
            {currentUser.pairingCode}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Tap avatar to change</p>
        </div>
      </div>

      {/* Access token */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <KeyRound size={14} /> Access Token
        </h3>
        <p className="text-xs text-slate-500">
          Your only login credential. Copy it to sign in on another device — keep it private.
        </p>
        <button
          onClick={() => {
            const t = getToken();
            if (t) {
              navigator.clipboard.writeText(t);
              setTokenCopied(true);
              setTimeout(() => setTokenCopied(false), 2000);
            }
          }}
          className="w-full bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl p-3 flex items-center justify-between transition-colors"
        >
          <span className="font-mono text-xs text-slate-400 truncate">
            {(getToken() || '').slice(0, 12)}••••••••••••
          </span>
          {tokenCopied
            ? <Check size={16} className="text-emerald-500 shrink-0" />
            : <Copy size={16} className="text-slate-500 shrink-0" />}
        </button>
      </div>

      {/* Battle contract */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Target size={14} /> Battle Contract
        </h3>
        <p className="text-xs text-slate-500">
          Changes apply to <strong className="text-slate-300">both</strong> you and {partner ? partner.name : 'your partner'}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Weekly Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-emerald-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} Days</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Miss Penalty</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={wager}
                onChange={(e) => setWager(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-white p-3 pl-7 rounded-xl outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleSaveContract}
          disabled={isSavingSettings || (goal === currentUser.goalDays && wager === currentUser.wagerAmount)}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-emerald-500/20 text-emerald-400 active:bg-emerald-500 active:text-white disabled:opacity-40"
        >
          {isSavingSettings ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Update Contract</>}
        </button>
      </div>

      {/* Danger zone */}
      {partner && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-rose-500 shrink-0" size={18} />
            <div>
              <h4 className="text-rose-200 font-bold text-sm">Zone of Danger</h4>
              <p className="text-rose-200/70 text-xs mt-1">
                Unlinking ends the current battle with <strong>{partner.name}</strong> immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Are you sure you want to end the battle?')) onUnlink(); }}
            className="w-full bg-rose-600 active:bg-rose-500 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <UserMinus size={16} /> End Battle with {partner.name}
          </button>
        </div>
      )}

      <button
        onClick={onSignOut}
        className="w-full bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </button>

      <p className="text-center text-[10px] text-slate-600 pb-2">SweatEquity v2.0</p>
    </div>
  );
};

export default ProfileTab;
