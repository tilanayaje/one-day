import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from './HabitFilter';
import { resolveRange } from './RangeSelector';

function getGranularity(from, to) {
  const days = (to - from) / 86400000;
  if (days <= 14)  return 'day';
  if (days <= 112) return 'week';
  return 'month';
}

function getBucketKey(date, granularity) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (granularity === 'day') return `${y}-${m}-${d}`;
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
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return new Date(key + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildData(habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo) {
  const { from, to } = resolveRange(rangeKey, customFrom, customTo);
  const granularity = getGranularity(from, to);
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
        if (allBlocked[weekKey]?.[habit.id]?.[d]) continue;
        if (habitsInWeek[habit.id]?.[d]) {
          buckets[bucket][habit.id] = (buckets[bucket][habit.id] ?? 0) + 1;
        }
      }
    }
  }

  const sortedKeys = Object.keys(buckets).sort();
  const data = sortedKeys.map(key => ({
    label: formatLabel(key, granularity),
    ...habits.reduce((acc, h) => {
      if (activeIds.has(h.id)) acc[h.id] = buckets[key][h.id] ?? 0;
      return acc;
    }, {}),
  }));

  return { data, bucketCount: sortedKeys.length };
}

function CustomTooltip({ active, payload, label, habits, theme }) {
  if (!active || !payload?.length) return null;
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
        if (!habit || !entry.value) return null;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: entry.fill }} />
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

export default function StackedBarChart({ habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, useHabitColors, theme, isMobile }) {
  const { data, bucketCount } = useMemo(
    () => buildData(habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo),
    [habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo],
  );

  if (!data || data.length === 0) return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
      <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 }}>
        No data for this range.
      </Text>
    </View>
  );

  const activeHabits = habits.filter(h => activeIds.has(h.id));
  const chartHeight = isMobile ? 240 : 320;
  const needsScroll = bucketCount > 16;
  const BAR_W = 44;

  const axisTickStyle = { fill: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' };
  const gridProps   = { strokeDasharray: '3 3', stroke: theme.border };
  const xAxisProps  = { dataKey: 'label', tick: axisTickStyle, tickLine: false, axisLine: { stroke: theme.border } };
  const yAxisProps  = { tick: axisTickStyle, tickLine: false, axisLine: false, allowDecimals: false };
  const tooltipEl   = <Tooltip content={<CustomTooltip habits={habits} theme={theme} />} cursor={{ fill: theme.border, opacity: 0.3 }} />;

  const bars = activeHabits.map((habit, index) => {
    const color = useHabitColors
      ? (habit.color ?? CHART_COLORS[index % CHART_COLORS.length])
      : CHART_COLORS[index % CHART_COLORS.length];
    return (
      <Bar
        key={habit.id}
        dataKey={String(habit.id)}
        name={habit.name}
        stackId="a"
        fill={color}
        isAnimationActive={false}
      />
    );
  });

  if (needsScroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <BarChart
          width={bucketCount * BAR_W}
          height={chartHeight}
          data={data}
          margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} interval={0} />
          <YAxis {...yAxisProps} />
          {tooltipEl}
          {bars}
        </BarChart>
      </ScrollView>
    );
  }

  return (
    <View style={{ height: chartHeight, marginBottom: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps} interval="preserveStartEnd" />
          <YAxis {...yAxisProps} />
          {tooltipEl}
          {bars}
        </BarChart>
      </ResponsiveContainer>
    </View>
  );
}
