import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function formatWeekRange(weekKey) {
  const start = new Date(weekKey + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export default function WeekNav({ currentWeekKey, weekOffset, onPrev, onNext, onToday, onHelp, theme, isMobile, s }) {
  return (
    <View style={[s.weekNav, isMobile && { marginBottom: 12 }]}>
      <TouchableOpacity onPress={onPrev} style={s.weekArrow}>
        <Text style={s.weekArrowText}>←</Text>
      </TouchableOpacity>
      <View style={s.weekCenter}>
        <Text style={s.weekRange}>{formatWeekRange(currentWeekKey)}</Text>
        {weekOffset !== 0 && (
          <TouchableOpacity onPress={onToday}>
            <Text style={s.weekTodayBtn}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={onNext}
        disabled={weekOffset === 0}
        style={s.weekArrow}
      >
        <Text style={[s.weekArrowText, weekOffset === 0 && { color: theme.border }]}>→</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onHelp} style={{ paddingHorizontal: 8 }}>
        <Text style={{ color: theme.textSub, fontSize: 16, fontFamily: 'Raleway_600SemiBold' }}>?</Text>
      </TouchableOpacity>
    </View>
  );
}