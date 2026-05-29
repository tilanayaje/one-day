import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getHabits, getAllCompletions } from '../db/database';

function computeStats(habit, allCompletions) {
  const weekKeys = Object.keys(allCompletions).sort();
  const habitWeeks = weekKeys.filter(
    wk => allCompletions[wk][habit.id] && allCompletions[wk][habit.id].some(Boolean)
  );
  if (habitWeeks.length === 0) return null;

  let totalCompletions = 0;
  let bestWeekCount = 0;
  let firstCheck = null;
  let lastCheck = null;
  let goalsHit = 0;
  const chartData = [];

  for (const wk of weekKeys) {
    const days = allCompletions[wk][habit.id] ?? Array(7).fill(false);
    const count = days.filter(Boolean).length;
    if (count === 0) continue;

    totalCompletions += count;
    if (count > bestWeekCount) bestWeekCount = count;
    if (count >= habit.perweek) goalsHit++;

    for (let i = 0; i < 7; i++) {
      if (days[i]) {
        const date = new Date(wk);
        date.setDate(date.getDate() + i);
        const iso = date.toISOString().split('T')[0];
        if (!firstCheck || iso < firstCheck) firstCheck = iso;
        if (!lastCheck || iso > lastCheck) lastCheck = iso;
      }
    }
    chartData.push({ week: wk.slice(5), count });
  }

  const allWeekKeys = Object.keys(allCompletions).sort().reverse();
  let currentStreak = 0;
  for (const wk of allWeekKeys) {
    const days = allCompletions[wk][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) currentStreak++;
    else break;
  }

  let bestStreak = 0, streak = 0;
  for (const wk of Object.keys(allCompletions).sort()) {
    const days = allCompletions[wk][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) { streak++; if (streak > bestStreak) bestStreak = streak; }
    else streak = 0;
  }

  return {
    totalCompletions,
    bestWeekCount,
    firstCheck,
    lastCheck,
    weeksTracked: habitWeeks.length,
    currentStreak,
    bestStreak,
    goalHitRate: Math.round((goalsHit / habitWeeks.length) * 100),
    chartData: chartData.slice(-16),
  };
}

function BarChart({ data, goal, theme }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(goal, ...data.map(d => d.count));
  const chartHeight = 140;
  const barWidth = Math.min(48, Math.floor(800 / data.length) - 6);

  return (
    <View>
      <Text style={{
        color: theme.textSub,
        fontSize: 11,
        fontFamily: 'Raleway_600SemiBold',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Weekly Completions
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 28, gap: 4, flexWrap: 'nowrap' }}>
        {data.map((d, i) => {
          const barHeight = maxVal > 0 ? Math.max(2, (d.count / maxVal) * chartHeight) : 2;
          const goalLineY = (goal / maxVal) * chartHeight;
          const hitGoal = d.count >= goal;
          return (
            <View key={i} style={{ width: barWidth, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight + 28 }}>
              <View style={{ width: barWidth, height: chartHeight, justifyContent: 'flex-end', position: 'relative' }}>
                <View style={{
                  position: 'absolute',
                  bottom: goalLineY,
                  left: 0, right: 0,
                  height: 1,
                  backgroundColor: '#f9e2af',
                  opacity: 0.5,
                }} />
                <View style={{
                  width: '85%',
                  alignSelf: 'center',
                  height: barHeight,
                  backgroundColor: hitGoal ? '#f9e2af' : theme.accent,
                  borderRadius: 4,
                  opacity: 0.85,
                }} />
              </View>
              <Text style={{
                color: theme.textSub,
                fontSize: 9,
                marginTop: 6,
                fontFamily: 'Raleway_400Regular',
                textAlign: 'center',
              }}>
                {d.week}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 1, backgroundColor: '#f9e2af' }} />
          <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>Goal</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, backgroundColor: '#f9e2af', borderRadius: 2 }} />
          <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>Met</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, backgroundColor: theme.accent, borderRadius: 2 }} />
          <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>In progress</Text>
        </View>
      </View>
    </View>
  );
}

function StatCard({ label, value, theme, accent }) {
  return (
    <View style={{
      flex: 1,
      minWidth: 100,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      margin: 4,
    }}>
      <Text style={{
        fontSize: 28,
        fontFamily: 'Raleway_700Bold',
        color: accent || theme.text,
        marginBottom: 4,
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 10,
        fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub,
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {label}
      </Text>
    </View>
  );
}

function OverallSummary({ habits, allCompletions, theme }) {
  let totalChecks = 0;
  let totalGoalWeeks = 0;
  let totalWeeks = 0;

  for (const habit of habits) {
    const weekKeys = Object.keys(allCompletions).sort();
    for (const wk of weekKeys) {
      const days = allCompletions[wk][habit.id] ?? [];
      const count = days.filter(Boolean).length;
      if (count > 0) {
        totalChecks += count;
        totalWeeks++;
        if (count >= habit.perweek) totalGoalWeeks++;
      }
    }
  }

  const overallHitRate = totalWeeks > 0 ? Math.round((totalGoalWeeks / totalWeeks) * 100) : 0;

  return (
    <View style={{
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    }}>
      <Text style={{
        fontSize: 13,
        fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Overall
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <StatCard label="Total Checks" value={totalChecks} theme={theme} accent={theme.accent} />
        <StatCard label="Habits Tracked" value={habits.length} theme={theme} />
        <StatCard label="Overall Hit Rate" value={`${overallHitRate}%`} theme={theme} accent={overallHitRate >= 70 ? '#a6e3a1' : undefined} />
      </View>
    </View>
  );
}

export default function Analytics() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [habits, setHabits] = useState([]);
  const [allCompletions, setAllCompletions] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [h, c] = await Promise.all([getHabits(), getAllCompletions()]);
    setHabits(h);
    setAllCompletions(c);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) return (
    <View style={s.center}>
      <Text style={s.muted}>Loading...</Text>
    </View>
  );

  if (habits.length === 0) return (
    <View style={s.center}>
      <Text style={s.muted}>No habits yet.</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <OverallSummary habits={habits} allCompletions={allCompletions} theme={theme} />

      <Text style={s.sectionLabel}>Per Habit</Text>

      {habits.map(habit => {
        const isOpen = expanded === habit.id;
        const stats = isOpen ? computeStats(habit, allCompletions) : null;
        const hasColor = !!habit.color;

        return (
          <View key={habit.id} style={[s.card, hasColor && { borderLeftWidth: 3, borderLeftColor: habit.color }]}>
            <TouchableOpacity
              style={s.cardHeader}
              onPress={() => setExpanded(isOpen ? null : habit.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.habitName}>{habit.name}</Text>
                <Text style={s.habitMeta}>Goal: {habit.perweek}x / week</Text>
              </View>
              <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={s.cardBody}>
                {!stats ? (
                  <Text style={s.muted}>No data yet for this habit.</Text>
                ) : (
                  <>
                    <View style={s.statRow}>
                      <StatCard label="Total Checks"  value={stats.totalCompletions}                    theme={theme} />
                      <StatCard label="Weeks Tracked" value={stats.weeksTracked}                        theme={theme} />
                      <StatCard label="Best Week"     value={`${stats.bestWeekCount}/${habit.perweek}`} theme={theme} />
                      <StatCard label="Hit Rate"      value={`${stats.goalHitRate}%`}                   theme={theme} accent={stats.goalHitRate >= 70 ? '#a6e3a1' : undefined} />
                      <StatCard label="Streak"        value={`${stats.currentStreak}w`}                 theme={theme} accent={stats.currentStreak > 0 ? theme.accent : undefined} />
                      <StatCard label="Best Streak"   value={`${stats.bestStreak}w`}                    theme={theme} />
                    </View>

                    <View style={s.dateRow}>
                      <View style={s.datePill}>
                        <Text style={s.dateLabel}>First check</Text>
                        <Text style={s.dateValue}>{stats.firstCheck ?? '—'}</Text>
                      </View>
                      <View style={s.datePill}>
                        <Text style={s.dateLabel}>Most recent</Text>
                        <Text style={s.dateValue}>{stats.lastCheck ?? '—'}</Text>
                      </View>
                    </View>

                    <BarChart data={stats.chartData} goal={habit.perweek} theme={theme} />
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:    { flex: 1, padding: 24, backgroundColor: t.bg },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    sectionLabel: { fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
    card:         { backgroundColor: t.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: 18 },
    habitName:    { fontSize: 16, fontFamily: 'Raleway_600SemiBold', color: t.text, marginBottom: 2 },
    habitMeta:    { fontSize: 12, fontFamily: 'Raleway_400Regular', color: t.textSub },
    chevron:      { fontSize: 11, color: t.textSub, marginLeft: 12 },
    cardBody:     { paddingHorizontal: 18, paddingBottom: 20, borderTopWidth: 1, borderTopColor: t.border },
    statRow:      { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -4 },
    dateRow:      { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
    datePill:     { flex: 1, backgroundColor: t.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: t.border },
    dateLabel:    { fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    dateValue:    { fontSize: 14, fontFamily: 'Raleway_600SemiBold', color: t.text },
    muted:        { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },
  });
}