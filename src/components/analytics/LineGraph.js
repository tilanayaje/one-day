import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from './HabitFilter';
import { resolveRange } from './RangeSelector';

// ── Granularity ──────────────────────────────────────────

function getGranularity(from, to) {
  const days = (to - from) / 86400000;
  if (days <= 14)  return 'day';
  if (days <= 112) return 'week'; // 16 weeks
  return 'month';
}

function getBucketKey(date, granularity) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (granularity === 'day')   return `${y}-${m}-${d}`;
  if (granularity === 'week') {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  }
  return `${y}-${m}`;
}

function formatLabel(key, granularity) {
  if (granularity === 'month') {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  if (granularity === 'week') {
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Build chart data ─────────────────────────────────────

function buildChartData(habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, cumulative) {
  const { from, to } = resolveRange(rangeKey, customFrom, customTo);
  const granularity  = getGranularity(from, to);

  // bucket key → { habitId → count }
  const buckets = {};

  for (const [weekKey, habitsInWeek] of Object.entries(allCompletions)) {
    const weekStart = new Date(weekKey + 'T00:00:00');

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date < from || date > to) continue;

      const bucket = getBucketKey(date, granularity);
      if (!buckets[bucket]) buckets[bucket] = {};

      for (const habit of habits) {
        if (!activeIds.has(habit.id)) continue;
        const isBlocked = allBlocked[weekKey]?.[habit.id]?.[d] ?? false;
        const checked   = habitsInWeek[habit.id]?.[d] ?? false;
        if (!isBlocked && checked) {
          buckets[bucket][habit.id] = (buckets[bucket][habit.id] ?? 0) + 1;
        }
      }
    }
  }

  const sortedKeys = Object.keys(buckets).sort();

  if (cumulative) {
    // Running totals — each point adds to the previous
    const runningTotals = {};
    return sortedKeys.map(key => {
      for (const habit of habits) {
        if (!activeIds.has(habit.id)) continue;
        runningTotals[habit.id] = (runningTotals[habit.id] ?? 0) + (buckets[key][habit.id] ?? 0);
      }
      return {
        label: formatLabel(key, granularity),
        key,
        ...habits.reduce((acc, h) => {
          acc[h.id] = activeIds.has(h.id) ? (runningTotals[h.id] ?? 0) : undefined;
          return acc;
        }, {}),
      };
    });
  }

  // Frequency — checks per bucket
  return sortedKeys.map(key => ({
    label: formatLabel(key, granularity),
    key,
    ...habits.reduce((acc, h) => {
      acc[h.id] = activeIds.has(h.id) ? (buckets[key][h.id] ?? 0) : undefined;
      return acc;
    }, {}),
  }));
}

// ── Custom tooltip ───────────────────────────────────────

function CustomTooltip({ active, payload, label, habits, activeIds, useHabitColors, theme }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 10,
      padding: 12, borderWidth: 1, borderColor: theme.border, minWidth: 140,
    }}>
      <Text style={{ color: theme.textSub, fontSize: 11, fontFamily: 'Raleway_600SemiBold', marginBottom: 6 }}>
        {label}
      </Text>
      {payload.map((entry, i) => {
        const habit = habits.find(h => String(h.id) === String(entry.dataKey));
        if (!habit) return null;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: entry.color }} />
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Raleway_400Regular', flex: 1 }} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Raleway_700Bold' }}>
              {entry.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main component ───────────────────────────────────────

export default function LineGraph({ habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, useHabitColors, cumulative, theme, isMobile }) {
  const data = useMemo(() => buildChartData(
  habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, cumulative
), [habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, cumulative]);

  if (!data || data.length === 0) return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
      <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 }}>
        No data for this range.
      </Text>
    </View>
  );

  const activeHabits = habits.filter(h => activeIds.has(h.id));

  return (
    <View style={{ height: isMobile ? 220 : 300, marginBottom: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
          <XAxis
            dataKey="label"
            tick={{ fill: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}
            tickLine={false}
            axisLine={{ stroke: theme.border }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip habits={habits} activeIds={activeIds} useHabitColors={useHabitColors} theme={theme} />}
            cursor={{ stroke: theme.border, strokeWidth: 1 }}
          />
          {activeHabits.map((habit, index) => {
            const color = useHabitColors
              ? (habit.color ?? CHART_COLORS[index % CHART_COLORS.length])
              : CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Line
                key={habit.id}
                type="monotone"
                dataKey={String(habit.id)}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </View>
  );
}