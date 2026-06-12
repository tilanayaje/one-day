import React, { useMemo } from 'react';
import { View } from 'react-native';
import { RadarChart as RChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitRadarChart({ habit, allCompletions, allBlocked, theme, isMobile }) {
  const data = useMemo(() => {
    const checks = Array(7).fill(0);
    const opps = Array(7).fill(0);
    const now = new Date();

    for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
      const weekStart = new Date(wk + 'T00:00:00');
      const days = habitsInWeek[habit.id] ?? Array(7).fill(false);
      const blocked = allBlocked[wk]?.[habit.id] ?? Array(7).fill(false);
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        if (date > now) continue;
        if (!blocked[d]) opps[d]++;
        if (days[d]) checks[d]++;
      }
    }

    return DAY_SHORT.map((day, i) => ({
      day,
      value: opps[i] > 0 ? Math.round((checks[i] / opps[i]) * 100) : 0,
    }));
  }, [habit.id, allCompletions, allBlocked]);

  return (
    <View style={{ height: isMobile ? 220 : 280, marginBottom: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RChart data={data}>
          <PolarGrid stroke={theme.border} />
          <PolarAngleAxis
            dataKey="day"
            tick={{ fill: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}
          />
          <Radar
            dataKey="value"
            fill="#f9e2af"
            fillOpacity={0.2}
            stroke="#f9e2af"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RChart>
      </ResponsiveContainer>
    </View>
  );
}
