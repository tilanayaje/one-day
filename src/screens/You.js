import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getAllCompletions, getHabits } from '../db/database';
import { supabase } from '../db/supabase';
import Heatmap from '../components/you/Heatmap';
import StatCard from '../components/you/StatCard';
import InsightCard from '../components/shared/InsightCard';
import SectionLabel from '../components/shared/SectionLabel';
import PreferencesSection from '../components/you/PreferencesSection';


const MOBILE_BREAKPOINT = 768;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


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
      week.push({ iso, count: checksByDate[iso] ?? 0, isFuture: cur > today, isToday: iso === todayIso });
      cur.setDate(cur.getDate() + 1);
    }

    const month = new Date(week[0].iso).getMonth();
    const year  = new Date(week[0].iso).getFullYear();
    if (month !== lastMonth) {
      const lastLabelIndex = monthLabels.length > 0 ? monthLabels[monthLabels.length - 1].weekIndex : -4;
      if (month === 0 || weeks.length - lastLabelIndex >= 3) {
        monthLabels.push({ weekIndex: weeks.length, label: MONTHS[month], year: month === 0 ? year : null });
      }
      lastMonth = month;
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(checksByDate));
  return { weeks, monthLabels, maxCount };
}

// ── Compute all stats ────────────────────────────────────

function computeStats(allCompletions, allBlocked = {}, habits = []) {
  const checksByDate = {};
  const dayOfWeekCounts = Array(7).fill(0);
  const dayOfWeekOpps   = Array(7).fill(0);
  const now = new Date();

  let totalChecks = 0, totalOpportunities = 0, totalDays = 0;

  for (const [weekKey, habitsInWeek] of Object.entries(allCompletions)) {
    const weekStart = new Date(weekKey + 'T00:00:00');
    const habitIds  = Object.keys(habitsInWeek);

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date > now) continue;
      totalDays++;

      let checksThisDay = 0;
      for (const id of habitIds) {
        const isBlocked = allBlocked[weekKey]?.[id]?.[d] ?? false;
        if (!isBlocked) { totalOpportunities++; dayOfWeekOpps[d]++; }
        if (habitsInWeek[id][d]) { checksThisDay++; dayOfWeekCounts[d]++; }
      }

      if (checksThisDay > 0) {
        checksByDate[date.toISOString().split('T')[0]] = checksThisDay;
        totalChecks += checksThisDay;
      }
    }
  }

  const activeDays  = Object.keys(checksByDate).length;
  const consistency = totalOpportunities > 0 ? Math.round((totalChecks / totalOpportunities) * 100) : 0;
  const dayRates    = dayOfWeekCounts.map((c, i) => dayOfWeekOpps[i] > 0 ? Math.round((c / dayOfWeekOpps[i]) * 100) : 0);
  const bestDayIndex  = dayRates.indexOf(Math.max(...dayRates));
  const worstDayIndex = dayRates.indexOf(Math.min(...dayRates));

  const sorted = Object.keys(checksByDate).sort();
  let bestStreak = 0, streak = 0, bestStreakStart = null, bestStreakEnd = null, tempStart = null;

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { streak = 1; tempStart = sorted[i]; }
    else {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      if (diff === 1) { streak++; } else { streak = 1; tempStart = sorted[i]; }
    }
    if (streak > bestStreak) { bestStreak = streak; bestStreakStart = tempStart; bestStreakEnd = sorted[i]; }
  }

  let currentStreak = 0, currentStreakSince = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];
  const check = new Date(today);
  if (!checksByDate[todayIso]) check.setDate(check.getDate() - 1);

  while (true) {
    const iso = check.toISOString().split('T')[0];
    if (checksByDate[iso]) { currentStreak++; currentStreakSince = iso; check.setDate(check.getDate() - 1); }
    else break;
  }

  let perfectStreak = 0;
  const perfCheck = new Date(today);
  if (!checksByDate[perfCheck.toISOString().split('T')[0]]) perfCheck.setDate(perfCheck.getDate() - 1);

  while (true) {
    const iso = perfCheck.toISOString().split('T')[0];
    const weekStart = new Date(perfCheck);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const wk = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const dayIndex   = perfCheck.getDay();
    const weekHabits = allCompletions[wk];
    if (!weekHabits) break;
    const habitIds   = Object.keys(weekHabits);
    if (habitIds.length === 0) break;
    const activeHabits  = habitIds.filter(id => !(allBlocked[wk]?.[id]?.[dayIndex] ?? false)).length;
    const checksThatDay = habitIds.filter(id => weekHabits[id][dayIndex]).length;
    const blockedCount  = habitIds.length - activeHabits;
    if (activeHabits > 0 && checksThatDay === activeHabits && blockedCount < checksThatDay) {
      perfectStreak++;
      perfCheck.setDate(perfCheck.getDate() - 1);
    } else break;
  }

  // Per-habit consistency ranking
  const habitConsistency = habits.map(habit => {
    let checks = 0, opps = 0;
    for (const wk of Object.keys(allCompletions)) {
      const days    = allCompletions[wk][habit.id] ?? Array(7).fill(false);
      const blocked = allBlocked[wk]?.[habit.id]  ?? Array(7).fill(false);
      const weekStart = new Date(wk + 'T00:00:00');
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        if (date > now) continue;
        if (!blocked[d]) opps++;
        if (days[d]) checks++;
      }
    }
    return opps > 0 ? { name: habit.name, consistency: Math.round((checks / opps) * 100) } : null;
  }).filter(Boolean);

  habitConsistency.sort((a, b) => b.consistency - a.consistency);
  const mostConsistent  = habitConsistency.length > 0 ? habitConsistency[0] : null;
  const leastConsistent = habitConsistency.length > 1 ? habitConsistency[habitConsistency.length - 1] : null;

  return {
    totalChecks, totalOpportunities, totalDays, activeDays, consistency,
    currentStreak, currentStreakSince, bestStreak, bestStreakStart, bestStreakEnd,
    perfectStreak,
    bestDay:      totalChecks > 0 ? DAY_NAMES[bestDayIndex] : null,
    bestDayRate:  dayRates[bestDayIndex],
    worstDay:     totalChecks > 0 ? DAY_NAMES[worstDayIndex] : null,
    worstDayRate: dayRates[worstDayIndex],
    mostConsistent,
    leastConsistent,
  };
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeHabitConsistency(habits, allCompletions, allBlocked = {}) {
  const now = new Date();
  const results = [];

  for (const habit of habits) {
    let checks = 0, opps = 0;
    for (const wk of Object.keys(allCompletions)) {
      const days   = allCompletions[wk][habit.id] ?? Array(7).fill(false);
      const blocked = allBlocked[wk]?.[habit.id] ?? Array(7).fill(false);
      const weekStart = new Date(wk + 'T00:00:00');
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        if (date > now) continue;
        if (!blocked[d]) opps++;
        if (days[d]) checks++;
      }
    }
    if (opps > 0) results.push({ name: habit.name, consistency: Math.round((checks / opps) * 100) });
  }

  if (results.length < 2) return { most: null, least: null };
  results.sort((a, b) => b.consistency - a.consistency);
  return { most: results[0], least: results[results.length - 1] };
}

// ── Main You screen ──────────────────────────────────────

export default function You() {
  const { theme, isDark, gridLines, toggleGridLines, editPastWeeks, toggleEditPastWeeks, highlightsPermanent, toggleHighlightsPermanent } = useTheme();
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isMobile   = width < MOBILE_BREAKPOINT;

  const cellSize  = isMobile ? 11 : 14;
  const gap       = isMobile ? 2  : 3;
  const weekCount = isMobile ? 26 : 53;

  const [user,    setUser]    = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);

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
    const [{ data: { user } }, completions, h] = await Promise.all([
      supabase.auth.getUser(),
      getAllCompletions(),
      getHabits(),
    ]);
    setUser(user);
    setHabits(h);
    setHeatmap(buildHeatmap(completions.checks, weekCount));
    setStats(computeStats(completions.checks, completions.blocked, h));
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
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 12 }}>
          <StatCard label="Total Checks" value={stats.totalChecks} accent={theme.accent} theme={theme} isMobile={isMobile} />
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
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10, marginBottom: isMobile ? 0 : 10 }}>
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
          {(stats.mostConsistent || stats.leastConsistent) && (
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 10, marginTop: isMobile ? 0 : 10 }}>
              <InsightCard
                label="Most Consistent"
                value={stats.mostConsistent ? `${stats.mostConsistent.consistency}%` : '—'}
                sub={stats.mostConsistent?.name ?? null}
                accent="#a6e3a1"
                theme={theme} isMobile={isMobile}
              />
              <InsightCard
                label="Least Consistent"
                value={stats.leastConsistent ? `${stats.leastConsistent.consistency}%` : '—'}
                sub={stats.leastConsistent?.name ?? null}
                accent={theme.delete}
                theme={theme} isMobile={isMobile}
              />
            </View>
          )}
        </View>
      
      <PreferencesSection
        theme={theme}
        gridLines={gridLines}
        toggleGridLines={toggleGridLines}
        editPastWeeks={editPastWeeks}
        toggleEditPastWeeks={toggleEditPastWeeks}
        highlightsPermanent={highlightsPermanent}
        toggleHighlightsPermanent={toggleHighlightsPermanent}
        isMobile={isMobile}
      />
      <TouchableOpacity
        onPress={async () => {
          const { data: habits }      = await supabase.from('habits').select('*').order('ord');
          const { data: completions } = await supabase.from('completions').select('*');
          const exportData = { habits, completions, exportedAt: new Date().toISOString() };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href = url; a.download = `one-day-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click(); URL.revokeObjectURL(url);
        }}
        style={{ backgroundColor: theme.accent + '1a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 }}
      >
        <Text style={{ color: theme.accent, fontSize: 14, fontFamily: 'Raleway_600SemiBold' }}>Export Data</Text>
      </TouchableOpacity>

      {/* Import */}
      <TouchableOpacity
        onPress={() => {
          if (!window.confirm('Import will replace ALL current data. Continue?')) return;
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = async (e) => {
            try {
              const file     = e.target.files[0];
              const text     = await file.text();
              const imported = JSON.parse(text);
              if (!imported.habits || !imported.completions) { window.alert('Invalid backup file.'); return; }
              await supabase.from('completions').delete().neq('id', 0);
              await supabase.from('habits').delete().neq('id', 0);
              const habitMap = {};
              for (const h of imported.habits) {
                const { data, error } = await supabase.from('habits')
                  .insert({ name: h.name, perweek: h.perweek, color: h.color, notes: h.notes, ord: h.ord })
                  .select().single();
                if (!error) habitMap[h.id] = data.id;
              }
              const completions = imported.completions
                .filter(c => habitMap[c.habit_id])
                .map(c => ({ habit_id: habitMap[c.habit_id], week_key: c.week_key, day: c.day, checked: c.checked, blocked: c.blocked ?? false }));
              if (completions.length > 0) await supabase.from('completions').insert(completions);
              window.alert(`Imported ${Object.keys(habitMap).length} habits and ${completions.length} completions.`);
              window.location.reload();
            } catch (err) { window.alert('Import failed: ' + err.message); }
          };
          input.click();
        }}
        style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: theme.border }}
      >
        <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Raleway_600SemiBold' }}>Import Data</Text>
      </TouchableOpacity>

      {/* Reset */}
      <TouchableOpacity
        onPress={async () => {
          if (!window.confirm('Delete ALL habits and check-in data? This cannot be undone.')) return;
          if (!window.confirm('Are you absolutely sure? Everything will be permanently deleted.')) return;
          await supabase.from('completions').delete().neq('id', 0);
          await supabase.from('habits').delete().neq('id', 0);
          window.location.reload();
        }}
        style={{ backgroundColor: theme.delete + '1a', borderRadius: 12, padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: theme.delete, fontSize: 14, fontFamily: 'Raleway_600SemiBold' }}>Reset All Data</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}