import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const BOUND_OPTIONS = [
  { value: '',              label: 'ללא שיוך' },
  { value: 'morning',       label: 'בוקר' },
  { value: 'short_morning', label: 'בוקר קצר' },
  { value: 'middle',        label: 'אמצע' },
  { value: 'evening',       label: 'ערב' },
  { value: 'samples',       label: 'דגימות' },
];

export function AdHocModal({ dayKey, dayName, onClose }) {
  const { addAdHocShift, toast } = useApp();
  const [label,     setLabel]     = useState('');
  const [time,      setTime]      = useState('');
  const [boundType, setBoundType] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    addAdHocShift(dayKey, { label: label.trim(), time: time.trim(), boundType: boundType || null });
    toast(`נוספה משמרת בלת״ם ליום ${dayName}`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1a2e4a]">משמרת בלת״ם — {dayName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              שם המשמרת <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="למשל: כיסוי אירוע"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#38bcd4] focus:ring-1 focus:ring-[#38bcd4]/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">שעות (אופציונלי)</label>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="למשל: 10:00–14:00"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#38bcd4] focus:ring-1 focus:ring-[#38bcd4]/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              שיוך לסוג משמרת
              <span className="text-gray-400 font-normal mr-1">(לבדיקת זמינות)</span>
            </label>
            <select
              value={boundType}
              onChange={(e) => setBoundType(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#38bcd4] bg-white"
            >
              {BOUND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 rounded-xl bg-[#1a2e4a] text-white text-sm hover:bg-[#2563a8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              הוסף משמרת
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
