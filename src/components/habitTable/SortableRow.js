import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DesktopDayCell from './DesktopDayCell';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SortableRow({
  habit, index, isCurrentWeek, todayIndex,
  thisChecks, thisBlocks, prevChecks,
  getDayState, handleToggle, handleBlock, openEdit,
  count, theme, s, editPastWeeks,
  highlighted, handleHighlight,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(habit.id),
  });

  const isHighlighted = highlighted.has(habit.id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : isHighlighted ? 1 : undefined,
    ...(isHighlighted ? {
      outline: `1.5px solid ${theme.gold}`,
      outlineOffset: '-1px',
      position: 'relative',
    } : {}),
  };

  const tw      = count(thisChecks, thisBlocks, habit.id);
  const pw      = count(prevChecks, {}, habit.id);
  const goalMet = tw >= habit.perweek;
  const net     = habit.perweek - tw;
  const canEdit = isCurrentWeek || editPastWeeks;

  return (
    <div ref={setNodeRef} style={style}>
      <View style={[
        s.row,
        !isHighlighted && habit.color && { borderLeftColor: habit.color },
        !isHighlighted && goalMet && s.goalMet,
        isHighlighted && { borderLeftColor: theme.gold },
        isHighlighted && s.highlightedRow,
      ]}>
        {/* Drag handle — only on current week */}
        {isCurrentWeek ? (
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40 }}>
            <Text style={{ color: theme.textSub, fontSize: 16, userSelect: 'none' }}>⠿</Text>
          </div>
        ) : <View style={s.orderBtns} />}

        <View style={{ width: 240, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' }} onPress={() => openEdit(habit)}>
            <Text style={s.habitCell} numberOfLines={2}>{habit.name}</Text>
            {habit.notes ? <Text style={s.notePreview} numberOfLines={1}>{habit.notes}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleHighlight(habit.id)} style={{ paddingRight: 8, paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: isHighlighted ? theme.gold : theme.border, userSelect: 'none' }}>★</Text>
          </TouchableOpacity>
        </View>

        {DAYS.map((_, i) => (
          <DesktopDayCell
            key={i}
            habitId={habit.id}
            dayIndex={i}
            state={getDayState(habit.id, i)}
            isToday={i === todayIndex}
            isCurrentWeek={isCurrentWeek}
            editPastWeeks={editPastWeeks}
            isHighlighted={isHighlighted}
            onToggle={() => handleToggle(habit.id, i)}
            onBlock={() => handleBlock(habit.id, i)}
            s={s}
          />
        ))}

        <Text style={s.statCell}>{tw}</Text>
        <Text style={s.statCell}>{pw}</Text>
        <Text style={s.statCell}>{habit.perweek}</Text>
        {!isCurrentWeek && (
          <Text style={[s.statCell, { color: net <= 0 ? theme.success : theme.delete, fontFamily: 'Raleway_600SemiBold' }]}>
            {net}
          </Text>
        )}
      </View>
    </div>
  );
}