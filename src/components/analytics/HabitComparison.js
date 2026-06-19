import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeStats(habit, allCompletions, allBlocked) {
  const weekKeys = Object.keys(allCompletions).sort();
  if (weekKeys.length === 0) return null;

  let totalChecks = 0, totalOpportunities = 0, goalsHit = 0;
  const dayChecks = Array(7).fill(0);
  const dayOpps = Array(7).fill(0);
  const now = new Date();

  for (const wk of weekKeys) {
    const days = allCompletions[wk][habit.id] ?? Array(7).fill(false);
    const blocked = allBlocked[wk]?.[habit.id] ?? Array(7).fill(false);
    const weekStart = new Date(wk + 'T00:00:00');
    let weekCount = 0;
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date > now) continue;
      if (!blocked[d]) { totalOpportunities++; dayOpps[d]++; }
      if (days[d]) { weekCount++; totalChecks++; dayChecks[d]++; }
    }
    if (weekCount >= habit.perweek) goalsHit++;
  }

  let currentStreak = 0, bestStreak = 0, streak = 0;
  for (const wk of weekKeys) {
    const days = allCompletions[wk][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) { streak++; if (streak > bestStreak) bestStreak = streak; }
    else streak = 0;
  }
  for (let i = weekKeys.length - 1; i >= 0; i--) {
    const days = allCompletions[weekKeys[i]][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) currentStreak++;
    else break;
  }

  const dayRates = dayChecks.map((c, i) => dayOpps[i] > 0 ? Math.round((c / dayOpps[i]) * 100) : 0);
  const bestDayIndex = dayRates.indexOf(Math.max(...dayRates));
  const weeksTracked = Math.max(1, weekKeys.filter(wk => allCompletions[wk][habit.id]?.some(Boolean)).length);

  return {
    totalChecks,
    consistency: totalOpportunities > 0 ? Math.round((totalChecks / totalOpportunities) * 100) : 0,
    goalHitRate: Math.round((goalsHit / weeksTracked) * 100),
    currentStreak,
    bestStreak,
    bestDay: totalChecks > 0 ? DAY_NAMES[bestDayIndex] : '—',
    bestDayRate: totalChecks > 0 ? dayRates[bestDayIndex] : -1,
  };
}

function HabitPicker({ label, habits, selectedId, onSelect, theme }) {
  const [open, setOpen] = useState(false);
  const selected = habits.find(h => h.id === selectedId);

  return (
    <View style={{ flex: 1, zIndex: open ? 10 : 1 }}>
      <Text style={{
        fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
          backgroundColor: theme.bg,
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: 'Raleway_600SemiBold', color: theme.text, flex: 1 }} numberOfLines={1}>
          {selected?.name ?? 'Select habit'}
        </Text>
        <Text style={{ fontSize: 10, color: theme.textSub, marginLeft: 6 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{
          position: 'absolute', top: 68, left: 0, right: 0,
          backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1,
          borderColor: theme.border, zIndex: 100,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
        }}>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled showsVerticalScrollIndicator>
            {habits.map((h, i) => (
              <TouchableOpacity
                key={h.id}
                onPress={() => { onSelect(h.id); setOpen(false); }}
                activeOpacity={0.7}
                style={{
                  padding: 10,
                  borderBottomWidth: i < habits.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                  backgroundColor: h.id === selectedId ? '#f9e2af22' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 13, fontFamily: 'Raleway_400Regular',
                  color: h.id === selectedId ? '#f9e2af' : theme.text,
                }} numberOfLines={1}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function HabitComparison({ habits, allCompletions, allBlocked, theme, isMobile }) {
  const [habitAId, setHabitAId] = useState(habits[0]?.id ?? null);
  const [habitBId, setHabitBId] = useState(habits[1]?.id ?? null);

  const habitA = habits.find(h => h.id === habitAId);
  const habitB = habits.find(h => h.id === habitBId);

  const statsA = useMemo(
    () => habitA ? computeStats(habitA, allCompletions, allBlocked) : null,
    [habitAId, allCompletions, allBlocked], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const statsB = useMemo(
    () => habitB ? computeStats(habitB, allCompletions, allBlocked) : null,
    [habitBId, allCompletions, allBlocked], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isSame = habitAId != null && habitAId === habitBId;

  const metrics = [
    { label: 'Consistency',    a: statsA?.consistency ?? 0,    b: statsB?.consistency ?? 0,    fmt: v => `${v}%`  },
    { label: 'Goal Hit Rate',  a: statsA?.goalHitRate ?? 0,    b: statsB?.goalHitRate ?? 0,    fmt: v => `${v}%`  },
    { label: 'Current Streak', a: statsA?.currentStreak ?? 0,  b: statsB?.currentStreak ?? 0,  fmt: v => `${v}w`  },
    { label: 'Best Streak',    a: statsA?.bestStreak ?? 0,     b: statsB?.bestStreak ?? 0,     fmt: v => `${v}w`  },
    { label: 'Best Day',       a: statsA?.bestDayRate ?? -1,   b: statsB?.bestDayRate ?? -1,   fmt: (_, d) => d, dispA: statsA?.bestDay ?? '—', dispB: statsB?.bestDay ?? '—' },
    { label: 'Total Checks',   a: statsA?.totalChecks ?? 0,    b: statsB?.totalChecks ?? 0,    fmt: v => `${v}`   },
  ];

  if (habits.length < 2) return null;

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 16,
      padding: isMobile ? 16 : 24, marginBottom: 20,
      borderWidth: 1, borderColor: theme.border,
    }}>
      <Text style={{
        fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
        letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 16,
      }}>
        Habit Comparison
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, zIndex: 10 }}>
        <HabitPicker label="Habit A" habits={habits} selectedId={habitAId} onSelect={setHabitAId} theme={theme} />
        <HabitPicker label="Habit B" habits={habits} selectedId={habitBId} onSelect={setHabitBId} theme={theme} />
      </View>

      {isSame ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 }}>
            Select two different habits to compare
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ width: isMobile ? 96 : 120 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'Raleway_700Bold', color: theme.text }} numberOfLines={1}>
                {habitA?.name ?? '—'}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'Raleway_700Bold', color: theme.text }} numberOfLines={1}>
                {habitB?.name ?? '—'}
              </Text>
            </View>
          </View>

          {metrics.map((m, i) => {
            const aWins = m.a > m.b;
            const bWins = m.b > m.a;
            return (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border,
              }}>
                <View style={{ width: isMobile ? 96 : 120 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: theme.textSub, letterSpacing: 0.5 }}>
                    {m.label}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Raleway_700Bold', color: aWins ? '#f9e2af' : theme.text }}>
                    {m.fmt(m.a, m.dispA)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Raleway_700Bold', color: bWins ? '#f9e2af' : theme.text }}>
                    {m.fmt(m.b, m.dispB)}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}
