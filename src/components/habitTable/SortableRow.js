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
  count, theme, s,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(habit.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const tw      = count(thisChecks, thisBlocks, habit.id);
  const pw      = count(prevChecks, {}, habit.id);
  const goalMet = tw >= habit.perweek;
  const net     = habit.perweek - tw;

  return (
    <div ref={setNodeRef} style={style}>
      <View style={[s.row, habit.color && { borderLeftColor: habit.color }, goalMet && s.goalMet]}>
        {/* Drag handle */}
        {isCurrentWeek ? (
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40 }}>
            <Text style={{ color: theme.textSub, fontSize: 16, userSelect: 'none' }}>⠿</Text>
          </div>
        ) : <View style={s.orderBtns} />}

        <TouchableOpacity style={s.habitCellBtn} onPress={() => openEdit(habit)}>
          <Text style={s.habitCell} numberOfLines={2}>{habit.name}</Text>
          {habit.notes ? <Text style={s.notePreview} numberOfLines={1}>{habit.notes}</Text> : null}
        </TouchableOpacity>

        {DAYS.map((_, i) => (
          <DesktopDayCell
            key={i}
            habitId={habit.id}
            dayIndex={i}
            state={getDayState(habit.id, i)}
            isToday={i === todayIndex}
            isCurrentWeek={isCurrentWeek}
            onToggle={() => handleToggle(habit.id, i)}
            onBlock={() => handleBlock(habit.id, i)}
            s={s}
          />
        ))}

        <Text style={s.statCell}>{tw}</Text>
        <Text style={s.statCell}>{pw}</Text>
        <Text style={s.statCell}>{habit.perweek}</Text>
        {!isCurrentWeek && (
          <Text style={[s.statCell, { color: net <= 0 ? '#a6e3a1' : theme.delete, fontFamily: 'Raleway_600SemiBold' }]}>
            {net}
          </Text>
        )}
      </View>
    </div>
  );
}