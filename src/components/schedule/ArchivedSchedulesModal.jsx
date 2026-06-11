import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { exportScheduleSquareCanvas } from '../../utils/exportScheduleSquare';

const SQUARE_SIZE = 2160;

/**
 * Read-only rendering of a single archived schedule — visually identical to the
 * /view page: the same square Canvas image (shift column + hours, 7 day columns,
 * employee names, deviation/flag tags).
 */
function ArchivedScheduleView({ archive }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!archive) return;
    const canvas = exportScheduleSquareCanvas(archive, SQUARE_SIZE);
    setSrc(canvas.toDataURL('image/png'));
  }, [archive]);

  if (!src) return null;

  return (
    <div className="max-w-[520px] mx-auto">
      <img src={src} alt="סידור משמרות" className="w-full rounded-xl shadow-md" />
    </div>
  );
}

/**
 * Modal listing previously-saved schedules ("שיבוצים קודמים"),
 * with a read-only viewer per item.
 */
export function ArchivedSchedulesModal({ onClose }) {
  const { archivedSchedules, deleteArchivedSchedule } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const selected = archivedSchedules.find((a) => a.id === selectedId) ?? null;

  const formatSavedAt = (ts) =>
    ts ? new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a2e4a] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base">📁 שיבוצים קודמים</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg">✕</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* List */}
          <div className="w-56 shrink-0 border-l border-gray-200 overflow-y-auto bg-gray-50">
            {archivedSchedules.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">אין שיבוצים שמורים</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {archivedSchedules.map((a) => (
                  <li key={a.id}>
                    <div
                      className={`group flex items-center gap-1 px-3 py-2.5 cursor-pointer transition-colors ${
                        a.id === selectedId ? 'bg-white' : 'hover:bg-white/70'
                      }`}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1a2e4a] truncate">
                          {a.title || 'שיבוץ ללא תאריך'}
                        </div>
                        <div className="text-[11px] text-gray-400">נשמר {formatSavedAt(a.savedAt)}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteArchivedSchedule(a.id); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-500 text-xs shrink-0 transition-opacity"
                        title="מחק"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Viewer */}
          <div className="flex-1 overflow-auto p-4">
            {selected ? (
              <>
                <div className="mb-3">
                  <div className="text-lg font-bold text-[#1a2e4a]">{selected.title || 'שיבוץ'}</div>
                  {selected.scheduleNotes && (
                    <div
                      className="text-sm text-gray-600 mt-1 leading-snug"
                      dangerouslySetInnerHTML={{ __html: selected.scheduleNotes }}
                    />
                  )}
                </div>
                <ArchivedScheduleView archive={selected} />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                בחר שיבוץ מהרשימה כדי לצפות בו
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
