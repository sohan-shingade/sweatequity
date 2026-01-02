import React from 'react';
import { User } from '../types';
import { LogOut, UserMinus, X, ShieldAlert } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Profile Section */}
          <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl">
            <img src={currentUser.avatar} alt="Me" className="w-12 h-12 rounded-full bg-slate-700" />
            <div>
              <h3 className="font-bold text-white">{currentUser.name}</h3>
              <p className="text-xs text-slate-400 font-mono">{currentUser.pairingCode}</p>
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
             <p className="text-[10px] text-slate-600">SweatEquity v1.0.2</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;