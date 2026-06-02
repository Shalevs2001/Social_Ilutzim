import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../../context/AppContext';

/**
 * Employee card in the sidebar — draggable with dnd-kit.
 * Carries data: { type: 'employee', empId }
 * Double-click: toggles schedule-wide availability highlight for this employee.
 */
export function DraggableEmployeeCard({ emp, count }) {
  const { highlightEmpId, setHighlightEmpId } = useApp();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `emp-${emp.id}`,
    data: { type: 'employee', empId: emp.id },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const isJoker      = emp.joker ?? false;
  const minQ         = emp.minQuota ?? 0;
  const over         = !isJoker && count > emp.quota;
  const met          = !isJoker && !over && count >= emp.quota;
  const belowMin     = !isJoker && !over && !met && minQ > 0 && count < minQ;
  const isHighlighted = highlightEmpId === emp.id;

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setHighlightEmpId((prev) => (prev === emp.id ? null : emp.id));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={handleDoubleClick}
      className={`flex items-center justify-between p-2 rounded-lg border
        cursor-grab active:cursor-grabbing hover:border-[#38bcd4] hover:bg-[#e8f4f8]
        transition-colors select-none touch-none
        ${isJoker ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}
        ${isDragging ? 'opacity-30 scale-95' : ''}
        ${isHighlighted ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
      title="גרור לשיבוץ / לחץ פעמיים להדגשת זמינות"
    >
      <span className={`text-sm font-medium ${isJoker ? 'text-purple-800' : 'text-gray-800'}`}>
        {emp.name}
      </span>
      {isJoker ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
          ג׳וקר
        </span>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          {/* Actual count — coloured by status */}
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              over     ? 'bg-red-100    text-red-600'    :
              met      ? 'bg-green-100  text-green-700'  :
              belowMin ? 'bg-orange-100 text-orange-700' :
                         'bg-yellow-100 text-yellow-700'
            }`}
          >
            {count}
          </span>
          {/* Range — muted, clearly separate */}
          <span className="text-[10px] text-gray-400 font-medium leading-none" dir="ltr">
            {minQ > 0 ? `${minQ}–${emp.quota}` : `/${emp.quota}`}
          </span>
        </div>
      )}
    </div>
  );
}
