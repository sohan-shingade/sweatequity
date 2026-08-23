import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { backend, FoodLog } from '../services/backend';
import { todayStr } from '../lib/dates';
import { UtensilsCrossed, Plus, Camera, Loader2, X, Pencil, Trash2, Sparkles } from 'lucide-react';

// --- Food logging: photo/text -> macros (analyzed server-side via Claude) ---

const confidenceColor: { [key: string]: string } = {
  high: 'bg-emerald-500',
  medium: 'bg-yellow-500',
  low: 'bg-rose-500',
};

const Totals = ({ label, avatar, entries }: { label: string; avatar: string; entries: FoodLog[] }) => {
  const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
    entries.reduce((s, e) => s + (e[key] || 0), 0);
  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
      <div className="flex items-center gap-2">
        <img src={avatar} className="w-5 h-5 rounded-full object-cover" />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <div className="text-xs font-mono text-slate-300">
        <span className="text-white font-bold">{sum('calories')}</span> kcal
        <span className="text-slate-500 ml-2">{sum('protein')}P {sum('carbs')}C {sum('fat')}F</span>
      </div>
    </div>
  );
};

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: FoodLog | null;
}

const FoodModal: React.FC<FoodModalProps> = ({ isOpen, onClose, editingEntry }) => {
  // phase: 'input' (new entry) -> 'review' (analyzed or editing existing)
  const [entry, setEntry] = useState<FoodLog | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEntry(editingEntry);
      setDescription(editingEntry?.description || '');
      setPhoto(null);
      setError('');
      setMacros({
        calories: `${editingEntry?.calories ?? ''}`,
        protein: `${editingEntry?.protein ?? ''}`,
        carbs: `${editingEntry?.carbs ?? ''}`,
        fat: `${editingEntry?.fat ?? ''}`,
      });
    }
  }, [isOpen, editingEntry]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1000;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!photo && !description.trim()) return;
    setIsAnalyzing(true);
    setError('');
    try {
      const result = await backend.analyzeFood(photo, description, todayStr());
      setEntry(result);
      setMacros({
        calories: `${result.calories ?? ''}`,
        protein: `${result.protein ?? ''}`,
        carbs: `${result.carbs ?? ''}`,
        fat: `${result.fat ?? ''}`,
      });
    } catch (e: any) {
      setError(e.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!entry) return;
    setIsSaving(true);
    try {
      await backend.updateFoodLog(entry.id, {
        description,
        calories: Number(macros.calories) || 0,
        protein: Number(macros.protein) || 0,
        carbs: Number(macros.carbs) || 0,
        fat: Number(macros.fat) || 0,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UtensilsCrossed size={20} className="text-emerald-400" />
            {entry ? 'Review Meal' : 'Log a Meal'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>

        {!entry ? (
          // --- Input phase: photo + description -> analyze ---
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-40 bg-slate-800 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
            >
              {photo ? (
                <img src={photo} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-500">
                  <Camera size={28} className="mx-auto mb-2" />
                  <p className="text-xs">Snap or upload a photo (optional)</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe it — e.g. chicken burrito bowl with guac, no rice"
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm placeholder:text-slate-600 resize-none"
            />

            {error && <p className="text-rose-500 text-xs text-center">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!photo && !description.trim())}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="animate-spin" size={20} /> Analyzing macros…</>
              ) : (
                <><Sparkles size={20} /> Analyze & Log</>
              )}
            </button>
            {isAnalyzing && <p className="text-[11px] text-slate-500 text-center">Claude is estimating your macros — this can take up to a minute.</p>}
          </div>
        ) : (
          // --- Review phase: editable macros ---
          <div className="space-y-4">
            {entry.photoUrl && (
              <div className="h-36 rounded-xl overflow-hidden bg-slate-800">
                <img src={entry.photoUrl} className="w-full h-full object-cover" />
              </div>
            )}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
            <div className="grid grid-cols-4 gap-2">
              {([['calories', 'kcal'], ['protein', 'P (g)'], ['carbs', 'C (g)'], ['fat', 'F (g)']] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1 text-center">{label}</label>
                  <input
                    type="number"
                    value={macros[key]}
                    onChange={(e) => setMacros({ ...macros, [key]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded-lg outline-none focus:border-emerald-500 text-center font-mono text-sm"
                  />
                </div>
              ))}
            </div>
            {entry.notes && (
              <p className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                {entry.confidence && (
                  <span className="uppercase font-bold text-[10px] mr-2 text-slate-400">{entry.confidence} confidence</span>
                )}
                {entry.notes}
              </p>
            )}
            {error && <p className="text-rose-500 text-xs text-center">{error}</p>}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold p-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FoodSection = ({ currentUser, partner }: { currentUser: User; partner: User }) => {
  const [entries, setEntries] = useState<FoodLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodLog | null>(null);
  const today = todayStr();

  useEffect(() => backend.subscribeToFood(today, setEntries), [today]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this meal?')) await backend.deleteFoodLog(id);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <UtensilsCrossed size={18} className="text-emerald-400" /> Fuel Log
          <span className="text-xs text-slate-500 font-normal">today</span>
        </h3>
        <button
          onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}
          className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-all"
        >
          <Plus size={16} /> Log Meal
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <Totals label="You" avatar={currentUser.avatar} entries={entries.filter(e => e.userId === currentUser.id)} />
        <Totals label={partner.name} avatar={partner.avatar} entries={entries.filter(e => e.userId === partner.id)} />
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const isMe = entry.userId === currentUser.id;
          return (
            <div key={entry.id} className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-3 border border-slate-800">
              {entry.photoUrl ? (
                <img src={entry.photoUrl} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-600">
                  <UtensilsCrossed size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">{isMe ? 'You' : partner.name}</span>
                  {entry.confidence && <span className={`w-1.5 h-1.5 rounded-full ${confidenceColor[entry.confidence] || 'bg-slate-600'}`} title={`${entry.confidence} confidence`}></span>}
                </div>
                <p className="text-sm text-slate-400 truncate">{entry.description || 'Photo meal'}</p>
                <p className="text-xs font-mono text-slate-500">
                  {entry.calories === null
                    ? 'analysis failed — tap to edit'
                    : <><span className="text-slate-300">{entry.calories}</span> kcal · {entry.protein}P {entry.carbs}C {entry.fat}F</>}
                </p>
              </div>
              {isMe && (
                <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
        {entries.length === 0 && <div className="text-center text-slate-500 text-sm py-4">Nothing logged today.</div>}
      </div>

      <FoodModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingEntry={editingEntry} />
    </section>
  );
};

export default FoodSection;
