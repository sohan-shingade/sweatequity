import React, { useState } from 'react';
import { User } from '../types';
import { getMockPartner } from '../services/mockData';
import { ArrowRight, Copy, Check, Users, Dumbbell, DollarSign } from 'lucide-react';

interface OnboardingProps {
  onComplete: (user: User, partner: User, wager: number) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  
  // Form State
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(5);
  const [wager, setWager] = useState(20);
  
  // Generated User State
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  
  // Partner State
  const [partnerCode, setPartnerCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newUser: User = {
      id: 'u1-custom', // In prod, from Auth
      name: name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      goalDays: goal,
      pairingCode: `${name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
    };
    setCreatedUser(newUser);
    setStep(2);
  };

  const handleSyncPartner = () => {
    if (!createdUser) return;
    
    // Simulate finding partner
    // In a real app, you'd check DB if partnerCode exists
    const partner = getMockPartner(partnerCode);
    
    // Artificial delay for effect
    setTimeout(() => {
      onComplete(createdUser, partner, wager);
    }, 800);
  };

  const copyCode = () => {
    if (createdUser?.pairingCode) {
      navigator.clipboard.writeText(createdUser.pairingCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          ></div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Sweat<span className="text-emerald-400">Equity</span>
          </h1>
          <p className="text-slate-400 text-sm">
            {step === 1 ? "Create your accountability profile" : "Sync with your workout partner"}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateProfile} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                     <Dumbbell size={14}/> Goal (Days/Wk)
                   </label>
                   <select 
                      value={goal}
                      onChange={(e) => setGoal(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                   >
                     {[1,2,3,4,5,6,7].map(n => (
                       <option key={n} value={n}>{n} Days</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                     <DollarSign size={14}/> Wager ($)
                   </label>
                   <input 
                      type="number" 
                      value={wager}
                      onChange={(e) => setWager(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
        )}

        {step === 2 && createdUser && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Your Code Section */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center">
              <p className="text-slate-400 text-sm mb-3">Share this code with your partner</p>
              <button 
                onClick={copyCode}
                className="w-full bg-slate-900 border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors group"
              >
                <span className="text-2xl font-mono font-bold text-emerald-400 tracking-widest">{createdUser.pairingCode}</span>
                {isCopied ? <Check size={20} className="text-emerald-500"/> : <Copy size={20} className="text-slate-500 group-hover:text-emerald-500"/>}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-500">OR</span>
              </div>
            </div>

            {/* Enter Code Section */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Enter their code</label>
              <input 
                type="text" 
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value)}
                placeholder="XXXX-0000"
                className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center font-mono uppercase placeholder:text-slate-700"
              />
              <button 
                onClick={handleSyncPartner}
                disabled={partnerCode.length < 3}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Users size={20} /> Sync & Start Battle
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;