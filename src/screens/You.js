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
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function goldColor(intensity, theme, isDark) {
  if (intensity === 0) return theme.border;
  if (isDark) {
    if (intensity <= 0.25) return '#2a2210';
    if (intensity <= 0.50) return '#4d3d18';
    if (intensity <= 0.75) return '#8a6d25';
    return '#d4a83a';
  } else {
    if (intensity <= 0.25) return '#f0e6c8';
    if (intensity <= 0.50) return '#dcc078';
    if (intensity <= 0.75) return '#c49a30';
    return '#9a7a18';
  }
}

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
    const month = new Date(week[0].iso).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: weeks.length, label: MONTHS[month] });
      lastMonth = month;
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(checksByDate));
  return { weeks, monthLabels, maxCount };
}

function computeStats(allCompletions) {
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

  const totalChecks = Object.values(checksByDate).reduce((s, c) => s + c, 0);
  const sorted = Object.keys(checksByDate).sort();

  let bestStreak = 0, streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { streak = 1; }
    else {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    if (streak > bestStreak) bestStreak = streak;
  }

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(today);
  while (true) {
    const iso = check.toISOString().split('T')[0];
    if (checksByDate[iso]) { currentStreak++; check.setDate(check.getDate() - 1); }
    else break;
  }

  return { totalChecks, currentStreak, bestStreak };
}

function Heatmap({ weeks, monthLabels, maxCount, cellSize, gap, theme, isDark }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ height: 18, position: 'relative', marginBottom: 4 }}>
            {monthLabels.map(({ weekIndex, label }) => (
              <Text
                key={label + weekIndex}
                style={{
                  position: 'absolute',
                  left: weekIndex * (cellSize + gap) + 18,
                  fontSize: 10,
                  fontFamily: 'Raleway_400Regular',
                  color: theme.textSub,
                }}
              >
                {label}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap }}>
            <View style={{ gap, marginRight: 4, justifyContent: 'space-around' }}>
              {DAYS_SHORT.map((d, i) => (
                <View key={i} style={{ height: cellSize, justifyContent: 'center' }}>
                  {i % 2 === 1 && (
                    <Text style={{ color: theme.textSub, fontSize: 9, fontFamily: 'Raleway_400Regular' }}>
                      {d}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {weeks.map((week, wi) => (
              <View key={wi} style={{ gap }}>
                {week.map((day, di) => (
                  <View
                    key={di}
                    onMouseEnter={(e) => {
                      if (!day.isFuture) {
                        setTooltip({
                          iso: day.iso,
                          count: day.count,
                          x: e.nativeEvent.pageX,
                          y: e.nativeEvent.pageY,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 2,
                      backgroundColor: day.isFuture
                        ? 'transparent'
                        : goldColor(day.count / maxCount, theme, isDark),
                      borderWidth: day.isToday ? 1.5 : 0,
                      borderColor: theme.accent,
                      cursor: day.isFuture ? 'default' : 'pointer',
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>Less</Text>
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <View key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: goldColor(v, theme, isDark) }} />
            ))}
            <Text style={{ color: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}>More</Text>
          </View>
        </View>
      </ScrollView>

      {tooltip && (
        <View
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 44,
            backgroundColor: theme.surface,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: theme.border,
            zIndex: 999,
            pointerEvents: 'none',
          }}
        >
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

function StatCard({ label, value, accent, theme, isMobile }) {
  return (
    <View style={{
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: isMobile ? 16 : 20,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      marginBottom: isMobile ? 10 : 0,
    }}>
      <Text style={{
        fontSize: isMobile ? 13 : 10,
        fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {label}
      </Text>
      <Text style={{
        fontSize: isMobile ? 24 : 32,
        fontFamily: 'Raleway_700Bold',
        color: accent || theme.text,
        marginTop: isMobile ? 0 : 8,
      }}>
        {value}
      </Text>
    </View>
  );
}

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
    setHeatmap(buildHeatmap(completions, weekCount));
    setStats(computeStats(completions));
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
          width: isMobile ? 44 : 52,
          height: isMobile ? 44 : 52,
          borderRadius: isMobile ? 22 : 26,
          backgroundColor: theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
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
        <Text style={{
          fontSize: 11,
          fontFamily: 'Raleway_600SemiBold',
          color: theme.textSub,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          Compound Map
        </Text>
        <Heatmap
          weeks={weeks}
          monthLabels={monthLabels}
          maxCount={maxCount}
          cellSize={cellSize}
          gap={gap}
          theme={theme}
          isDark={isDark}
        />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 12 }}>
        <StatCard label="Total Checks" value={stats.totalChecks} accent={theme.accent} theme={theme} isMobile={isMobile} />
        <StatCard label="Current Streak" value={`${stats.currentStreak}d`} accent={stats.currentStreak > 0 ? '#f9e2af' : undefined} theme={theme} isMobile={isMobile} />
        <StatCard label="Best Streak" value={`${stats.bestStreak}d`} accent={theme.accent} theme={theme} isMobile={isMobile} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}