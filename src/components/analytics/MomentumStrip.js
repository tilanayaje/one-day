import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

// Single pass: per-habit and grand-total cumulative reps (non-future checked days).
function computeAllTotals(habits, allCompletions) {
  const now = new Date();
  const result = {};
  for (const h of habits) result[h.id] = 0;

  for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
    const weekStart = new Date(wk + 'T00:00:00');
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date > now) continue;
      for (const h of habits) {
        if (habitsInWeek[h.id]?.[d]) result[h.id]++;
      }
    }
  }
  return result;
}

// Raw check count across ALL habits within the trailing windowDays calendar days.
function countChecksInWindow(habits, allCompletions, windowDays) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  cutoff.setHours(0, 0, 0, 0);

  let total = 0;
  for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
    const weekStart = new Date(wk + 'T00:00:00');
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date < cutoff || date > todayEnd) continue;
      for (const h of habits) {
        if (habitsInWeek[h.id]?.[d]) total++;
      }
    }
  }
  return total;
}

// Checks/day for a single habit over the last 14 calendar days.
function computeHabitRate14(habitId, allCompletions) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 13); // 14 days including today
  cutoff.setHours(0, 0, 0, 0);

  let total = 0;
  for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
    const days = habitsInWeek[habitId];
    if (!days) continue;
    const weekStart = new Date(wk + 'T00:00:00');
    for (let d = 0; d < 7; d++) {
      if (!days[d]) continue;
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date >= cutoff && date <= todayEnd) total++;
    }
  }
  return total / 14;
}

function fmtSince(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MomentumStrip({ habits, allCompletions, theme, isMobile }) {
  const metrics = useMemo(() => {
    if (!habits.length || !Object.keys(allCompletions).length) return null;

    const totals = computeAllTotals(habits, allCompletions);
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    if (grandTotal === 0) return null;

    const minDate = Object.keys(allCompletions).sort()[0] ?? null;

    // Momentum: compare last 7-day rate to last 30-day rate.
    const rate7 = countChecksInWindow(habits, allCompletions, 7) / 7;
    const rate30 = countChecksInWindow(habits, allCompletions, 30) / 30;

    let momentum;
    if (rate30 === 0) {
      momentum = { label: 'Building momentum', color: theme.textSub };
    } else {
      const delta = Math.round(((rate7 - rate30) / rate30) * 100);
      if (delta >= 5) {
        momentum = { label: `↑ Accelerating · ${delta}% above your 30-day pace`, color: '#a6e3a1' };
      } else if (delta <= -5) {
        momentum = { label: `↓ Slowing · ${Math.abs(delta)}% below your 30-day pace`, color: '#f9e2af' };
      } else {
        momentum = { label: 'Holding steady', color: theme.textSub };
      }
    }

    // Nearest milestone: habit not yet built with fewest reps remaining.
    const notBuilt = habits.filter(h => (totals[h.id] ?? 0) < 66);
    let milestone = null;
    if (notBuilt.length === 0) {
      milestone = { allBuilt: true };
    } else {
      const closest = notBuilt.reduce((best, h) =>
        (totals[h.id] ?? 0) > (totals[best.id] ?? 0) ? h : best
      );
      const remaining = 66 - (totals[closest.id] ?? 0);
      const rate14 = computeHabitRate14(closest.id, allCompletions);
      let eta = null;
      if (rate14 > 0) {
        const weeks = Math.ceil(remaining / (rate14 * 7));
        if (weeks <= 99) eta = weeks;
      }
      milestone = { habit: closest, remaining, eta };
    }

    return { grandTotal, minDate, momentum, milestone };
  }, [habits, allCompletions, theme]);

  if (!metrics) return null;

  const { grandTotal, minDate, momentum, milestone } = metrics;

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 16,
      padding: isMobile ? 16 : 24, marginBottom: 20,
      borderWidth: 1, borderColor: theme.border,
    }}>
      {/* Hero number */}
      <Text style={{
        fontSize: 10, fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub, letterSpacing: 1.4,
        textTransform: 'uppercase', marginBottom: 6,
      }}>
        Cumulative Reps
      </Text>
      <Text style={{
        fontSize: isMobile ? 48 : 60,
        fontFamily: 'Raleway_700Bold',
        color: theme.accent,
        lineHeight: isMobile ? 54 : 68,
      }}>
        {grandTotal.toLocaleString()}
      </Text>
      <Text style={{
        fontSize: 12, fontFamily: 'Raleway_400Regular',
        color: theme.textSub, marginTop: 4, marginBottom: 16,
      }}>
        total reps{minDate ? ` · since ${fmtSince(minDate)}` : ''}
      </Text>

      <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 14 }} />

      {/* Momentum chip */}
      <Text style={{
        fontSize: 13, fontFamily: 'Raleway_600SemiBold',
        color: momentum.color,
        marginBottom: milestone ? 10 : 0,
      }}>
        {momentum.label}
      </Text>

      {/* Nearest milestone */}
      {milestone && !milestone.allBuilt && (
        <Text style={{ fontSize: 12, fontFamily: 'Raleway_400Regular', color: theme.textSub }}>
          {'Closest to Built: '}
          <Text style={{ fontFamily: 'Raleway_600SemiBold', color: theme.text }}>
            {milestone.habit.name}
          </Text>
          {` — ${milestone.remaining} rep${milestone.remaining !== 1 ? 's' : ''} to go`}
          {milestone.eta != null
            ? <Text style={{ color: theme.textSub }}>{` (~${milestone.eta} wk${milestone.eta !== 1 ? 's' : ''} at pace)`}</Text>
            : null}
        </Text>
      )}
      {milestone?.allBuilt && (
        <Text style={{ fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: '#a6e3a1' }}>
          Every habit Built — time for new ones?
        </Text>
      )}
    </View>
  );
}
