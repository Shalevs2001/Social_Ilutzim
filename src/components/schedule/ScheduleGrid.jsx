import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';
import { exportScheduleCanvas } from '../../utils/exportSchedule';
import { DAYS, DAY_KEYS, WEEKEND_DAYS } from '../../constants';
import { DayColumn } from './DayColumn';
import { AdHocModal } from './AdHocModal';
import { ArchivedSchedulesModal } from './ArchivedSchedulesModal';

/**
 * Legend chip for shift-slot visual states.
 */
function LegendChip({ colorClass, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${colorClass}`}>
      {label}
    </span>
  );
}

/**
 * Toolbar above the grid: week title, legend, auto-fill button.
 */
function GridToolbar({ compact }) {
  const { autoFill, clearSchedule, showLowPriority, setShowLowPriority, showMissingSlots, setShowMissingSlots, scheduleVisible, setScheduleVisible } = useApp();
  const [running, setRunning] = useState(false);

  const handleAutoFill = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 30));
    autoFill();
    setRunning(false);
  };

  return (
    <div className={`flex items-center px-4 py-2.5 bg-white border-b border-gray-200 sticky top-0 z-10 ${compact ? 'justify-between' : ''}`}>
      {/* Right side */}
      <div className={`flex gap-2 ${compact ? '' : 'flex-1 justify-start'}`}>
        <button
          onClick={() => setShowLowPriority((v) => !v)}
          className={`rounded-xl border font-medium transition-colors ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
          } ${
            showLowPriority
              ? 'bg-[#1a2e4a] border-[#1a2e4a] text-white hover:bg-[#2563a8] hover:border-[#2563a8]'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
          }`}
          title="הצג / הסתר שיבוצי עדיפות נמוכה"
        >
          הצג עדיפות נמוכה
        </button>
        <button
          onClick={() => setShowMissingSlots((v) => !v)}
          className={`rounded-xl border font-medium transition-colors ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
          } ${
            showMissingSlots
              ? 'bg-[#1a2e4a] border-[#1a2e4a] text-white hover:bg-[#2563a8] hover:border-[#2563a8]'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
          }`}
          title="הדגש משמרות ריקות"
        >
          הצג משמרות חסרות
        </button>
      </div>

      {/* Center: legend — full view only */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] px-4">
          <span className="text-gray-400 ml-1">מקרא:</span>
          <LegendChip colorClass="bg-amber-50 border-amber-200 text-stone-700"     label="בוקר / אמצע / ערב" />
          <LegendChip colorClass="bg-yellow-100 border-yellow-300 text-yellow-800" label="בוקר קצר" />
          <LegendChip colorClass="bg-orange-100 border-orange-300 text-orange-900" label="דגימות" />
          <LegendChip colorClass="bg-sky-100 border-sky-300 text-sky-800"                   label="רשת ב׳" />
          <LegendChip colorClass="bg-purple-100 border-purple-300 text-purple-800"         label="בלת״ם" />
          <LegendChip colorClass="bg-gray-200 border-gray-400 border-dashed text-gray-600" label="עדיפות נמוכה" />
          <LegendChip colorClass="bg-red-200 border-red-400 text-red-800"                  label="חסום" />
        </div>
      )}

      {/* Auto-fill + clear + visibility buttons */}
      <div className={`flex items-center gap-2 ${!compact ? 'flex-1 flex justify-end' : ''}`}>
        <button
          onClick={() => setScheduleVisible((v) => !v)}
          title={scheduleVisible ? 'הסידור גלוי לעובדים — לחץ להסתיר' : 'הסידור מוסתר — לחץ לפרסם'}
          className={`rounded-xl border font-medium transition-colors ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
          } ${
            scheduleVisible
              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
              : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {scheduleVisible ? '👁 גלוי' : '🚧 מוסתר'}
        </button>
        <button
          onClick={clearSchedule}
          className={`rounded-xl border border-red-200 text-red-400 font-medium transition-colors hover:bg-red-50 ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
          }`}
        >
          ניקוי סידור
        </button>
        <button
          onClick={handleAutoFill}
          disabled={running}
          className={`rounded-xl bg-[#1a2e4a] text-white font-medium hover:bg-[#2563a8] disabled:opacity-50 disabled:cursor-wait transition-colors shadow-sm ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-1.5 text-sm'
          }`}
        >
          {running ? '⏳ מחשב...' : '⚡ שיבוץ אוטומטי'}
        </button>
      </div>
    </div>
  );
}

/**
 * Main weekly schedule grid — 7 day columns.
 */
export function ScheduleGrid({ compact = false }) {
  const [adHocTarget,   setAdHocTarget]   = useState(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showArchive,   setShowArchive]   = useState(false);

  const editorRef        = useRef(null);
  const footerRef        = useRef(null);   // wraps both collapsed + expanded panel

  const { schedule, employees, shiftTimes, scheduleNotes, setScheduleNotes,
          weekStart, setWeekStart, weekTitle, openNewSchedule, toast } = useApp();

  // ── Close helper (saves content) ──────────────────────────────────────────
  const closeNotes = useCallback(() => {
    if (editorRef.current) setScheduleNotes(editorRef.current.innerHTML);
    setNotesExpanded(false);
  }, [setScheduleNotes]);

  // Populate editor + focus when it opens
  useEffect(() => {
    if (!notesExpanded || !editorRef.current) return;
    editorRef.current.innerHTML = scheduleNotes || '';
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesExpanded]);

  // Click outside footer area → close
  useEffect(() => {
    if (!notesExpanded) return;
    const handler = (e) => {
      if (footerRef.current && !footerRef.current.contains(e.target)) {
        closeNotes();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notesExpanded, closeNotes]);

  // Escape → close
  useEffect(() => {
    if (!notesExpanded) return;
    const handler = (e) => { if (e.key === 'Escape') closeNotes(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [notesExpanded, closeNotes]);

  // ── Toolbar handlers (onMouseDown so editor keeps focus) ──────────────────
  const handleBold = (e) => {
    e.preventDefault();
    document.execCommand('bold');
    editorRef.current?.focus();
  };

  const handleHighlight = (e) => {
    e.preventDefault();
    document.execCommand('hiliteColor', false, '#fef08a');
    editorRef.current?.focus();
  };

  const handleClearFormat = (e) => {
    e.preventDefault();
    document.execCommand('removeFormat');
    editorRef.current?.focus();
  };

  // ── Show / copy shareable URL ─────────────────────────────────────────────
  const viewUrl = `${window.location.origin}/view`;

  const handleCopyUrl = () => {
    copyToClipboard(viewUrl);
    toast('הקישור הועתק ✓', 'success');
  };

  return (
    <div className="flex flex-col h-full">

      {/* Date / title bar */}
      {!compact && (
        <div className="bg-[#1a2e4a] text-white px-4 py-2 flex items-center gap-3 shrink-0" dir="rtl">
          <span className="font-bold text-sm shrink-0">סידור</span>
          <span className="font-semibold text-sm shrink-0">{weekTitle || 'בחר תאריך תחילת שבוע'}</span>
          <label className="flex items-center gap-1 text-xs text-white/70 shrink-0" title="תאריך יום ראשון של השבוע">
            <span>שבוע מ־</span>
            <input
              type="date"
              value={weekStart || ''}
              onChange={(e) => setWeekStart(e.target.value)}
              className="bg-white/10 text-white text-xs rounded px-1.5 py-0.5 border border-white/20
                focus:border-white/60 focus:outline-none [color-scheme:dark]"
            />
          </label>

          <div className="mr-auto flex items-center gap-2">
            <button
              onClick={() => setShowArchive(true)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
              title="צפייה בשיבוצים שנשמרו"
            >
              📁 שיבוצים קודמים
            </button>
            <button
              onClick={openNewSchedule}
              className="px-3 py-1.5 rounded-lg bg-[#38bcd4] hover:bg-[#2da6bd] text-[#0d1b2e] font-bold text-xs transition-colors"
              title="שמור את השיבוץ הנוכחי ופתח שיבוץ חדש לשבוע הבא"
            >
              ＋ פתח שיבוץ חדש
            </button>
          </div>
        </div>
      )}

      <GridToolbar compact={compact} />

      {/* URL bar — always visible */}
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 shrink-0" dir="ltr">
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline truncate"
          >
            {viewUrl}
          </a>
          <button
            onClick={handleCopyUrl}
            className="shrink-0 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors font-medium"
          >
            העתק
          </button>
        </div>
      )}

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto p-2">
        <div className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-2'}`} style={{ minWidth: compact ? '620px' : '900px' }}>
          {DAY_KEYS.map((dayKey, i) => (
            <DayColumn
              key={dayKey}
              dayKey={dayKey}
              dayName={DAYS[i]}
              compact={compact}
              isWeekend={WEEKEND_DAYS.includes(dayKey)}
              onAddAdHoc={() => setAdHocTarget(dayKey)}
            />
          ))}
        </div>
      </div>

      {/* Footer notes */}
      {!compact && (
        <div ref={footerRef} className="shrink-0 border-t border-gray-200 bg-white relative" dir="rtl">

          {/* ── Rich-text editor panel — floats above footer ── */}
          {notesExpanded && (
            <>
              {/* Placeholder CSS for empty contentEditable */}
              <style>{`
                .ks-notes-editor:empty::before {
                  content: attr(data-placeholder);
                  color: #d1d5db;
                  pointer-events: none;
                  display: block;
                }
              `}</style>

              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 border-b-0 rounded-t-2xl shadow-[0_-6px_28px_rgba(0,0,0,0.11)] z-30">

                {/* Toolbar — double-click here also closes */}
                <div
                  className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 border-b border-gray-100 select-none"
                  onDoubleClick={closeNotes}
                >
                  <span className="text-[10px] font-semibold text-gray-400 ml-1">עיצוב:</span>

                  {/* Bold */}
                  <button
                    onMouseDown={handleBold}
                    className="w-7 h-7 flex items-center justify-center font-bold text-sm rounded border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                    title="מודגש"
                  >B</button>

                  {/* Yellow highlight */}
                  <button
                    onMouseDown={handleHighlight}
                    className="w-7 h-7 flex items-center justify-center rounded border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    title="מרקר צהוב"
                  >
                    <span
                      className="text-sm font-bold leading-none"
                      style={{ background: '#fef08a', padding: '1px 3px', borderRadius: 2 }}
                    >א</span>
                  </button>

                  {/* Clear formatting */}
                  <button
                    onMouseDown={handleClearFormat}
                    className="w-7 h-7 flex items-center justify-center text-xs rounded border border-gray-200 hover:bg-gray-100 text-gray-400 transition-colors"
                    title="הסר עיצוב מהסימון"
                  >✕</button>

                  {/* Close */}
                  <button
                    onClick={closeNotes}
                    className="mr-auto px-3 py-1 text-xs rounded-lg bg-[#1a2e4a] text-white hover:bg-[#2563a8] transition-colors"
                  >סגור ✓</button>
                </div>

                {/* Editable content area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => editorRef.current && setScheduleNotes(editorRef.current.innerHTML)}
                  className="ks-notes-editor min-h-[100px] max-h-[220px] overflow-y-auto px-3 py-2.5 text-sm text-gray-700 focus:outline-none leading-relaxed"
                  style={{ direction: 'rtl', textAlign: 'right' }}
                  data-placeholder="הערות לסידור..."
                />
              </div>
            </>
          )}

          {/* ── Collapsed preview — hidden while editor is open ── */}
          {!notesExpanded && <div
            className="px-4 py-2 cursor-pointer"
            onDoubleClick={() => setNotesExpanded(true)}
          >
            <div className="text-[10px] font-semibold text-gray-400 mb-1 select-none">
              הערות
              <span className="font-normal text-gray-300 mr-1">(לחץ פעמיים לעריכה)</span>
            </div>
            {scheduleNotes ? (
              <div
                className="text-sm text-gray-700 leading-snug line-clamp-2 pointer-events-none select-none"
                dangerouslySetInnerHTML={{ __html: scheduleNotes }}
              />
            ) : (
              <div className="text-sm text-gray-300 leading-snug select-none">הערות לסידור...</div>
            )}
          </div>}
        </div>
      )}

      {/* Ad-hoc modal */}
      {adHocTarget && (
        <AdHocModal
          dayKey={adHocTarget}
          dayName={DAYS[DAY_KEYS.indexOf(adHocTarget)]}
          onClose={() => setAdHocTarget(null)}
        />
      )}

      {/* Archived schedules modal */}
      {showArchive && <ArchivedSchedulesModal onClose={() => setShowArchive(false)} />}
    </div>
  );
}
