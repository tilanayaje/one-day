import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView,
  useWindowDimensions, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getAllCompletions } from '../db/database';
import { supabase } from '../db/supabase';

const MOBILE_BREAKPOINT = 768;
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Color helpers ────────────────────────────────────────

function goldColor(intensity, theme, isDark) {
  if (intensity === 0) return theme.border;
  if (isDark) {
    if (intensity <= 0.25) return '#1e1b0d';
    if (intensity <= 0.50) return '#3a3215';
    if (intensity <= 0.75) return '#5e4e20';
    return '#8a7530';
  } else {
    if (intensity <= 0.25) return '#efe5c8';
    if (intensity <= 0.50) return '#d4c078';
    if (intensity <= 0.75) return '#b09830';
    return '#8a7820';
  }
}

// ── Build the 365-day heatmap grid ───────────────────────

function buildHeatmap(allCompletions, weekCount = 53) {
  const checksByDate = {};
  for (const [weekKey, habits] of Object.entries(allCompletions)) {
    const weekStart = new Date(weekKey + 'T00:00:00');
    for (const [, dayArr] of Object.entries(habits)) {
      for (let d = 0; d < 7; d++) {
        if (dayArr[d]) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + d);
          const iso = date.toISOString().split('T')[0];
          checksByDate[iso] = (checksByDate[iso] ?? 0) + 1;
        }
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];

  const start = new Date(today);
  start.setDate(start.getDate() - (weekCount - 1) * 7);
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  const monthLabels = [];
  let cur = new Date(start);
  let lastMonth = -1;

  while (weeks.length < weekCount) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().split('T')[0];
      week.push({
        iso,
        count:    checksByDate[iso] ?? 0,
        isFuture: cur > today,
        isToday:  iso === todayIso,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Month labels with year above January
    const month = new Date(week[0].iso).getMonth();
    const year  = new Date(week[0].iso).getFullYear();
    if (month !== lastMonth) {
      const lastLabelIndex = monthLabels.length > 0 ? monthLabels[monthLabels.length - 1].weekIndex : -4;
      if (month === 0 || weeks.length - lastLabelIndex >= 3) {
        monthLabels.push({
          weekIndex: weeks.length,
          label: MONTHS[month],
          year: month === 0 ? year : null,
        });
      }
      lastMonth = month;
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(checksByDate));
  return { weeks, monthLabels, maxCount };
}

// ── Compute all stats from completion data ───────────────

function computeStats(allCompletions, allBlocked = {}) {
  const checksByDate = {};      // date → total checks that day
  const dayOfWeekCounts = Array(7).fill(0); // index 0=Sun → total checks on that weekday
  const dayOfWeekOpps = Array(7).fill(0);
  const now = new Date();

  let totalChecks = 0;
  let totalOpportunities = 0;   // habit-day combinations (for consistency score)
  let totalDays = 0;

  for (const [weekKey, habits] of Object.entries(allCompletions)) {
    const weekStart = new Date(weekKey + 'T00:00:00');
    const habitIds = Object.keys(habits);
    const habitCount = habitIds.length;

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const iso = date.toISOString().split('T')[0];

      // Don't count future days
      if (date > now) continue;
      totalDays++;

      let checksThisDay = 0;
      for (const id of habitIds) {
        const isBlocked = allBlocked[weekKey]?.[id]?.[d] ?? false;
        if (!isBlocked) {
          totalOpportunities++;
          dayOfWeekOpps[d]++;
        }
        if (habits[id][d]) {
          checksThisDay++;
          dayOfWeekCounts[d]++;
        }
      }

      if (checksThisDay > 0) {
        checksByDate[iso] = checksThisDay;
        totalChecks += checksThisDay;
      }
    }
  }

  // Active days = days with at least one check
  const activeDays = Object.keys(checksByDate).length;

  // Consistency = checks / opportunities
  const consistency = totalOpportunities > 0
    ? Math.round((totalChecks / totalOpportunities) * 100)
    : 0;

  const dayRates = dayOfWeekCounts.map((c, i) => dayOfWeekOpps[i] > 0 ? Math.round((c / dayOfWeekOpps[i]) * 100) : 0);
  const bestDayIndex  = dayRates.indexOf(Math.max(...dayRates));
  const worstDayIndex = dayRates.indexOf(Math.min(...dayRates));

  // Streaks
  const sorted = Object.keys(checksByDate).sort();

  let bestStreak = 0, streak = 0;
  let bestStreakStart = null, bestStreakEnd = null;
  let tempStart = null;

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      streak = 1;
      tempStart = sorted[i];
    } else {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        streak = 1;
        tempStart = sorted[i];
      }
    }
    if (streak > bestStreak) {
      bestStreak = streak;
      bestStreakStart = tempStart;
      bestStreakEnd = sorted[i];
    }
  }

  let currentStreak = 0;
  let currentStreakSince = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];
  const check = new Date(today);

  // If nothing checked today, start counting from yesterday
  if (!checksByDate[todayIso]) {
    check.setDate(check.getDate() - 1);
  }

  while (true) {
    const iso = check.toISOString().split('T')[0];
    if (checksByDate[iso]) {
      currentStreak++;
      currentStreakSince = iso;
      check.setDate(check.getDate() - 1);
    } else break;
  }
  // Perfect day streak — at the bottom of computeStats, after the other streak calculations
  let perfectStreak = 0;
  const perfCheck = new Date(today);

  if (!checksByDate[perfCheck.toISOString().split('T')[0]]) {
    perfCheck.setDate(perfCheck.getDate() - 1);
  }

  while (true) {
    const iso = perfCheck.toISOString().split('T')[0];
    const weekStart = new Date(perfCheck);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const wk = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const dayIndex = perfCheck.getDay();

    const weekHabits = allCompletions[wk];
    if (!weekHabits) break;

    const habitIds = Object.keys(weekHabits);
    if (habitIds.length === 0) break;

    const activeHabits = habitIds.filter(id => !(allBlocked[wk]?.[id]?.[dayIndex] ?? false)).length;
    const checksThatDay = habitIds.filter(id => weekHabits[id][dayIndex]).length;
    const blockedCount = habitIds.length - activeHabits;

    if (activeHabits > 0 && checksThatDay === activeHabits && blockedCount < checksThatDay) {
      perfectStreak++;
      perfCheck.setDate(perfCheck.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    totalChecks,
    totalOpportunities,
    totalDays,
    currentStreak,
    currentStreakSince,
    bestStreak,
    bestStreakStart,
    bestStreakEnd,
    perfectStreak,
    activeDays,
    consistency,
    bestDay:      totalChecks > 0 ? DAY_NAMES[bestDayIndex] : null,
    bestDayRate:  dayRates[bestDayIndex],
    worstDay:     totalChecks > 0 ? DAY_NAMES[worstDayIndex] : null,
    worstDayRate: dayRates[worstDayIndex],
  };
}

// ── Heatmap component ────────────────────────────────────

function Heatmap({ weeks, monthLabels, maxCount, cellSize, gap, theme, isDark }) {
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
                  <Text style={{ fontSize: 11, fontFamily: 'Raleway_700Bold', color: '#f38ba8', letterSpacing: 0.5 }}>
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
                        setTooltip({ iso: day.iso, count: day.count, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: cellSize, height: cellSize, borderRadius: 2,
                      backgroundColor: day.isFuture ? 'transparent' : goldColor(day.count / maxCount, theme, isDark),
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
              <View key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: goldColor(v, theme, isDark) }} />
            ))}
            <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>More</Text>
          </View>
        </View>
      </ScrollView>

      {/* Hover tooltip */}
      {tooltip && (
        <View style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 44,
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

// ── Stat card ────────────────────────────────────────────

function StatCard({ label, value, accent, theme, isMobile }) {
  return (
    <View style={{
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: theme.surface,
      borderRadius: 14, padding: isMobile ? 16 : 20,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      marginBottom: isMobile ? 10 : 0,
    }}>
      <Text style={{
        fontSize: isMobile ? 13 : 10, fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub, letterSpacing: 1, textTransform: 'uppercase',
      }}>
        {label}
      </Text>
      <Text style={{
        fontSize: isMobile ? 24 : 32, fontFamily: 'Raleway_700Bold',
        color: accent || theme.text, marginTop: isMobile ? 0 : 8,
      }}>
        {value}
      </Text>
    </View>
  );
}

// ── Insight card (smaller, for the insights section) ─────

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

// ── Section label ────────────────────────────────────────

function SectionLabel({ text, theme }) {
  return (
    <Text style={{
      fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
      letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14,
    }}>
      {text}
    </Text>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Main You screen ──────────────────────────────────────

export default function You() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  const cellSize  = isMobile ? 11 : 14;
  const gap       = isMobile ? 2  : 3;
  const weekCount = isMobile ? 26 : 53;

  const [user,    setUser]    = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16, paddingVertical: 4, paddingRight: 12 }}
        >
          <Text style={{ color: theme.accent, fontSize: 15, fontFamily: 'Raleway_600SemiBold' }}>
            ← Back
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: { user } }, completions] = await Promise.all([
      supabase.auth.getUser(),
      getAllCompletions(),
    ]);
    setUser(user);
    setHeatmap(buildHeatmap(completions.checks, weekCount));
    setStats(computeStats(completions.checks, completions.blocked));
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [weekCount]));

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular' }}>Loading...</Text>
    </View>
  );

  const { weeks, monthLabels, maxCount } = heatmap;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: isMobile ? 16 : 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <View style={{
          width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
          borderRadius: isMobile ? 22 : 26, backgroundColor: theme.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: theme.accentText, fontSize: isMobile ? 18 : 22, fontFamily: 'Raleway_700Bold' }}>
            {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View>
          <Text style={{ color: theme.text, fontSize: isMobile ? 16 : 18, fontFamily: 'Raleway_600SemiBold', marginBottom: 2 }}>
            {user?.user_metadata?.full_name ?? 'User'}
          </Text>
          <Text style={{ color: theme.textSub, fontSize: 13, fontFamily: 'Raleway_400Regular' }}>
            {user?.email}
          </Text>
        </View>
      </View>

      {/* Compound Map */}
      <View style={{ marginBottom: 28 }}>
        <SectionLabel text="Compound Map" theme={theme} />
        <Heatmap
          weeks={weeks} monthLabels={monthLabels} maxCount={maxCount}
          cellSize={cellSize} gap={gap} theme={theme} isDark={isDark}
        />
      </View>

      {/* Key Stats */}
      <View style={{ marginBottom: 28 }}>
        <SectionLabel text="Key Stats" theme={theme} />
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 12 }}>
          <StatCard label="Total Checks" value={stats.totalChecks} accent={theme.accent} theme={theme} isMobile={isMobile} />
            <InsightCard
              label="Current Streak"
              value={`${stats.currentStreak}d`}
              sub={stats.currentStreakSince ? `since ${fmtDate(stats.currentStreakSince)}` : null}
              accent={stats.currentStreak > 0 ? '#f9e2af' : undefined}
              theme={theme} isMobile={isMobile}
            />
            <InsightCard
              label="Best Streak"
              value={`${stats.bestStreak}d`}
              sub={stats.bestStreakStart ? `${fmtDate(stats.bestStreakStart)} → ${fmtDate(stats.bestStreakEnd)}` : null}
              accent={theme.accent}
              theme={theme} isMobile={isMobile}
            />
          <StatCard label="Current Streak" value={`${stats.currentStreak}d`} accent={stats.currentStreak > 0 ? '#f9e2af' : undefined} theme={theme} isMobile={isMobile} />
          <StatCard label="Best Streak" value={`${stats.bestStreak}d`} accent={theme.accent} theme={theme} isMobile={isMobile} />
        </View>
      </View>

      {/* Insights */}
      <View style={{ marginBottom: 28 }}>
        <SectionLabel text="Insights" theme={theme} />
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10, marginBottom: isMobile ? 0 : 10 }}>
          <InsightCard
            label="Consistency"
            value={`${stats.consistency}%`}
            sub={`${stats.totalChecks} / ${stats.totalOpportunities} checks`}
            accent={stats.consistency >= 70 ? '#a6e3a1' : stats.consistency >= 40 ? '#f9e2af' : theme.delete}
            theme={theme} isMobile={isMobile}
          />
          <InsightCard
            label="Perfect Streak"
            sub="All habits checked, minimal skips"
            value={`${stats.perfectStreak}d`}
            accent={stats.perfectStreak > 0 ? '#f9e2af' : undefined}
            theme={theme} isMobile={isMobile}
          />
        </View>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10 }}>
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
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10, marginTop: isMobile ? 0 : 10 }}>
          <InsightCard
            label="Active Days"
            sub="Days with ≥1 check"
            value={stats.activeDays}
            theme={theme} isMobile={isMobile}
          />
          <InsightCard
            label="Active Days"
            sub={`out of ${stats.totalDays} days tracked`}
            value={stats.activeDays}
            theme={theme} isMobile={isMobile}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}