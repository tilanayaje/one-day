import React from 'react';
import { View, Text } from 'react-native';
import InsightCard from '../shared/InsightCard';

export default function OverallSummary({ habits, allCompletions, allBlocked, theme, isMobile }) {
  let totalChecks = 0, totalGoalWeeks = 0, totalWeeks = 0, totalOpps = 0;
  const now = new Date();

  for (const habit of habits) {
    for (const wk of Object.keys(allCompletions)) {
      const days = allCompletions[wk][habit.id] ?? [];
      const blocked = allBlocked[wk]?.[habit.id] ?? Array(7).fill(false);
      const weekStart = new Date(wk + 'T00:00:00');
      let count = 0;

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        if (date > now) continue;
        if (!blocked[d]) totalOpps++;
        if (days[d]) count++;
      }

      if (count > 0) {
        totalChecks += count;
        totalWeeks++;
        if (count >= habit.perweek) totalGoalWeeks++;
      }
    }
  }

  const overallHitRate = totalWeeks > 0 ? Math.round((totalGoalWeeks / totalWeeks) * 100) : 0;
  const overallConsistency = totalOpps > 0 ? Math.round((totalChecks / totalOpps) * 100) : 0;

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 16,
      padding: isMobile ? 16 : 24, marginBottom: 20,
      borderWidth: 1, borderColor: theme.border,
    }}>
      <Text style={{
        fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
      }}>
        Overall
      </Text>
      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10 }}>
        <InsightCard label="Total Checks" value={totalChecks} accent={theme.accent} theme={theme} isMobile={isMobile} />
        <InsightCard label="Habits Tracked" value={habits.length} theme={theme} isMobile={isMobile} />
        <InsightCard
          label="Consistency"
          value={`${overallConsistency}%`}
          sub={`${totalChecks} / ${totalOpps} checks`}
          accent={overallConsistency >= 70 ? '#a6e3a1' : overallConsistency >= 40 ? '#f9e2af' : undefined}
          theme={theme} isMobile={isMobile}
        />
        <InsightCard
          label="Goal Hit Rate"
          value={`${overallHitRate}%`}
          sub={`${totalGoalWeeks} / ${totalWeeks} weeks`}
          accent={overallHitRate >= 70 ? '#a6e3a1' : undefined}
          theme={theme} isMobile={isMobile}
        />
      </View>
    </View>
  );
}