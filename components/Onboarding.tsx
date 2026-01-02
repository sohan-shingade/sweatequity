import React, { useState, useEffect } from 'react';
import { User, OnboardingStep } from '../types';
import { backend } from '../services/backend';
import { getMockPartner } from '../services/mockData'; // Fallback if needed
import { ArrowRight, Copy, Check, Users, Dumbbell, DollarSign, LogIn, Loader2, LogOut } from 'lucide-react';

interface OnboardingProps {
  initialStep: OnboardingStep;
  currentUser: User | null;
  onUpdateUser: (user: User) => void;
  onComplete: (user: User, partner: User) => void;
  onSignOut?: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ initialStep, currentUser, onUpdateUser, onComplete, onSignOut }) => {
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(5);
  const [wager, setWager] = useState(20);
  
  // Partner State
  const [partnerCode, setPartnerCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Effect to pre-fill name if user exists but profile step is active
  useEffect(() => {
    if (currentUser?.name && step === 'PROFILE') {
      setName(currentUser.name);
    }
  }, [currentUser, step]);

  // 1. Handle Sign In
  const handleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const user = await backend.signInWithGoogle();
      onUpdateUser(user);
      
      // Determine next step
      // If no goal set (0) or no name, go to profile.
      // Even if Google provides a name, we want them to set their goal/wager.
      if (!user.name || user.goalDays === 0) {
        setName(user.name || '');
        setStep('PROFILE');
      } else if (!user.partnerId) {
        setStep('PARTNER');
      } else {
        // Already fully set up
        const partner = await backend.getUserById(user.partnerId);
        if (partner) onComplete(user, partner);
        else {
          // Partner might be deleted or data corrupted
          setStep('PARTNER'); 
        }
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to sign in. " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Profile Creation
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentUser) return;
    setIsLoading(true);

    try {
      const updatedUser = await backend.updateProfile(currentUser.id, {
        name,
        avatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        goalDays: goal,
        wagerAmount: wager,
        // Ensure pairing code exists (backend should have set it, but double check)
        pairingCode: currentUser.pairingCode || `${name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
      });
      onUpdateUser(updatedUser);
      setStep('PARTNER');
    } catch (e) {
      setError("Could not save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Partner Sync
  const handleSyncPartner = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    
    try {
      // Use the mock partner if the code is the special mock code, otherwise check backend
      let result;
      
      // This allows the demo to still work with the 'JRD-77' hardcoded value if user desires,
      const foundUser = await backend.findUserByCode(partnerCode);
      
      if (foundUser) {
        result = await backend.linkPartners(currentUser.id, partnerCode);
        onUpdateUser(result.user);
        onComplete(result.user, result.partner);
      } else if (partnerCode === 'JRD-77') {
         // Fallback for Demo purposes if no real user found
         const mockPartner = getMockPartner('JRD-77');
         onComplete(currentUser, mockPartner);
      } else {
        setError("Partner code not found. Check the code and try again.");
      }

    } catch (e: any) {
      setError(e.message || "Failed to link partner.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (currentUser?.pairingCode) {
      navigator.clipboard.writeText(currentUser.pairingCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSignOutClick = async () => {
    if (onSignOut) {
      await onSignOut();
      setStep('AUTH');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden z-10">
        
        {/* Header / Sign Out */}
        {step !== 'AUTH' && onSignOut && (
          <button 
            onClick={handleSignOutClick}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        )}

        {/* Step Indicator */}
        {step !== 'AUTH' && (
          <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: step === 'PROFILE' ? '50%' : '100%' }}
            ></div>
          </div>
        )}

        <div className="mb-8 text-center pt-2">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Sweat<span className="text-emerald-400">Equity</span>
          </h1>
          <p className="text-slate-400 text-sm">
            {step === 'AUTH' && "Hold your partner accountable."}
            {step === 'PROFILE' && "Create your accountability profile"}
            {step === 'PARTNER' && "Sync with your workout partner"}
          </p>
        </div>

        {step === 'AUTH' && (
          <div className="space-y-4">
             <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center mb-6">
                <p className="text-sm text-slate-300 italic">
                  "It's like having a referee for your relationship's fitness goals."
                </p>
             </div>
             {error && <p className="text-rose-500 text-sm text-center bg-rose-950/30 p-2 rounded">{error}</p>}
             <button 
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
            <p className="text-xs text-center text-slate-500 mt-4">
              Connect securely with Firebase
            </p>
          </div>
        )}

        {step === 'PROFILE' && (
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
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/></>}
            </button>
          </form>
        )}

        {step === 'PARTNER' && currentUser && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Your Code Section */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center">
              <p className="text-slate-400 text-sm mb-3">Share this code with your partner</p>
              <button 
                onClick={copyCode}
                disabled={!currentUser.pairingCode}
                className="w-full bg-slate-900 border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors group"
              >
                <span className="text-2xl font-mono font-bold text-emerald-400 tracking-widest">
                  {currentUser.pairingCode || "LOADING..."}
                </span>
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
              {error && <p className="text-rose-500 text-xs text-center">{error}</p>}
              <button 
                onClick={handleSyncPartner}
                disabled={partnerCode.length < 3 || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <><Users size={20} /> Sync & Start Battle</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;