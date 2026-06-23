import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function heatColor(intensity, theme, isDark) {
  if (intensity === 0) return theme.border;
  if (isDark) {
    if (intensity <= 0.25) return '#14253f';
    if (intensity <= 0.50) return '#1e3a5f';
    if (intensity <= 0.75) return '#3a6098';
    return '#89b4fa';
  } else {
    if (intensity <= 0.25) return '#d6e4fb';
    if (intensity <= 0.50) return '#9ec0f5';
    if (intensity <= 0.75) return '#5a92ec';
    return '#1a73e8';
  }
}

export default function Heatmap({ weeks, monthLabels, maxCount, cellSize, gap, theme, isDark }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={{ height: 28, position: 'relative', marginBottom: 4 }}>
            {monthLabels.map(({ weekIndex, label, year }) => (
              <View key={label + weekIndex} style={{
                position: 'absolute',
                left: weekIndex * (cellSize + gap) + 22,
                top: 0, height: 28, justifyContent: 'flex-end',
              }}>
                {year && (
                  <Text style={{ fontSize: 11, fontFamily: 'Raleway_700Bold', color: theme.textSub, letterSpacing: 0.5 }}>
                    {year}
                  </Text>
                )}
                <Text style={{ fontSize: 10, fontFamily: 'Raleway_400Regular', color: theme.textSub }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: 'row', gap }}>
            {/* Day labels */}
            <View style={{ gap, marginRight: 4, justifyContent: 'space-around' }}>
              {DAYS_SHORT.map((d, i) => (
                <View key={i} style={{ height: cellSize, justifyContent: 'center' }}>
                  {i % 2 === 1 && (
                    <Text style={{ color: theme.textSub, fontSize: 9, fontFamily: 'Raleway_400Regular' }}>{d}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <View key={wi} style={{ gap }}>
                {week.map((day, di) => (
                  <View
                    key={di}
                    onMouseEnter={(e) => {
                      if (!day.isFuture) {
                        const tooltipWidth = 140;
                        const rawX = e.nativeEvent.clientX;
                        const rawY = e.nativeEvent.clientY;
                        const x = Math.min(Math.max(rawX + 12, 8), (window.innerWidth - tooltipWidth - 8));
                        const y = rawY - 44 < 8 ? rawY + 16 : rawY - 44;
                        setTooltip({ iso: day.iso, count: day.count, x, y });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: cellSize, height: cellSize, borderRadius: 2,
                      backgroundColor: day.isFuture ? 'transparent' : heatColor(day.count / maxCount, theme, isDark),
                      borderWidth: day.isToday ? 1.5 : 0,
                      borderColor: theme.accent,
                      cursor: day.isFuture ? 'default' : 'pointer',
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>Less</Text>
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <View key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: heatColor(v, theme, isDark) }} />
            ))}
            <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>More</Text>
          </View>
        </View>
      </ScrollView>

      {/* Hover tooltip */}
      {tooltip && (
        <View style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y,
          backgroundColor: theme.surface, borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 8,
          borderWidth: 1, borderColor: theme.border,
          zIndex: 999, pointerEvents: 'none',
        }}>
          <Text style={{ color: theme.text, fontSize: 13, fontFamily: 'Raleway_600SemiBold' }}>
            {tooltip.count} check{tooltip.count !== 1 ? 's' : ''}
          </Text>
          <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 2 }}>
            {tooltip.iso}
          </Text>
        </View>
      )}
    </View>
  );
}