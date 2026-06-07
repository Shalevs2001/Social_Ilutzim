import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { exportScheduleSquareCanvas } from '../../utils/exportScheduleSquare';

const SQUARE_SIZE = 2160;

// ── Square image (right-click / long-press to save) ───────────────────────────

function SquareExport({ data }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const canvas = exportScheduleSquareCanvas(data, SQUARE_SIZE);
    setSrc(canvas.toDataURL('image/png'));
  }, [data]);

  if (!src) return null;

  return (
    <div className="max-w-[460px] mx-auto">
      <img
        src={src}
        alt="סידור משמרות"
        className="w-full rounded-xl shadow-md"
      />
      <div className="text-center text-xs text-gray-400 mt-1.5">
        תמונה ריבועית {SQUARE_SIZE}×{SQUARE_SIZE} — לחיצה ימנית / לחיצה ארוכה על התמונה כדי לשמור
      </div>
    </div>
  );
}

// ── Main view page ───────────────────────────────────────────────────────────

export function ScheduleViewPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'sharedSchedule'), (snap) => {
      setData(snap.exists() ? snap.val() : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-gray-400 text-sm">⏳ טוען סידור...</div>
      </div>
    );
  }

  if (!data || !data.visible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center select-none">
          <div className="text-7xl mb-4">🚧</div>
          <div className="text-2xl font-bold text-gray-700 mb-1">הסידור בבנייה</div>
          <div className="text-gray-400 text-sm">חזרו מאוחר יותר</div>
        </div>
      </div>
    );
  }

  const { scheduleDate, scheduleNotes, savedAt } = data;

  const savedDate = savedAt
    ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="bg-[#1a2e4a] text-white px-4 py-5 shrink-0 text-center">
        <div className="text-2xl font-bold tracking-tight">סידור משמרות</div>
        {scheduleDate && (
          <div className="text-white/75 text-base mt-1 font-medium">{scheduleDate}</div>
        )}
        {savedDate && (
          <div className="text-white/35 text-xs mt-1">עודכן {savedDate}</div>
        )}
      </div>

      {/* Notes — prominently above the image */}
      {scheduleNotes && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-3 shrink-0">
          <div className="max-w-[760px] mx-auto">
            <div className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1.5">📌 הערות</div>
            <div
              className="text-base text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: scheduleNotes }}
            />
          </div>
        </div>
      )}

      {/* Square image for WhatsApp group picture */}
      <div className="flex-1 p-4">
        <SquareExport data={data} />
      </div>

    </div>
  );
}
