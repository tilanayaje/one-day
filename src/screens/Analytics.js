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

function BarChartCustom({ data, goal, theme }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(goal, ...data.map(d => d.count));
  const chartHeight = 160;

  return (
    <View>
      <Text style={{ color: theme.textSub, fontSize: 12, fontFamily: 'Raleway_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Weekly Completions
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 24, gap: 4 }}>
        {data.map((d, i) => {
          const barHeight = maxVal > 0 ? (d.count / maxVal) * chartHeight : 0;
          const goalLine = (goal / maxVal) * chartHeight;
          const hitGoal = d.count >= goal;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight + 24 }}>
              <View style={{ width: '100%', height: chartHeight, justifyContent: 'flex-end', position: 'relative' }}>
                {/* Goal line */}
                <View style={{
                  position: 'absolute',
                  bottom: goalLine,
                  left: 0, right: 0,
                  height: 1,
                  backgroundColor: '#F5C518',
                  opacity: 0.4,
                }} />
                {/* Bar */}
                <View style={{
                  width: '80%',
                  alignSelf: 'center',
                  height: barHeight,
                  backgroundColor: hitGoal ? '#F5C518' : theme.accent,
                  borderRadius: 3,
                  opacity: 0.9,
                }} />
              </View>
              <Text style={{ color: theme.textSub, fontSize: 9, marginTop: 4, fontFamily: 'Raleway_400Regular' }}>
                {d.week}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <View style={{ width: 12, height: 2, backgroundColor: '#F5C518' }} />
        <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>Goal</Text>
        <View style={{ width: 12, height: 10, backgroundColor: '#F5C518', borderRadius: 2, marginLeft: 12 }} />
        <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>Goal met</Text>
        <View style={{ width: 12, height: 10, backgroundColor: theme.accent, borderRadius: 2, marginLeft: 12 }} />
        <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular' }}>In progress</Text>
      </View>
    </View>
  );
}

function StatBox({ label, value, theme }) {
  return (
    <View style={[sBox.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[sBox.value, { color: theme.text }]}>{value}</Text>
      <Text style={[sBox.label, { color: theme.textSub }]}>{label}</Text>
    </View>
  );
}

const sBox = StyleSheet.create({
  box:   { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', minWidth: 110, margin: 6 },
  value: { fontSize: 26, fontFamily: 'Raleway_700Bold', marginBottom: 4 },
  label: { fontSize: 11, fontFamily: 'Raleway_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
});

export default function Analytics() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [habits, setHabits]             = useState([]);
  const [allCompletions, setAllCompletions] = useState({});
  const [expanded, setExpanded]         = useState(null);
  const [loading, setLoading]           = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [h, c] = await Promise.all([getHabits(), getAllCompletions()]);
    setHabits(h);
    setAllCompletions(c);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) return <View style={s.center}><Text style={s.muted}>Loading...</Text></View>;
  if (habits.length === 0) return <View style={s.center}><Text style={s.muted}>No habits yet.</Text></View>;

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Analytics</Text>
      {habits.map(habit => {
        const isOpen = expanded === habit.id;
        const stats = isOpen ? computeStats(habit, allCompletions) : null;
        return (
          <View key={habit.id} style={[s.card, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={[s.cardHeader, { backgroundColor: theme.surface }]}
              onPress={() => setExpanded(isOpen ? null : habit.id)}
            >
              <Text style={s.habitName}>{habit.name}</Text>
              <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={[s.cardBody, { backgroundColor: theme.bg }]}>
                {!stats ? (
                  <Text style={s.muted}>No data yet for this habit.</Text>
                ) : (
                  <>
                    <View style={s.statRow}>
                      <StatBox label="Total Checks"   value={stats.totalCompletions}           theme={theme} />
                      <StatBox label="Weeks Tracked"  value={stats.weeksTracked}               theme={theme} />
                      <StatBox label="Best Week"      value={`${stats.bestWeekCount}/${habit.perweek}`} theme={theme} />
                      <StatBox label="Goal Hit Rate"  value={`${stats.goalHitRate}%`}          theme={theme} />
                      <StatBox label="Cur. Streak"    value={`${stats.currentStreak}w`}        theme={theme} />
                      <StatBox label="Best Streak"    value={`${stats.bestStreak}w`}           theme={theme} />
                    </View>

                    <View style={s.dateRow}>
                      <Text style={s.dateText}>
                        <Text style={s.dateLabel}>First check: </Text>{stats.firstCheck ?? '—'}
                      </Text>
                      <Text style={s.dateText}>
                        <Text style={s.dateLabel}>Most recent: </Text>{stats.lastCheck ?? '—'}
                      </Text>
                    </View>

                    <BarChartCustom data={stats.chartData} goal={habit.perweek} theme={theme} />
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:  { flex: 1, padding: 32, backgroundColor: t.bg },
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    title:      { fontSize: 28, fontFamily: 'Raleway_700Bold', color: t.text, marginBottom: 24, letterSpacing: 0.5 },
    card:       { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    habitName:  { fontSize: 17, fontFamily: 'Raleway_600SemiBold', color: t.text, letterSpacing: 0.3 },
    chevron:    { fontSize: 12, color: t.textSub },
    cardBody:   { padding: 20 },
    statRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
    dateRow:    { flexDirection: 'row', gap: 24, marginBottom: 24 },
    dateLabel:  { fontFamily: 'Raleway_600SemiBold', color: t.textSub, fontSize: 14 },
    dateText:   { fontFamily: 'Raleway_400Regular', color: t.text, fontSize: 14 },
    muted:      { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 16 },
  });
}