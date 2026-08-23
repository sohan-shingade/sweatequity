import React from 'react';
import { Swords, UtensilsCrossed, Plus, BarChart3, UserRound } from 'lucide-react';

export type Tab = 'home' | 'fuel' | 'progress' | 'profile';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onLog: () => void;
}

const NavButton = ({
  label, icon: Icon, isActive, onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
      isActive ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300'
    }`}
  >
    <Icon size={22} />
    <span className="text-[10px] font-semibold">{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange, onLog }) => (
  <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
    <div className="max-w-md mx-auto grid grid-cols-5 items-center">
      <NavButton label="Home" icon={Swords} isActive={active === 'home'} onClick={() => onChange('home')} />
      <NavButton label="Fuel" icon={UtensilsCrossed} isActive={active === 'fuel'} onClick={() => onChange('fuel')} />
      <div className="flex justify-center">
        <button
          onClick={onLog}
          aria-label={active === 'fuel' ? 'Log meal' : 'Log workout'}
          className="-mt-6 bg-emerald-500 active:bg-emerald-400 text-slate-950 p-4 rounded-full shadow-lg shadow-emerald-500/40 transition-transform active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>
      <NavButton label="Progress" icon={BarChart3} isActive={active === 'progress'} onClick={() => onChange('progress')} />
      <NavButton label="Profile" icon={UserRound} isActive={active === 'profile'} onClick={() => onChange('profile')} />
    </div>
  </nav>
);

export default BottomNav;
