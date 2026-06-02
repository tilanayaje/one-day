import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function BarChart({ data, goal, theme, isMobile, onWeekPress }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(goal, ...data.map(d => d.count));
  const chartHeight = isMobile ? 100 : 140;
  const barWidth = isMobile
    ? Math.min(32, Math.floor(300 / data.length) - 4)
    : Math.min(48, Math.floor(800 / data.length) - 6);

  return (
    <View>
      <Text style={{
        color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_600SemiBold',
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
      }}>
        Weekly Completions
      </Text>
      <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 28, gap: isMobile ? 3 : 4 }}>
          {data.map((d, i) => {
            const barHeight = maxVal > 0 ? Math.max(2, (d.count / maxVal) * chartHeight) : 2;
            const goalLineY = (goal / maxVal) * chartHeight;
            const hitGoal = d.count >= goal;
            return (
              <View key={i} style={{ width: barWidth, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight + 28 }}>
                <View style={{ width: barWidth, height: chartHeight, justifyContent: 'flex-end', position: 'relative' }}>
                  <View style={{
                    position: 'absolute', bottom: goalLineY, left: 0, right: 0,
                    height: 1, backgroundColor: '#f9e2af', opacity: 0.5,
                  }} />
                  <View style={{
                    width: '85%', alignSelf: 'center', height: barHeight,
                    backgroundColor: hitGoal ? '#f9e2af' : theme.accent,
                    borderRadius: 3, opacity: 0.85,
                  }} />
                </View>
                <TouchableOpacity onPress={() => onWeekPress?.(d.fullWeekKey)}>
                  <Text style={{ color: theme.accent, fontSize: isMobile ? 8 : 9, marginTop: 4, fontFamily: 'Raleway_400Regular', textAlign: 'center' }}>
                    {d.week}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 14, height: 1, backgroundColor: '#f9e2af' }} />
          <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>Goal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: '#f9e2af', borderRadius: 2 }} />
          <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>Met</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: theme.accent, borderRadius: 2 }} />
          <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>In progress</Text>
        </View>
      </View>
    </View>
  );
}