import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

const PRESETS = [
  { label: 'Last Week',    key: 'week' },
  { label: 'Last Month',   key: 'month' },
  { label: 'Last 6 Mo',   key: '6months' },
  { label: 'Last 12 Mo',  key: '12months' },
  { label: 'All Time',    key: 'all' },
  { label: 'Custom',      key: 'custom' },
];

export function resolveRange(rangeKey, customFrom, customTo) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let from;

  switch (rangeKey) {
    case 'week':
      from = new Date(today); from.setDate(from.getDate() - 7); break;
    case 'month':
      from = new Date(today); from.setMonth(from.getMonth() - 1); break;
    case '6months':
      from = new Date(today); from.setMonth(from.getMonth() - 6); break;
    case '12months':
      from = new Date(today); from.setMonth(from.getMonth() - 12); break;
    case 'all':
      from = new Date('2000-01-01'); break;
    case 'custom':
      from = customFrom ? new Date(customFrom + 'T00:00:00') : new Date('2000-01-01');
      return {
        from,
        to: customTo ? new Date(customTo + 'T23:59:59') : today,
      };
    default:
      from = new Date('2000-01-01');
  }

  return { from, to: today };
}

export default function RangeSelector({ rangeKey, onRangeChange, customFrom, customTo, onCustomFromChange, onCustomToChange, theme }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {PRESETS.map(p => {
          const active = rangeKey === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => onRangeChange(p.key)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 8, borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent + '1a' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 12, fontFamily: 'Raleway_600SemiBold',
                color: active ? theme.accent : theme.textSub,
              }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {rangeKey === 'custom' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: theme.textSub, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>From</Text>
          <TextInput
            value={customFrom}
            onChangeText={onCustomFromChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSub}
            style={{
              borderWidth: 1, borderColor: theme.border, borderRadius: 8,
              padding: 8, color: theme.text, fontSize: 12,
              fontFamily: 'Raleway_400Regular', backgroundColor: theme.bg,
              width: 120,
            }}
          />
          <Text style={{ color: theme.textSub, fontSize: 12, fontFamily: 'Raleway_400Regular' }}>To</Text>
          <TextInput
            value={customTo}
            onChangeText={onCustomToChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSub}
            style={{
              borderWidth: 1, borderColor: theme.border, borderRadius: 8,
              padding: 8, color: theme.text, fontSize: 12,
              fontFamily: 'Raleway_400Regular', backgroundColor: theme.bg,
              width: 120,
            }}
          />
        </View>
      )}
    </View>
  );
}