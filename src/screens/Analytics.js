import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { getHabits, getAllCompletions } from '../db/database';
import InsightCard from '../components/shared/InsightCard';
import BarChart from '../components/analytics/BarChart';
import OverallSummary from '../components/analytics/OverallSummary';
import LineGraph from '../components/analytics/LineGraph';
import RangeSelector from '../components/analytics/RangeSelector';
import HabitFilter, { CHART_COLORS } from '../components/analytics/HabitFilter';
import HabitRadarChart from '../components/analytics/RadarChart';
import HabitComparison from '../components/analytics/HabitComparison';
import StackedBarChart from '../components/analytics/StackedBarChart';
import StreakTimeline from '../components/analytics/StreakTimeline';
import CompoundHero from '../components/analytics/CompoundHero';
import MomentumStrip from '../components/analytics/MomentumStrip';

const MOBILE_BREAKPOINT = 768;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BUILT_DAYS = 66;

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Cheap count of completed (checked, non-future) days for a single habit across all history.
// Does not reset on missed weeks — only ever climbs. Used for the 66-day bar on collapsed rows.
function computeTotalChecks(habitId, allCompletions) {
  const now = new Date();
  let total = 0;
  for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
    const days = habitsInWeek[habitId];
    if (!days) continue;
    const weekStart = new Date(wk + 'T00:00:00');
    for (let d = 0; d < 7; d++) {
      if (!days[d]) continue;
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date <= now) total++;
    }
  }
  return total;
}

function computeStats(habit, allCompletions, allBlocked = {}) {
  const weekKeys = Object.keys(allCompletions).sort();
  const habitWeeks = weekKeys.filter(
    wk => allCompletions[wk][habit.id] && allCompletions[wk][habit.id].some(Boolean)
  );

  if (habitWeeks.length === 0) return null;

  let totalChecks = 0, totalOpportunities = 0, bestWeekCount = 0, bestWeekKey = null;
  let firstCheck = null, lastCheck = null, goalsHit = 0;
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
      if (!blocked[d]) { totalOpportunities++; dayOfWeekOpps[d]++; }
      if (days[d]) {
        weekCount++; totalChecks++; dayOfWeekChecks[d]++;
        const iso = date.toISOString().split('T')[0];
        if (!firstCheck || iso < firstCheck) firstCheck = iso;
        if (!lastCheck || iso > lastCheck) lastCheck = iso;
      }
    }

    if (weekCount > bestWeekCount) { bestWeekCount = weekCount; bestWeekKey = wk; }
    if (weekCount >= habit.perweek) goalsHit++;
    if (weekCount > 0) chartData.push({ week: wk.slice(5), count: weekCount, fullWeekKey: wk });
  }

  const consistency = totalOpportunities > 0
    ? Math.round((totalChecks / totalOpportunities) * 100) : 0;

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
      if (streak > bestStreak) { bestStreak = streak; bestStreakStart = tempStart; bestStreakEnd = wk; }
    } else { streak = 0; }
  }

  for (let i = allWeeksSorted.length - 1; i >= 0; i--) {
    const wk = allWeeksSorted[i];
    const days = allCompletions[wk][habit.id] ?? [];
    if (days.filter(Boolean).length >= habit.perweek) { currentStreak++; currentStreakSince = wk; }
    else break;
  }

  const dayRates = dayOfWeekChecks.map((c, i) =>
    dayOfWeekOpps[i] > 0 ? Math.round((c / dayOfWeekOpps[i]) * 100) : 0
  );
  const bestDayIndex  = dayRates.indexOf(Math.max(...dayRates));
  const worstDayIndex = dayRates.indexOf(Math.min(...dayRates));

  const weeksTracked = weekKeys.filter(wk =>
    allCompletions[wk][habit.id] && allCompletions[wk][habit.id].some(v => v !== false)
  ).length || habitWeeks.length;

  return {
    totalChecks, totalOpportunities, consistency, weeksTracked,
    bestWeekCount, bestWeekKey, firstCheck, lastCheck, goalsHit,
    goalHitRate: weeksTracked > 0 ? Math.round((goalsHit / weeksTracked) * 100) : 0,
    currentStreak, currentStreakSince, bestStreak, bestStreakStart, bestStreakEnd,
    bestDay: totalChecks > 0 ? DAY_NAMES[bestDayIndex] : null,
    bestDayRate: dayRates[bestDayIndex],
    worstDay: totalChecks > 0 ? DAY_NAMES[worstDayIndex] : null,
    worstDayRate: dayRates[worstDayIndex],
    chartData: chartData.slice(-16),
  };
}

export default function Analytics() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const s = makeStyles(theme, isMobile);
  const navigation = useNavigation();

  const [habits, setHabits]               = useState([]);
  const [allCompletions, setAllCompletions] = useState({});
  const [allBlocked, setAllBlocked]         = useState({});
  const [expanded, setExpanded]             = useState(null);
  const [loading, setLoading]               = useState(true);

  const [rangeKey, setRangeKey]         = useState('all');
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [activeIds, setActiveIds]       = useState(new Set());
  const [useHabitColors, setUseHabitColors] = useState(false);

  const [cumulative, setCumulative] = useState(false);
  const [chartMode, setChartMode] = useState('line');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [habitsOpen, setHabitsOpen] = useState(false);

  const navigateToWeek = (weekKey) => {
    const target = new Date(weekKey + 'T00:00:00');
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((target - now) / (7 * 86400000));
    navigation.navigate('Habits', { weekOffset: diff });
  };

  const loadData = async () => {
    setLoading(true);
    const [h, c] = await Promise.all([getHabits(), getAllCompletions()]);
    setHabits(h);
    setAllCompletions(c.checks);
    setAllBlocked(c.blocked);
    setActiveIds(new Set(h.map(habit => habit.id)));
    setLoading(false);
  };

  const toggleHabit = (id) => {
    setActiveIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  useEffect(() => {
    AsyncStorage.getItem('useHabitColors').then(val => {
      if (val !== null) setUseHabitColors(val === 'true');
    });
  }, []);

  const minDate = useMemo(() => {
    const keys = Object.keys(allCompletions).sort();
    return keys.length > 0 ? keys[0] : null;
  }, [allCompletions]);

  // Pre-compute cumulative completed days per habit so bars render without expansion.
  const habitTotals = useMemo(() => {
    const result = {};
    for (const habit of habits) {
      result[habit.id] = computeTotalChecks(habit.id, allCompletions);
    }
    return result;
  }, [habits, allCompletions]);

  const builtCount = useMemo(
    () => habits.filter(h => (habitTotals[h.id] ?? 0) >= BUILT_DAYS).length,
    [habits, habitTotals]
  );

  useEffect(() => {
    if (chartMode === 'timeline' && rangeKey === 'all') {
      setRangeKey('12months');
    }
  }, [chartMode]);

  useEffect(() => {
    if (isMobile && chartMode === 'timeline') {
      setChartMode('line');
    }
  }, [isMobile]);

  if (loading) return <View style={s.center}><Text style={s.muted}>Loading...</Text></View>;
  if (habits.length === 0) return <View style={s.center}><Text style={s.muted}>No habits yet.</Text></View>;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <MomentumStrip
        habits={habits} allCompletions={allCompletions}
        allBlocked={allBlocked} theme={theme} isMobile={isMobile}
      />
      <CompoundHero
        habits={habits} allCompletions={allCompletions}
        allBlocked={allBlocked} minDate={minDate}
        useHabitColors={useHabitColors}
        theme={theme} isMobile={isMobile}
      />

      {/* Habits collapsible — collapsed by default */}
      <View style={s.card}>
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => setHabitsOpen(v => !v)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.habitName}>Habits</Text>
            <Text style={s.habitMeta}>{builtCount} of {habits.length} Built</Text>
          </View>
          <Text style={s.chevron}>{habitsOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {habitsOpen && habits.map(habit => {
        const isOpen = expanded === habit.id;
        const stats  = isOpen ? computeStats(habit, allCompletions, allBlocked) : null;
        const totalCompleted = habitTotals[habit.id] ?? 0;
        const streakDays = Math.min(totalCompleted, BUILT_DAYS);
        const built = totalCompleted >= BUILT_DAYS;
        const fillPct = (streakDays / BUILT_DAYS) * 100;

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
                <View style={{ marginTop: 8, marginRight: 8 }} pointerEvents="none">
                  <Text style={s.barLabel}>
                    {built ? 'Built ✓' : `${streakDays} / ${BUILT_DAYS} reps`}
                  </Text>
                  <View style={s.barTrack}>
                    <View style={[
                      s.barFill,
                      {
                        width: `${fillPct}%`,
                        backgroundColor: built ? '#a6e3a1' : theme.accent,
                      },
                    ]} />
                  </View>
                </View>
              </View>
              <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={s.cardBody}>
                {!stats ? <Text style={s.muted}>No data yet.</Text> : (
                  <>
                    <View style={s.statRow}>
                      <InsightCard label="Total Checks" value={stats.totalChecks} sub={`${stats.totalChecks} / ${stats.totalOpportunities} possible`} accent={theme.accent} theme={theme} isMobile={isMobile} />
                      <InsightCard label="Consistency" value={`${stats.consistency}%`} accent={stats.consistency >= 70 ? '#a6e3a1' : stats.consistency >= 40 ? '#f9e2af' : undefined} theme={theme} isMobile={isMobile} />
                      <InsightCard label="Goal Hit Rate" value={`${stats.goalHitRate}%`} sub={`${stats.goalsHit} / ${stats.weeksTracked} weeks`} accent={stats.goalHitRate >= 70 ? '#a6e3a1' : undefined} theme={theme} isMobile={isMobile} />
                    </View>
                    <View style={s.statRow}>
                      <InsightCard label="Best Week" value={`${stats.bestWeekCount}/${habit.perweek}`} sub={stats.bestWeekKey ? `wk of ${fmtDate(stats.bestWeekKey)}` : null} accent={stats.bestWeekCount >= habit.perweek ? '#f9e2af' : undefined} theme={theme} isMobile={isMobile} />
                      <InsightCard label="Current Streak" value={`${stats.currentStreak}w`} sub={stats.currentStreakSince ? `since wk of ${fmtDate(stats.currentStreakSince)}` : null} accent={stats.currentStreak > 0 ? '#f9e2af' : undefined} theme={theme} isMobile={isMobile} />
                      <InsightCard label="Best Streak" value={`${stats.bestStreak}w`} sub={stats.bestStreakStart ? `${fmtDate(stats.bestStreakStart)} → ${fmtDate(stats.bestStreakEnd)}` : null} accent={theme.accent} theme={theme} isMobile={isMobile} />
                    </View>
                    <View style={s.statRow}>
                      <InsightCard label="Best Day" value={stats.bestDay ?? '—'} sub={stats.bestDay ? `${stats.bestDayRate}% consistency` : null} accent="#a6e3a1" theme={theme} isMobile={isMobile} />
                      <InsightCard label="Worst Day" value={stats.worstDay ?? '—'} sub={stats.worstDay ? `${stats.worstDayRate}% consistency` : null} accent={theme.delete} theme={theme} isMobile={isMobile} />
                    </View>
                    <View style={s.dateRow}>
                      <View style={s.datePill}><Text style={s.dateLabel}>First check</Text><Text style={s.dateValue}>{fmtDate(stats.firstCheck)}</Text></View>
                      <View style={s.datePill}><Text style={s.dateLabel}>Most recent</Text><Text style={s.dateValue}>{fmtDate(stats.lastCheck)}</Text></View>
                      <View style={s.datePill}><Text style={s.dateLabel}>Weeks tracked</Text><Text style={s.dateValue}>{stats.weeksTracked}</Text></View>
                    </View>
                    <HabitRadarChart habit={habit} allCompletions={allCompletions} allBlocked={allBlocked} theme={theme} isMobile={isMobile} />
                    <BarChart data={stats.chartData} goal={habit.perweek} theme={theme} isMobile={isMobile} onWeekPress={navigateToWeek} />
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
      {habitsOpen && (
        <Text style={s.footnote}>
          66 days = average to automaticity; individual range varies widely.
        </Text>
      )}

      {/* More metrics — collapsed by default */}
      <View style={s.card}>
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => setMoreOpen(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.habitName}>More metrics</Text>
          <Text style={s.chevron}>{moreOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {moreOpen && (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {/* Overall summary (moved here from top of screen) */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <OverallSummary
                habits={habits} allCompletions={allCompletions}
                allBlocked={allBlocked} theme={theme} isMobile={isMobile}
              />
            </View>
            {/* Trends section */}
            <View style={{ padding: isMobile ? 16 : 24, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={s.sectionLabel}>Trends</Text>
              <RangeSelector
                rangeKey={rangeKey} onRangeChange={setRangeKey}
                customFrom={customFrom} customTo={customTo}
                onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
                minDate={minDate}
                chartMode={chartMode}
                theme={theme}
              />
              <HabitFilter
                habits={habits} activeIds={activeIds} onToggle={toggleHabit}
                useHabitColors={useHabitColors} onToggleColorMode={() => { const next = !useHabitColors; setUseHabitColors(next); AsyncStorage.setItem('useHabitColors', String(next)); }}
                cumulative={cumulative} onToggleCumulative={() => setCumulative(v => !v)}
                showCumulative={chartMode === 'line'}
                theme={theme} isMobile={isMobile}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[{ key: 'line', label: 'Line' }, { key: 'stacked', label: 'Stacked' }, { key: 'timeline', label: 'Timeline' }].filter(({ key }) => !(isMobile && key === 'timeline')).map(({ key, label }) => {
                  const active = chartMode === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setChartMode(key)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 8, borderWidth: 1,
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accent + '1a' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: active ? theme.accent : theme.textSub }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {chartMode === 'line' && (
                <LineGraph
                  habits={habits} activeIds={activeIds}
                  allCompletions={allCompletions} allBlocked={allBlocked}
                  rangeKey={rangeKey} customFrom={customFrom} customTo={customTo}
                  useHabitColors={useHabitColors} cumulative={cumulative}
                  theme={theme} isMobile={isMobile}
                />
              )}
              {chartMode === 'stacked' && (
                <StackedBarChart
                  habits={habits} activeIds={activeIds}
                  allCompletions={allCompletions} allBlocked={allBlocked}
                  rangeKey={rangeKey} customFrom={customFrom} customTo={customTo}
                  useHabitColors={useHabitColors}
                  theme={theme} isMobile={isMobile}
                />
              )}
              {chartMode === 'timeline' && (
                <StreakTimeline
                  habits={habits} activeIds={activeIds}
                  allCompletions={allCompletions} allBlocked={allBlocked}
                  rangeKey={rangeKey} customFrom={customFrom} customTo={customTo}
                  useHabitColors={useHabitColors}
                  theme={theme} isMobile={isMobile}
                  minDate={minDate}
                />
              )}
            </View>

            {/* Habit Comparison section */}
            <TouchableOpacity
              style={s.cardHeader}
              onPress={() => setComparisonOpen(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={s.habitName}>Habit Comparison</Text>
              <Text style={s.chevron}>{comparisonOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {comparisonOpen && (
              <View style={s.cardBody}>
                <HabitComparison
                  habits={habits} allCompletions={allCompletions}
                  allBlocked={allBlocked} theme={theme} isMobile={isMobile}
                />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

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
    barLabel:     { fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: t.textSub, marginBottom: 4 },
    barTrack:     { height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' },
    barFill:      { height: '100%', borderRadius: 2 },
    footnote:     { fontSize: 10, fontFamily: 'Raleway_400Regular', color: t.textSub, textAlign: 'center', marginTop: 4, marginBottom: 16, opacity: 0.7, paddingHorizontal: 8 },
  });
}
