import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { resolveRange } from './RangeSelector';
import { CHART_COLORS } from './HabitFilter';

const LABEL_W = 90;
const ROW_H   = 28;
const ROW_GAP = 8;
const BAR_H   = 16;
const BAR_TOP = 6;

function ppd(totalDays) {
  if (totalDays <= 90)  return 10;
  if (totalDays <= 365) return 5;
  return 3;
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeStreaks(habit, allCompletions, allBlocked, from, totalDays) {
  const streaks = [];
  let streakStart = null;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);

  for (let i = 0; i < totalDays; i++) {
    const weekKey = getWeekKey(cur);
    const dow     = cur.getDay();
    const checked = allCompletions[weekKey]?.[String(habit.id)]?.[dow] ?? false;
    const blocked = allBlocked[weekKey]?.[String(habit.id)]?.[dow]    ?? false;

    if (checked && !blocked) {
      if (streakStart === null) streakStart = i;
    } else if (streakStart !== null) {
      const startDate = new Date(from); startDate.setDate(startDate.getDate() + streakStart);
      const endDate   = new Date(from); endDate.setDate(endDate.getDate() + i - 1);
      streaks.push({
        startDay: streakStart, lengthDays: i - streakStart,
        startDate: startDate.toISOString().split('T')[0],
        endDate:   endDate.toISOString().split('T')[0],
      });
      streakStart = null;
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (streakStart !== null) {
    const startDate = new Date(from); startDate.setDate(startDate.getDate() + streakStart);
    const endDate   = new Date(from); endDate.setDate(endDate.getDate() + totalDays - 1);
    streaks.push({
      startDay: streakStart, lengthDays: totalDays - streakStart,
      startDate: startDate.toISOString().split('T')[0],
      endDate:   endDate.toISOString().split('T')[0],
    });
  }
  return streaks;
}

export default function StreakTimeline({ habits, activeIds, allCompletions, allBlocked, rangeKey, customFrom, customTo, useHabitColors, theme, isMobile, minDate }) {
  const { from, totalDays } = useMemo(() => {
    const { from: f, to: t } = resolveRange(rangeKey, customFrom, customTo);
    f.setHours(0, 0, 0, 0);
    const effectiveFrom = (rangeKey === 'all' && minDate)
      ? new Date(Math.max(f.getTime(), new Date(minDate + 'T00:00:00').getTime()))
      : f;
    return { from: effectiveFrom, totalDays: Math.max(1, Math.ceil((t - effectiveFrom) / 86400000)) };
  }, [rangeKey, customFrom, customTo, minDate]);

  const [containerWidth, setContainerWidth] = React.useState(0);
  const [tooltip, setTooltip] = React.useState(null);
  const pxPerDay = containerWidth > 0 ? Math.max(ppd(totalDays), Math.floor((containerWidth) / totalDays)) : ppd(totalDays);
  const timelineWidth = Math.max(containerWidth, totalDays * pxPerDay);

  const activeIdsKey = [...activeIds].join(',');

  const rows = useMemo(() => {
    const activeHabits = habits.filter(h => activeIds.has(String(h.id)) || activeIds.has(h.id));
    return activeHabits.map((habit, idx) => ({
      habit, idx,
      streaks: computeStreaks(habit, allCompletions, allBlocked, from, totalDays),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, activeIdsKey, allCompletions, allBlocked, from, totalDays]);

  const axisTicks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const dayOff = Math.min(Math.round(pct * totalDays), totalDays - 1);
    const d = new Date(from); d.setDate(d.getDate() + dayOff);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      left: dayOff * pxPerDay,
    };
  }), [from, totalDays, pxPerDay]);

  const hasStreaks = rows.some(r => r.streaks.length > 0);

  if (containerWidth === 0) return <View style={{ flex: 1, height: 200 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} />;
  if (!hasStreaks) {
    return (
      <View style={{ marginTop: 12, alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 }}>
          No streaks in this range.
        </Text>
      </View>
    );
  }

  return (
    <>
    <View style={{ flexDirection: 'row', marginTop: 12 }}>
      {/* Label column */}
      <View style={{ width: LABEL_W }}>
        {rows.map(({ habit }, i) => (
          <View
            key={habit.id}
            style={{ height: ROW_H, marginBottom: i < rows.length - 1 ? ROW_GAP : 0, justifyContent: 'center' }}
          >
            <Text
              style={{ fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: theme.textSub }}
              numberOfLines={1}
            >
              {habit.name.length > 10 ? habit.name.slice(0, 10) + '...' : habit.name}
            </Text>
          </View>
        ))}
        <View style={{ height: 24 }} />
      </View>

      {/* Scrollable timeline */}
      <View style={{ flex: 1 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
        <View style={{ width: timelineWidth }}>
          {rows.map(({ habit, idx, streaks }, i) => {
            const color = useHabitColors
              ? (habit.color ?? CHART_COLORS[idx % CHART_COLORS.length])
              : CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <View
                key={habit.id}
                style={{ height: ROW_H, marginBottom: i < rows.length - 1 ? ROW_GAP : 0, position: 'relative' }}
              >
                {/* Baseline */}
                <View style={{
                  position: 'absolute', top: ROW_H / 2,
                  left: 0, width: timelineWidth, height: 1,
                  backgroundColor: theme.border,
                }} />
                {/* Streak bars */}
                {streaks.map((s, si) => (
                  <View
                    key={si}
                    onMouseEnter={(e) => setTooltip({
                      label: `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}`,
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      position: 'absolute',
                      top: BAR_TOP,
                      left: s.startDay * pxPerDay,
                      width: Math.max(pxPerDay, s.lengthDays * pxPerDay),
                      height: BAR_H,
                      borderRadius: 4,
                      backgroundColor: color,
                    }}
                  />
                ))}
              </View>
            );
          })}

          {/* X-axis */}
          <View style={{ height: 24, position: 'relative' }}>
            {axisTicks.map((tick, i) => (
              <Text
                key={i}
                style={{
                  position: 'absolute',
                  left: tick.left,
                  top: 4,
                  fontSize: 9,
                  fontFamily: 'Raleway_400Regular',
                  color: theme.textSub,
                  transform: [{ translateX: -16 }],
                }}
              >
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
    </View>
    {tooltip && (
      <View style={{
        position: 'fixed', left: tooltip.x - 60, top: tooltip.y - 56,
        backgroundColor: theme.surface, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: theme.border,
        zIndex: 999, pointerEvents: 'none',
      }}>
        <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Raleway_600SemiBold' }}>
          {tooltip.label}
        </Text>
      </View>
    )}
    </>
  );
}
