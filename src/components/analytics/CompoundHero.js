import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CHART_COLORS } from './HabitFilter';

const PROJ_DAYS = 66;
const RATE_DAYS = 14;

// Keys the tooltip should never surface (internal stacking helpers).
const TOOLTIP_HIDDEN = new Set(['stopNow_stack', 'wedge_stack']);

function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtLong(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildDailyChecks(habits, allCompletions, allBlocked) {
  const result = {};
  for (const [wk, habitsInWeek] of Object.entries(allCompletions)) {
    const weekStart = new Date(wk + 'T00:00:00');
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dayStr = isoDay(date);
      for (const h of habits) {
        if (!habitsInWeek[h.id]?.[d] || allBlocked[wk]?.[h.id]?.[d]) continue;
        if (!result[dayStr]) result[dayStr] = {};
        result[dayStr][h.id] = (result[dayStr][h.id] ?? 0) + 1;
      }
    }
  }
  return result;
}

function computeRates(habits, dayChecks, todayStr) {
  let comb = 0;
  const perH = {};
  for (let i = 0; i < RATE_DAYS; i++) {
    const d = new Date(todayStr + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const counts = dayChecks[isoDay(d)] ?? {};
    for (const h of habits) {
      const c = counts[h.id] ?? 0;
      comb += c;
      perH[h.id] = (perH[h.id] ?? 0) + c;
    }
  }
  return {
    combined: comb / RATE_DAYS,
    perHabit: Object.fromEntries(habits.map(h => [h.id, (perH[h.id] ?? 0) / RATE_DAYS])),
  };
}

function buildSeries(habits, allCompletions, allBlocked, minDate, todayStr, mode) {
  const dayChecks = buildDailyChecks(habits, allCompletions, allBlocked);
  const rates = computeRates(habits, dayChecks, todayStr);

  const projEnd = new Date(todayStr + 'T00:00:00');
  projEnd.setDate(projEnd.getDate() + PROJ_DAYS);
  const projEndStr = isoDay(projEnd);

  // All days: minDate → today+66 (combined) or minDate → today (per-habit)
  const endDate = mode === 'combined' ? projEnd : new Date(todayStr + 'T00:00:00');
  const days = [];
  for (let cur = new Date(minDate + 'T00:00:00'); cur <= endDate; cur.setDate(cur.getDate() + 1)) {
    days.push(isoDay(cur));
  }

  if (mode === 'combined') {
    let total = 0;
    const byDay = {};
    for (const day of days) {
      if (day > todayStr) break;
      for (const h of habits) total += dayChecks[day]?.[h.id] ?? 0;
      byDay[day] = total;
    }
    const currentTotal = byDay[todayStr] ?? total;
    const rate = rates.combined;
    const gap = Math.round(rate * PROJ_DAYS);
    const keepPaceEnd = Math.round(currentTotal + rate * PROJ_DAYS);

    const data = days.map(day => {
      const past = day < todayStr;
      const isToday = day === todayStr;
      const dt = (isToday || past) ? 0
        : (new Date(day + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000;

      if (past) {
        return { day, actual: byDay[day] ?? null, keepPace: null, stopNow: null, stopNow_stack: null, wedge_stack: null };
      }
      if (isToday) {
        // Anchor: all series share this point so the fork visually starts here.
        return { day, actual: currentTotal, keepPace: currentTotal, stopNow: currentTotal, stopNow_stack: currentTotal, wedge_stack: 0 };
      }
      const kp = Math.round(currentTotal + rate * dt);
      return { day, actual: null, keepPace: kp, stopNow: currentTotal, stopNow_stack: currentTotal, wedge_stack: kp - currentTotal };
    });

    return { data, currentTotal, rate, gap, projEndStr, keepPaceEnd };
  }

  // Per-habit: historical only, one line per habit, no projections.
  const runTotals = Object.fromEntries(habits.map(h => [h.id, 0]));
  const byDay = {};
  for (const day of days) {
    for (const h of habits) runTotals[h.id] += dayChecks[day]?.[h.id] ?? 0;
    byDay[day] = { ...runTotals };
  }

  const data = days.map(day => {
    const pt = { day };
    for (const h of habits) pt[`a_${h.id}`] = byDay[day]?.[h.id] ?? null;
    return pt;
  });

  return { data, currentTotal: null, rate: null, gap: null, projEndStr, keepPaceEnd: null };
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function HeroTooltip({ active, payload, habits, mode, theme, todayStr }) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload?.day;
  if (!day) return null;

  const isProjection = day > todayStr;
  const entries = payload.filter(e => !TOOLTIP_HIDDEN.has(String(e.dataKey)) && e.value != null);
  if (!entries.length) return null;

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 10,
      padding: 10, borderWidth: 1, borderColor: theme.border, minWidth: 140,
    }}>
      <Text style={{
        color: theme.textSub, fontSize: 11,
        fontFamily: 'Raleway_600SemiBold', marginBottom: 6,
      }}>
        {fmtShort(day)}{isProjection ? ' — projected' : ''}
      </Text>
      {entries.map((entry, i) => {
        const dk = String(entry.dataKey ?? '');
        let name;
        if (mode === 'combined') {
          if (dk === 'actual') name = 'Total reps';
          else if (dk === 'keepPace') name = 'Keep pace';
          else if (dk === 'stopNow') name = 'Stop now';
          else name = dk;
        } else {
          const hid = dk.replace(/^a_/, '');
          const h = habits.find(x => String(x.id) === hid);
          name = h?.name ?? dk;
        }
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: entry.color }} />
            <Text style={{
              color: theme.textSub, fontSize: 11,
              fontFamily: 'Raleway_400Regular', flex: 1,
            }} numberOfLines={1}>{name}</Text>
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Raleway_700Bold' }}>
              {entry.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompoundHero({ habits, allCompletions, allBlocked, minDate, useHabitColors, theme, isMobile }) {
  const [mode, setMode] = useState('combined');
  const [ready, setReady] = useState(false);
  const todayStr = useMemo(() => isoDay(new Date()), []);

  const { data, gap, projEndStr, keepPaceEnd } = useMemo(() => {
    if (!minDate || !habits.length) {
      return { data: [], gap: null, projEndStr: null, keepPaceEnd: null };
    }
    return buildSeries(habits, allCompletions, allBlocked, minDate, todayStr, mode);
  }, [habits, allCompletions, allBlocked, minDate, todayStr, mode]);

  const tickInterval = useMemo(() => Math.max(1, Math.floor(data.length / 6)), [data.length]);

  // Y-axis: combined mode scales to the keep-pace endpoint so the full fork is visible.
  const yMax = (mode === 'combined' && keepPaceEnd != null)
    ? Math.max(Math.ceil(keepPaceEnd * 1.1), 5)
    : undefined;

  if (!minDate || !habits.length) return null;

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 16,
      padding: isMobile ? 16 : 24, marginBottom: 20,
      borderWidth: 1, borderColor: theme.border,
    }}>
      {/* Header row: title + Combined/Per Habit toggle */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
      }}>
        <Text style={{
          fontSize: 12, fontFamily: 'Raleway_600SemiBold',
          color: theme.textSub, letterSpacing: 1.4, textTransform: 'uppercase',
        }}>
          Cumulative Progress
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['combined', 'per-habit'].map(k => {
            const active = mode === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setMode(k)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderRadius: 8, borderWidth: 1,
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent + '1a' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11, fontFamily: 'Raleway_600SemiBold',
                  color: active ? theme.accent : theme.textSub,
                }}>
                  {k === 'combined' ? 'Combined' : 'Per Habit'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Dynamic caption — combined mode, only when there's a meaningful gap */}
      {mode === 'combined' && gap != null && gap > 0 && projEndStr && (
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4,
          marginBottom: 14, paddingHorizontal: 10, paddingVertical: 8,
          backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
          borderRadius: 8,
        }}>
          <Text style={{ fontSize: 11, fontFamily: 'Raleway_400Regular', color: theme.textSub }}>
            Hold your pace →
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Raleway_700Bold', color: theme.text }}>
            ≈{gap} more reps
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Raleway_400Regular', color: theme.textSub }}>
            by {fmtLong(projEndStr)} than stopping today.
          </Text>
        </View>
      )}

      {/* Chart */}
      <View
        style={{ height: isMobile ? 220 : 300, minWidth: 0 }}
        onLayout={e => { if (e.nativeEvent.layout.width > 0) setReady(true); }}
      >
        {ready && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="heroActualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis
                dataKey="day"
                tickFormatter={fmtShort}
                tick={{ fill: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}
                tickLine={false}
                axisLine={{ stroke: theme.border }}
                interval={tickInterval}
              />
              <YAxis
                domain={yMax ? [0, yMax] : [0, 'auto']}
                tick={{ fill: theme.textSub, fontSize: 10, fontFamily: 'Raleway_400Regular' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<HeroTooltip habits={habits} mode={mode} theme={theme} todayStr={todayStr} />}
                cursor={{ stroke: theme.border, strokeWidth: 1 }}
              />
              {/* Faint vertical line marking where the fork begins */}
              <ReferenceLine
                x={todayStr}
                stroke={theme.textSub}
                strokeOpacity={0.3}
                strokeDasharray="4 3"
              />

              {mode === 'combined' ? (
                <>
                  {/*
                    Wedge fill between the two projection lines.
                    Strategy: two stacked Areas sharing stackId="wedge".
                    - stopNow_stack (transparent): invisible base at currentTotal.
                    - wedge_stack (accent fill): sits on top of the base, height = keepPace − stopNow.
                    Result: fill is only visible in the band between stopNow and keepPace.
                    Grid lines show through because the fill is semi-transparent.
                  */}
                  <Area
                    type="monotone"
                    dataKey="stopNow_stack"
                    stackId="wedge"
                    fill="transparent"
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="wedge_stack"
                    stackId="wedge"
                    fill={theme.accent}
                    fillOpacity={0.12}
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />

                  {/* Real cumulative climb: thick solid line + gradient fill. */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    fill="url(#heroActualGrad)"
                    stroke={theme.accent}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: theme.accent, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />

                  {/* Keep-pace projection: dashed accent, same color as the real line. */}
                  <Line
                    type="monotone"
                    dataKey="keepPace"
                    stroke={theme.accent}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeOpacity={0.75}
                    dot={false}
                    activeDot={{ r: 3, fill: theme.accent, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />

                  {/* Stop-now flat line: dashed muted, visually distinct from keep-pace. */}
                  <Line
                    type="monotone"
                    dataKey="stopNow"
                    stroke={theme.textSub}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    strokeOpacity={0.5}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </>
              ) : (
                // Per-habit: one solid line per habit, historical only, no projections.
                habits.map((h, idx) => {
                  const color = useHabitColors
                    ? (h.color ?? CHART_COLORS[idx % CHART_COLORS.length])
                    : CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <Line
                      key={h.id}
                      type="monotone"
                      dataKey={`a_${h.id}`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  );
                })
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}
