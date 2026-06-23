import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MobileDayDot from './MobileDayDot';

const DAYS         = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function SortableMobileCard({
  habit, isCurrentWeek, todayIndex,
  thisChecks, thisBlocks,
  getDayState, handleToggle, handleBlock, openEdit,
  count, theme, s, habitsLength, editPastWeeks,
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
    zIndex: isDragging ? 999 : undefined,
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
    borderRadius: 14,
    ...(isHighlighted ? { boxShadow: `0 0 0 1.5px ${theme.gold}, 0 0 16px 2px ${theme.gold}40` } : {}),
  };

  const tw      = count(thisChecks, thisBlocks, habit.id);
  const goalMet = tw >= habit.perweek;
  const net     = habit.perweek - tw;
  const canEdit = isCurrentWeek || editPastWeeks;

  return (
    <div ref={setNodeRef} style={style}>
      <View style={[
        s.mobileCard,
        !isHighlighted && habit.color && { borderLeftColor: habit.color },
        !isHighlighted && goalMet && { borderLeftColor: theme.gold },
      ]}>
        <View style={s.mobileCardHeader}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(habit)}>
            <Text style={s.mobileHabitName} numberOfLines={2}>{habit.name}</Text>
            {habit.notes ? <Text style={s.mobileNotePreview} numberOfLines={1}>{habit.notes}</Text> : null}
          </TouchableOpacity>
          <View style={s.mobileCardRight}>
            <TouchableOpacity onPress={() => handleHighlight(habit.id)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 16, color: isHighlighted ? theme.gold : theme.border, userSelect: 'none' }}>★</Text>
            </TouchableOpacity>
            <Text style={[s.mobileCount, (goalMet || isHighlighted) && { color: theme.gold }]}>
              {tw}<Text style={s.mobileCountGoal}>/{habit.perweek}</Text>
            </Text>
            {!isCurrentWeek && (
              <Text style={{ fontSize: 14, fontFamily: 'Raleway_600SemiBold', color: net <= 0 ? theme.success : theme.delete }}>
                {net > 0 ? '+' : ''}{net}
              </Text>
            )}
            {/* Drag handle — only on current week */}
            {isCurrentWeek && (
              <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: 4, touchAction: 'none' }}>
                <Text style={{ color: theme.textSub, fontSize: 18, userSelect: 'none' }}>⠿</Text>
              </div>
            )}
          </View>
        </View>
        <View style={s.mobileDayRow}>
          {DAYS.map((_, i) => (
            <MobileDayDot
              key={i}
              state={getDayState(habit.id, i)}
              isToday={i === todayIndex}
              isCurrentWeek={canEdit}
              onToggle={() => handleToggle(habit.id, i)}
              onBlock={() => handleBlock(habit.id, i)}
              dayInitial={DAY_INITIALS[i]}
              s={s}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </div>
  );
}