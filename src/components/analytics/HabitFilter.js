import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';

export const CHART_COLORS = [
  '#89b4fa', '#f38ba8', '#a6e3a1', '#f9e2af', '#cba6f7',
  '#fab387', '#74c7ec', '#94e2d5', '#eba0ac', '#b4befe',
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24',
];

export default function HabitFilter({ habits, activeIds, onToggle, useHabitColors, onToggleColorMode, cumulative, onToggleCumulative, theme, isMobile }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {/* Color mode toggle */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <Text style={{
          fontSize: 10, fontFamily: 'Raleway_600SemiBold',
          color: theme.textSub, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          {useHabitColors ? 'Using Habit Colors' : 'Using Chart Colors'}
        </Text>
        <Switch
          value={useHabitColors}
          onValueChange={onToggleColorMode}
          trackColor={{ false: theme.border, true: theme.accent }}
          thumbColor={theme.surface}
        />
      </View>

      {/* Cumulative mode toggle */}
        <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
        }}>
        <Text style={{
            fontSize: 10, fontFamily: 'Raleway_600SemiBold',
            color: theme.textSub, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
            {cumulative ? 'Cumulative' : 'Frequency'}
        </Text>
        <Switch
            value={cumulative}
            onValueChange={onToggleCumulative}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor={theme.surface}
        />
        </View>

      {/* Habit toggles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {habits.map((habit, index) => {
          const active = activeIds.has(habit.id);
          const color  = useHabitColors
            ? (habit.color ?? CHART_COLORS[index % CHART_COLORS.length])
            : CHART_COLORS[index % CHART_COLORS.length];
          return (
            <TouchableOpacity
              key={habit.id}
              onPress={() => onToggle(habit.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 8, borderWidth: 1,
                borderColor: active ? color : theme.border,
                backgroundColor: active ? color + '1a' : 'transparent',
                opacity: active ? 1 : 0.4,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
              <Text style={{
                fontSize: 11, fontFamily: 'Raleway_600SemiBold',
                color: active ? color : theme.textSub,
                maxWidth: isMobile ? 100 : 160,
              }} numberOfLines={1}>
                {habit.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}