import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getHabits, getAllCompletions } from '../db/database';

const MOBILE_BREAKPOINT = 768;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Date formatter ───────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Per-habit stats ──────────────────────────────────────

function computeStats(habit, allCompletions, allBlocked = {}) {
  const weekKeys = Object.keys(allCompletions).sort();
  const habitWeeks = weekKeys.filter(
    wk => allCompletions[wk][habit.id] && allCompletions[wk][habit.id].some(Boolean)
  );

  if (habitWeeks.length === 0) return null;

  let totalChecks = 0;
  let totalOpportunities = 0;
  let bestWeekCount = 0;
  let bestWeekKey = null;
  let firstCheck = null;
  let lastCheck = null;
  let goalsHit = 0;
  const chartData = [];
  const dayOfWeekChecks = Array(7).fill(0);
  const dayOfWeekOpps = Array(7).fill(0);

  const now = new Date();

  for (const wk of weekKeys) {
    const days = allCompletions[wk][habit.id] ?? Array(7).fill(false);
    const blocked = allBlocked[wk]?.[habit.id] ?? Array(7).fill(false);
    let weekCount = 0;

    const weekStart = new Date(wk + 'T00:00:00');

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date > now) continue;

      if (!blocked[d]) {
        totalOpportunities++;
        dayOfWeekOpps[d]++;
      }

      if (days[d]) {
        weekCount++;
        totalChecks++;
        dayOfWeekChecks[d]++;
        const iso = date.toISOString().split('T')[0];
        if (!firstCheck || iso < firstCheck) firstCheck = iso;
        if (!lastCheck || iso > lastCheck) lastCheck = iso;
      }
    }

    if (weekCount > bestWeekCount) {
      bestWeekCount = weekCount;
      bestWeekKey = wk;
    }
    if (weekCount >= habit.perweek) goalsHit++;
    if (weekCount > 0) chartData.push({ week: wk.slice(5), count: weekCount });
  }

  // Consistency
  const consistency = totalOpportunities > 0
    ? Math.round((totalChecks / totalOpportunities) * 100) : 0;

  // Weekly streaks (consecutive weeks hitting goal)
  const allWeeksSorted = weekKeys;
  let currentStreak = 0, bestStreak = 0, streak = 0;
  let bestStreakStart = null, bestStreakEnd = null, tempStart = null;
  let currentStreakSince = null;

  for (let i = 0; i < allWeeksSorted.length; i++) {
    const wk = allWeeksSorted[i];
    const days = allCompletions[wk][habit.id] ?? [];
    const hit = days.filter(Boolean).length >= habit.perweek;

    if (hit) {
      if (streak === 0) tempStart = wk;
      streak++;
      if (streak > bestStreak) {
        bestStreak = streak;
        bestStreakStart = tempStart;
        bestStreakEnd = wk;
      }
    } else {
      streak = 0;
    }
  }

  // Current streak (from most recent week backward)
  for (let i = allWeeksSorted.length - 1; i >= 0; i--) {
    const wk = allWeeksSorted[i];
    const days = allCompletions[wk][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) {
      currentStreak++;
      currentStreakSince = wk;
    } else break;
  }

  // Best and worst day
  const dayRates = dayOfWeekChecks.map((c, i) =>
    dayOfWeekOpps[i] > 0 ? Math.round((c / dayOfWeekOpps[i]) * 100) : 0
  );
  const bestDayIndex = dayRates.indexOf(Math.max(...dayRates));
  const worstDayIndex = dayRates.indexOf(Math.min(...dayRates));

  // Weeks tracked = weeks with any data for this habit
  const weeksTracked = weekKeys.filter(wk =>
    allCompletions[wk][habit.id] && allCompletions[wk][habit.id].some(v => v !== false)
  ).length || habitWeeks.length;

  return {
    totalChecks,
    totalOpportunities,
    consistency,
    weeksTracked,
    bestWeekCount,
    bestWeekKey,
    firstCheck,
    lastCheck,
    goalsHit,
    goalHitRate: weeksTracked > 0 ? Math.round((goalsHit / weeksTracked) * 100) : 0,
    currentStreak,
    currentStreakSince,
    bestStreak,
    bestStreakStart,
    bestStreakEnd,
    bestDay: totalChecks > 0 ? DAY_NAMES[bestDayIndex] : null,
    bestDayRate: dayRates[bestDayIndex],
    worstDay: totalChecks > 0 ? DAY_NAMES[worstDayIndex] : null,
    worstDayRate: dayRates[worstDayIndex],
    chartData: chartData.slice(-16),
  };
}

// ── Bar chart (unchanged) ────────────────────────────────

function BarChart({ data, goal, theme, isMobile }) {
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
                <Text style={{ color: theme.textSub, fontSize: isMobile ? 8 : 9, marginTop: 4, fontFamily: 'Raleway_400Regular', textAlign: 'center' }}>
                  {d.week}
                </Text>
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

// ── Reusable insight card ────────────────────────────────

function InsightCard({ label, value, sub, accent, theme, isMobile }) {
  return (
    <View style={{
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: theme.surface,
      borderRadius: 12, padding: isMobile ? 14 : 16,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      marginBottom: isMobile ? 8 : 0,
    }}>
      <View style={isMobile ? {} : { alignItems: 'center' }}>
        <Text style={{
          fontSize: isMobile ? 12 : 9, fontFamily: 'Raleway_600SemiBold',
          color: theme.textSub, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {label}
        </Text>
        {sub && (
          <Text style={{
            fontSize: 10, fontFamily: 'Raleway_400Regular',
            color: theme.textSub, marginTop: 2,
          }}>
            {sub}
          </Text>
        )}
      </View>
      <Text style={{
        fontSize: isMobile ? 20 : 24, fontFamily: 'Raleway_700Bold',
        color: accent || theme.text, marginTop: isMobile ? 0 : 6,
      }}>
        {value}
      </Text>
    </View>
  );
}

// ── Overall summary ──────────────────────────────────────

function OverallSummary({ habits, allCompletions, allBlocked, theme, isMobile }) {
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

// ── Main Analytics screen ────────────────────────────────

export default function Analytics() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const s = makeStyles(theme, isMobile);

  const [habits, setHabits] = useState([]);
  const [allCompletions, setAllCompletions] = useState({});
  const [allBlocked, setAllBlocked] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [h, c] = await Promise.all([getHabits(), getAllCompletions()]);
    setHabits(h);
    setAllCompletions(c.checks);
    setAllBlocked(c.blocked);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) return (
    <View style={s.center}><Text style={s.muted}>Loading...</Text></View>
  );

  if (habits.length === 0) return (
    <View style={s.center}><Text style={s.muted}>No habits yet.</Text></View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <OverallSummary habits={habits} allCompletions={allCompletions} allBlocked={allBlocked} theme={theme} isMobile={isMobile} />

      <Text style={s.sectionLabel}>Per Habit</Text>

      {habits.map(habit => {
        const isOpen = expanded === habit.id;
        const stats = isOpen ? computeStats(habit, allCompletions, allBlocked) : null;

        return (
          <View key={habit.id} style={[s.card, habit.color && { borderLeftWidth: 3, borderLeftColor: habit.color }]}>
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
                  <Text style={s.muted}>No data yet.</Text>
                ) : (
                  <>
                    {/* Row 1: Checks + Consistency + Goal Hit Rate */}
                    <View style={s.statRow}>
                      <InsightCard
                        label="Total Checks"
                        value={stats.totalChecks}
                        sub={`${stats.totalChecks} / ${stats.totalOpportunities} possible`}
                        accent={theme.accent}
                        theme={theme} isMobile={isMobile}
                      />
                      <InsightCard
                        label="Consistency"
                        value={`${stats.consistency}%`}
                        accent={stats.consistency >= 70 ? '#a6e3a1' : stats.consistency >= 40 ? '#f9e2af' : undefined}
                        theme={theme} isMobile={isMobile}
                      />
                      <InsightCard
                        label="Goal Hit Rate"
                        value={`${stats.goalHitRate}%`}
                        sub={`${stats.goalsHit} / ${stats.weeksTracked} weeks`}
                        accent={stats.goalHitRate >= 70 ? '#a6e3a1' : undefined}
                        theme={theme} isMobile={isMobile}
                      />
                    </View>

                    {/* Row 2: Best Week + Streaks */}
                    <View style={s.statRow}>
                      <InsightCard
                        label="Best Week"
                        value={`${stats.bestWeekCount}/${habit.perweek}`}
                        sub={stats.bestWeekKey ? `wk of ${fmtDate(stats.bestWeekKey)}` : null}
                        accent={stats.bestWeekCount >= habit.perweek ? '#f9e2af' : undefined}
                        theme={theme} isMobile={isMobile}
                      />
                      <InsightCard
                        label="Current Streak"
                        value={`${stats.currentStreak}w`}
                        sub={stats.currentStreakSince ? `since wk of ${fmtDate(stats.currentStreakSince)}` : null}
                        accent={stats.currentStreak > 0 ? '#f9e2af' : undefined}
                        theme={theme} isMobile={isMobile}
                      />
                      <InsightCard
                        label="Best Streak"
                        value={`${stats.bestStreak}w`}
                        sub={stats.bestStreakStart ? `${fmtDate(stats.bestStreakStart)} → ${fmtDate(stats.bestStreakEnd)}` : null}
                        accent={theme.accent}
                        theme={theme} isMobile={isMobile}
                      />
                    </View>

                    {/* Row 3: Best Day + Worst Day */}
                    <View style={s.statRow}>
                      <InsightCard
                        label="Best Day"
                        value={stats.bestDay ?? '—'}
                        sub={stats.bestDay ? `${stats.bestDayRate}% consistency` : null}
                        accent="#a6e3a1"
                        theme={theme} isMobile={isMobile}
                      />
                      <InsightCard
                        label="Worst Day"
                        value={stats.worstDay ?? '—'}
                        sub={stats.worstDay ? `${stats.worstDayRate}% consistency` : null}
                        accent={theme.delete}
                        theme={theme} isMobile={isMobile}
                      />
                    </View>

                    {/* Row 4: Timeline */}
                    <View style={s.dateRow}>
                      <View style={s.datePill}>
                        <Text style={s.dateLabel}>First check</Text>
                        <Text style={s.dateValue}>{fmtDate(stats.firstCheck)}</Text>
                      </View>
                      <View style={s.datePill}>
                        <Text style={s.dateLabel}>Most recent</Text>
                        <Text style={s.dateValue}>{fmtDate(stats.lastCheck)}</Text>
                      </View>
                      <View style={s.datePill}>
                        <Text style={s.dateLabel}>Weeks tracked</Text>
                        <Text style={s.dateValue}>{stats.weeksTracked}</Text>
                      </View>
                    </View>

                    {/* Bar chart */}
                    <BarChart data={stats.chartData} goal={habit.perweek} theme={theme} isMobile={isMobile} />
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

// ── Styles ───────────────────────────────────────────────

function makeStyles(t, mobile) {
  return StyleSheet.create({
    container:    { flex: 1, padding: mobile ? 12 : 24, backgroundColor: t.bg },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    sectionLabel: { fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
    card:         { backgroundColor: t.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: mobile ? 14 : 18 },
    habitName:    { fontSize: mobile ? 14 : 16, fontFamily: 'Raleway_600SemiBold', color: t.text, marginBottom: 2 },
    habitMeta:    { fontSize: 12, fontFamily: 'Raleway_400Regular', color: t.textSub },
    chevron:      { fontSize: 11, color: t.textSub, marginLeft: 12 },
    cardBody:     { paddingHorizontal: mobile ? 14 : 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: t.border },
    statRow:      { flexDirection: mobile ? 'column' : 'row', gap: mobile ? 0 : 10, marginTop: 14 },
    dateRow:      { flexDirection: mobile ? 'column' : 'row', gap: 10, marginTop: 14, marginBottom: 18 },
    datePill:     { flex: mobile ? undefined : 1, backgroundColor: t.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: t.border, marginBottom: mobile ? 8 : 0 },
    dateLabel:    { fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    dateValue:    { fontSize: 14, fontFamily: 'Raleway_600SemiBold', color: t.text },
    muted:        { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },
  });
}