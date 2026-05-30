import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Modal, ScrollView, useWindowDimensions, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getHabits, addHabit, deleteHabit, updateHabit,
  getWeekData, toggleCompletion, toggleBlock, reorderHabits,
} from '../db/database';
import { getWeekKey } from '../utils/date';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_HABITS = 20;
const MOBILE_BREAKPOINT = 768;

const ROW_COLORS = [
  null,
  '#FF6B6B', '#FF4757', '#FF7F50',
  '#FF9F43', '#FFA502', '#FECA57',
  '#1DD1A1', '#2ED573', '#00CEC9',
  '#48DBFB', '#1E90FF', '#4A90D9',
  '#A29BFE', '#5352ED', '#6C5CE7',
  '#FD79A8', '#FF6EB4', '#B8860B',
];

const EMPTY_FORM = { name: '', goal: '7', color: null, notes: '', error: '' };

// ── Week helpers ──────────────────────────────────────────

function getWeekKeyWithOffset(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  now.setDate(now.getDate() - day);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatWeekRange(weekKey) {
  const start = new Date(weekKey + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function DesktopDayCell({ habitId, dayIndex, state, isToday, isCurrentWeek, onToggle, onBlock, s }) {
  const ref = React.useRef(null);
  const scale = React.useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(0.85);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: false,
    }).start();
  };

  function MobileDayDot({ state, isToday, isCurrentWeek, onToggle, onBlock, dayInitial, s, theme }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const pop = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 80, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: false }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={() => { pop(); onToggle(); }}
      onLongPress={() => { pop(); onBlock(); }}
      disabled={!isCurrentWeek}
      style={[
        s.mobileDayDot,
        isToday && s.mobileDayDotToday,
        state === 'checked' && !isToday && s.mobileDayDotChecked,
        state === 'checked' && isToday && s.mobileDayDotCheckedToday,
        state === 'blocked' && s.mobileDayDotBlocked,
        !isCurrentWeek && { opacity: 0.7 },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === 'blocked' ? (
          <Text style={s.mobileBlockMark}>✕</Text>
        ) : (
          <Text style={[
            s.mobileDayLabel,
            state === 'checked' && !isToday && s.mobileDayLabelChecked,
            state === 'checked' && isToday && { color: '#0d1f0d' },
            state === 'empty' && isToday && { color: theme.todayText },
          ]}>
            {dayInitial}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !isCurrentWeek) return;
    const handler = (e) => { e.preventDefault(); pop(); onBlock(); };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [isCurrentWeek, onBlock]);

  const handlePress = () => { pop(); onToggle(); };

  return (
    <TouchableOpacity
      ref={ref}
      style={[s.dayCell, isToday && s.todayCell, !isCurrentWeek && { opacity: 0.7 }]}
      onPress={handlePress}
      disabled={!isCurrentWeek}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === 'checked' && <Text style={s.checkMark}>✓</Text>}
        {state === 'blocked' && <Text style={s.blockMark}>✕</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

function MobileDayDot({ state, isToday, isCurrentWeek, onToggle, onBlock, dayInitial, s, theme }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(0.85);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => { pop(); onToggle(); }}
      onLongPress={() => { pop(); onBlock(); }}
      disabled={!isCurrentWeek}
      style={[
        s.mobileDayDot,
        isToday && s.mobileDayDotToday,
        state === 'checked' && !isToday && s.mobileDayDotChecked,
        state === 'checked' && isToday && s.mobileDayDotCheckedToday,
        state === 'blocked' && s.mobileDayDotBlocked,
        !isCurrentWeek && { opacity: 0.7 },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === 'blocked' ? (
          <Text style={s.mobileBlockMark}>✕</Text>
        ) : (
          <Text style={[
            s.mobileDayLabel,
            state === 'checked' && !isToday && s.mobileDayLabelChecked,
            state === 'checked' && isToday && { color: '#0d1f0d' },
            state === 'empty' && isToday && { color: theme.todayText },
          ]}>
            {dayInitial}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function HabitTable() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const s = makeStyles(theme);
  const modalModeRef = React.useRef('add');

  const [data, setData] = useState({
    habits: [], thisChecks: {}, thisBlocks: {}, prevChecks: {},
    loading: true, todayIndex: new Date().getDay(), isCurrentWeek: true,
  });
  const { habits, thisChecks, thisBlocks, prevChecks, loading } = data;
  const todayIndex    = data.todayIndex;
  const isCurrentWeek = data.isCurrentWeek;

  const [modal,      setModal]      = useState({ mode: null, habit: null });
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekKey  = getWeekKeyWithOffset(weekOffset);
  const previousWeekKey = getWeekKeyWithOffset(weekOffset - 1);

  const loadData = async (offset, showLoader = false) => {
    const wk   = getWeekKeyWithOffset(offset);
    const prev = getWeekKeyWithOffset(offset - 1);
    if (showLoader) setData(d => ({ ...d, loading: true }));
    const [h, thisD, prevD] = await Promise.all([
      getHabits(), getWeekData(wk), getWeekData(prev),
    ]);
    setData({
      habits: h,
      thisChecks: thisD.checks,
      thisBlocks: thisD.blocks,
      prevChecks: prevD.checks,
      loading: false,
      todayIndex: offset === 0 ? new Date().getDay() : -1,
      isCurrentWeek: offset === 0,
      });
    };

    const firstLoad = React.useRef(true);

    useFocusEffect(useCallback(() => {
      loadData(weekOffset, firstLoad.current);
      firstLoad.current = false;
    }, []));

    useEffect(() => {
      if (!firstLoad.current) loadData(weekOffset);
    }, [weekOffset]);

  // ── Handlers ──────────────────────────────────────────

    const handleToggle = async (habitId, dayIndex) => {
    if (!isCurrentWeek) return;
    const isBlocked = thisBlocks[habitId]?.[dayIndex] ?? false;
    if (isBlocked) {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: d.thisBlocks[habitId].map((v, i) => i === dayIndex ? false : v) },
        thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? true : v) },
      }));
      await toggleCompletion(habitId, currentWeekKey, dayIndex, true);
      return;
    }
    const current = thisChecks[habitId]?.[dayIndex] ?? false;
    setData(d => ({
      ...d,
      thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? !current : v) },
    }));
    await toggleCompletion(habitId, currentWeekKey, dayIndex, !current);
  };

  const handleBlock = async (habitId, dayIndex) => {
    if (!isCurrentWeek) return;
    const isBlocked = thisBlocks[habitId]?.[dayIndex] ?? false;
    if (!isBlocked) {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: (d.thisBlocks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? true : v) },
        thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? false : v) },
      }));
      await toggleBlock(habitId, currentWeekKey, dayIndex, true);
    } else {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: d.thisBlocks[habitId].map((v, i) => i === dayIndex ? false : v) },
      }));
      await toggleBlock(habitId, currentWeekKey, dayIndex, false);
    }
  };

  const openAdd = () => {
    modalModeRef.current = 'add';
    setForm(EMPTY_FORM);
    setModal({ mode: 'add', habit: null });
  };

  const openEdit = (habit) => {
    modalModeRef.current = 'edit';
    setForm({ name: habit.name, goal: String(habit.perweek), color: habit.color ?? null, notes: habit.notes ?? '', error: '' });
    setModal({ mode: 'edit', habit });
  };

  const closeModal = () => setModal({ mode: null, habit: null });
  const setField   = (key, val) => setForm(f => ({ ...f, [key]: val, error: '' }));

  const validate = () => {
    const name = form.name.trim();
    const goal = parseInt(form.goal);
    if (!name)                                                                     return 'Name is required.';
    if (name.length > 50)                                                          return 'Max 50 characters.';
    if (isNaN(goal) || goal < 1 || goal > 7)                                       return 'Goal must be 1–7.';
    if (modal.mode === 'add' && habits.length >= MAX_HABITS)                       return `Max ${MAX_HABITS} habits.`;
    if (habits.some(h => h.id !== modal.habit?.id && h.name.toLowerCase() === name.toLowerCase()))
                                                                                   return 'Name already exists.';
    if (form.notes.length > 1000)                                                  return 'Notes max 1000 characters.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setForm(f => ({ ...f, error: err }));
    const name  = form.name.trim();
    const goal  = parseInt(form.goal);
    const notes = form.notes.trim() || null;
    if (modal.mode === 'add') await addHabit(name, goal, form.color, notes);
    else await updateHabit(modal.habit.id, name, goal, form.color, notes);
    closeModal();
    loadData();
  };

  const handleDelete = async (id) => {
    const habit = habits.find(h => h.id === id);
    if (!window.confirm(`Delete "${habit?.name}"? This cannot be undone.`)) return;
    await deleteHabit(id);
    loadData();
  };

  const moveHabit = async (index, dir) => {
    const next = [...habits];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setData(d => ({ ...d, habits: next }));
    await reorderHabits(next);
  };

  // ── Derived ───────────────────────────────────────────

  const count = (checks, blocks, id) => {
    const c = checks[id] ?? [];
    const b = blocks[id] ?? [];
    return c.filter((v, i) => v && !b[i]).length;
  };

  const totalThis = habits.reduce((sum, h) => sum + count(thisChecks, thisBlocks, h.id), 0);
  const totalPrev = habits.reduce((sum, h) => sum + count(prevChecks, {}, h.id), 0);
  const totalGoal = habits.reduce((sum, h) => sum + h.perweek, 0);

  // ── Week Navigation ───────────────────────────────────

  const WeekNav = (
    <View style={[s.weekNav, isMobile && { marginBottom: 12 }]}>
      <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={s.weekArrow}>
        <Text style={s.weekArrowText}>←</Text>
      </TouchableOpacity>
      <View style={s.weekCenter}>
        <Text style={s.weekRange}>{formatWeekRange(currentWeekKey)}</Text>
        {weekOffset !== 0 && (
          <TouchableOpacity onPress={() => setWeekOffset(0)}>
            <Text style={s.weekTodayBtn}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={() => setWeekOffset(o => o + 1)}
        disabled={weekOffset === 0}
        style={s.weekArrow}
      >
        <Text style={[s.weekArrowText, weekOffset === 0 && { color: theme.border }]}>→</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Day Cell Helper ───────────────────────────────────

  const getDayState = (habitId, dayIndex) => {
    const blocked = thisBlocks[habitId]?.[dayIndex] ?? false;
    const checked = thisChecks[habitId]?.[dayIndex] ?? false;
    if (blocked) return 'blocked';
    if (checked) return 'checked';
    return 'empty';
  };

  // ── Mobile Card ───────────────────────────────────────

  const renderMobileCard = ({ item: habit, index }) => {
    const tw      = count(thisChecks, thisBlocks, habit.id);
    const goalMet = tw >= habit.perweek;

    return (
      <View style={[
        s.mobileCard,
        habit.color && { borderLeftColor: habit.color },
        goalMet && { borderLeftColor: '#f9e2af' },
      ]}>
        <View style={s.mobileCardHeader}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(habit)}>
            <Text style={s.mobileHabitName} numberOfLines={2}>{habit.name}</Text>
            {habit.notes ? <Text style={s.mobileNotePreview} numberOfLines={1}>{habit.notes}</Text> : null}
          </TouchableOpacity>
          <View style={s.mobileCardRight}>
            <Text style={[s.mobileCount, goalMet && { color: '#f9e2af' }]}>
              {tw}<Text style={s.mobileCountGoal}>/{habit.perweek}</Text>
            </Text>
            {isCurrentWeek && (
              <TouchableOpacity onPress={() => handleDelete(habit.id)} style={s.mobileDeleteBtn}>
                <Text style={s.deleteBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={s.mobileDayRow}>
        {DAYS.map((_, i) => {
          const state   = getDayState(habit.id, i);
          const isToday = i === todayIndex;
          return (
            <MobileDayDot
              key={i}
              state={state}
              isToday={isToday}
              isCurrentWeek={isCurrentWeek}
              onToggle={() => handleToggle(habit.id, i)}
              onBlock={() => handleBlock(habit.id, i)}
              dayInitial={DAY_INITIALS[i]}
              s={s}
              theme={theme}
            />
          );
        })}
        </View>

        {isCurrentWeek && (
          <View style={s.mobileOrderRow}>
            <TouchableOpacity onPress={() => moveHabit(index, -1)} disabled={index === 0}>
              <Text style={[s.orderBtn, index === 0 && s.disabledBtn]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveHabit(index, 1)} disabled={index === habits.length - 1}>
              <Text style={[s.orderBtn, index === habits.length - 1 && s.disabledBtn]}>▼</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Desktop Row ───────────────────────────────────────

  const renderDesktopRow = ({ item: habit, index }) => {
    const tw      = count(thisChecks, thisBlocks, habit.id);
    const pw      = count(prevChecks, {}, habit.id);
    const goalMet = tw >= habit.perweek;

    return (
      <View style={[
        s.row,
        habit.color && { borderLeftColor: habit.color },
        goalMet && s.goalMet,
      ]}>
        {isCurrentWeek && (
          <View style={s.orderBtns}>
            <TouchableOpacity onPress={() => moveHabit(index, -1)} disabled={index === 0}>
              <Text style={[s.orderBtn, index === 0 && s.disabledBtn]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveHabit(index, 1)} disabled={index === habits.length - 1}>
              <Text style={[s.orderBtn, index === habits.length - 1 && s.disabledBtn]}>▼</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isCurrentWeek && <View style={s.orderBtns} />}

        <TouchableOpacity style={s.habitCellBtn} onPress={() => openEdit(habit)}>
          <Text style={s.habitCell} numberOfLines={2}>{habit.name}</Text>
          {habit.notes ? <Text style={s.notePreview} numberOfLines={1}>{habit.notes}</Text> : null}
        </TouchableOpacity>

        {DAYS.map((_, i) => {
          const state   = getDayState(habit.id, i);
          const isToday = i === todayIndex;
          return (
            <DesktopDayCell
              key={i}
              habitId={habit.id}
              dayIndex={i}
              state={state}
              isToday={isToday}
              isCurrentWeek={isCurrentWeek}
              onToggle={() => handleToggle(habit.id, i)}
              onBlock={() => handleBlock(habit.id, i)}
              s={s}
            />
          );
        })}

        <Text style={s.statCell}>{tw}</Text>
        <Text style={s.statCell}>{pw}</Text>
        <Text style={s.statCell}>{habit.perweek}</Text>

        {isCurrentWeek ? (
          <TouchableOpacity style={s.actionCell} onPress={() => handleDelete(habit.id)}>
            <Text style={s.deleteBtn}>✕</Text>
          </TouchableOpacity>
        ) : <View style={s.actionCell} />}
      </View>
    );
  };

  if (loading) return (
    <View style={s.center}><Text style={s.muted}>Loading...</Text></View>
  );

  // ── Modal ─────────────────────────────────────────────

  const FormModal = (
    <Modal visible={modal.mode !== null} transparent animationType="fade" onRequestClose={closeModal}>
      <View style={s.modalOverlay}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={[s.modalBox, isMobile && { width: '100%', maxWidth: 420 }]}>
            <Text style={s.modalTitle}>{modalModeRef.current === 'add' ? 'New Habit' : 'Edit Habit'}</Text>

            <Text style={s.modalLabel}>Name</Text>
            <TextInput style={s.input} value={form.name} onChangeText={v => setField('name', v)} placeholder="e.g. Go to gym" placeholderTextColor={theme.textSub} maxLength={50} autoFocus />

            <Text style={s.modalLabel}>Goal (days / week)</Text>
            <TextInput style={[s.input, { width: 100 }]} value={form.goal} onChangeText={v => setField('goal', v)} placeholder="1–7" placeholderTextColor={theme.textSub} keyboardType="numeric" maxLength={1} />

            <Text style={s.modalLabel}>Notes</Text>
            <TextInput style={[s.input, s.notesInput]} value={form.notes} onChangeText={v => setField('notes', v)} placeholder="Optional notes..." placeholderTextColor={theme.textSub} multiline maxLength={1000} />
            <Text style={s.charCount}>{form.notes.length}/1000</Text>

            <Text style={s.modalLabel}>Row Color</Text>
            <View style={s.colorGrid}>
              {ROW_COLORS.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => setField('color', c)} style={[s.colorSwatch, { backgroundColor: c ?? theme.border }, form.color === c && s.colorSwatchSelected]}>
                  {c === null && <Text style={{ color: theme.textSub, fontSize: 10 }}>✕</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {form.error ? <Text style={s.errorText}>{form.error}</Text> : null}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnText}>{modalModeRef.current === 'add' ? 'Add' : 'Save'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={closeModal} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // ── Mobile Layout ─────────────────────────────────────

  if (isMobile) {
    return (
      <View style={[s.container, { padding: 12 }]}>
        {WeekNav}
        <FlatList
          data={habits}
          keyExtractor={item => String(item.id)}
          renderItem={renderMobileCard}
          ListEmptyComponent={<View style={s.emptyState}><Text style={s.emptyText}>No habits yet.</Text></View>}
          ListFooterComponent={
            <>
              <View style={s.mobileSumRow}>
                <Text style={[s.muted, { fontFamily: 'Raleway_600SemiBold' }]}>This week: {totalThis} / {totalGoal}</Text>
                <Text style={s.muted}>Prev week: {totalPrev}</Text>
              </View>
              {isCurrentWeek && habits.length < MAX_HABITS && (
                <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}><Text style={s.addHabitText}>+ Add Habit</Text></TouchableOpacity>
              )}
              <View style={{ height: 40 }} />
            </>
          }
        />
        {FormModal}
      </View>
    );
  }

  // ── Desktop Layout ────────────────────────────────────

  return (
    <View style={s.container}>
      {WeekNav}

      <View style={s.headerRow}>
        <View style={s.orderBtns} />
        <Text style={[s.header, s.habitHeader]}>Habit</Text>
        {DAYS.map((d, i) => (
          <View key={d} style={s.dayCellHeader}>
            <Text style={[s.header, i === todayIndex && s.todayHeader]}>{d}</Text>
          </View>
        ))}
        <Text style={[s.header, s.statCellHeader]}>This Wk</Text>
        <Text style={[s.header, s.statCellHeader]}>Prev Wk</Text>
        <Text style={[s.header, s.statCellHeader]}>Goal</Text>
        <View style={s.actionCell} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={item => String(item.id)}
        renderItem={renderDesktopRow}
        ListEmptyComponent={<View style={s.emptyState}><Text style={s.emptyText}>No habits yet.</Text></View>}
        ListFooterComponent={
          <>
            <View style={[s.row, s.sumRow]}>
              <View style={s.orderBtns} />
              <Text style={[s.habitCellText, s.bold]}>Sum</Text>
              {DAYS.map((_, i) => <View key={i} style={s.dayCell} />)}
              <Text style={[s.statCell, s.bold]}>{totalThis}</Text>
              <Text style={[s.statCell, s.bold]}>{totalPrev}</Text>
              <Text style={[s.statCell, s.bold]}>{totalGoal}</Text>
              <View style={s.actionCell} />
            </View>
            {isCurrentWeek && habits.length < MAX_HABITS && (
              <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}><Text style={s.addHabitText}>+ Add Habit</Text></TouchableOpacity>
            )}
          </>
        }
      />
      {FormModal}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:           { flex: 1, paddingHorizontal: 32, paddingTop: 24, backgroundColor: t.bg },
    center:              { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    muted:               { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 },
    emptyState:          { paddingVertical: 48, alignItems: 'center' },
    emptyText:           { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },

    // ── Week Nav ──
    weekNav:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    weekArrow:           { paddingHorizontal: 16, paddingVertical: 8 },
    weekArrowText:       { fontSize: 20, color: t.accent, fontFamily: 'Raleway_700Bold' },
    weekCenter:          { alignItems: 'center', minWidth: 220 },
    weekRange:           { color: t.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold', letterSpacing: 0.3 },
    weekTodayBtn:        { color: t.accent, fontSize: 12, fontFamily: 'Raleway_600SemiBold', marginTop: 4 },

    // ── Desktop ──
    headerRow:           { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 2, borderColor: t.accent, marginBottom: 2 },
    header:              { color: t.text, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    habitHeader:         { width: 240, paddingHorizontal: 12 },
    dayCellHeader:       { width: 80, alignItems: 'center', justifyContent: 'center' },
    statCellHeader:      { width: 88, textAlign: 'center' },
    todayHeader:         { color: t.todayText },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.border, alignItems: 'center', minHeight: 60, borderLeftWidth: 3, borderLeftColor: 'transparent' },
    goalMet: { borderLeftColor: '#f9e2af' },
    sumRow:              { backgroundColor: t.sumRow, borderTopWidth: 2, borderTopColor: t.border, marginTop: 2 },
    orderBtns:           { width: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
    orderBtn:            { fontSize: 11, color: t.orderBtn, paddingVertical: 2, fontFamily: 'Raleway_400Regular' },
    disabledBtn:         { color: t.border },
    habitCellBtn:        { width: 240, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
    habitCellText:       { width: 240, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontFamily: 'Raleway_400Regular' },
    habitCell:           { color: t.text, fontSize: 14, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular', lineHeight: 20 },
    notePreview:         { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 2, fontStyle: 'italic' },
    dayCell: { width: 80, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
    todayCell:           { backgroundColor: t.today, borderRadius: 6 },
    checkMark:           { fontSize: 20, color: t.checkMark, fontFamily: 'Raleway_700Bold' },
    blockMark:           { fontSize: 18, color: t.delete, fontFamily: 'Raleway_700Bold', opacity: 0.6 },
    statCell:            { width: 88, textAlign: 'center', color: t.text, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    bold:                { fontFamily: 'Raleway_600SemiBold', color: t.text },
    actionCell:          { width: 44, alignItems: 'center' },
    deleteBtn:           { color: t.delete, fontSize: 15, fontFamily: 'Raleway_400Regular' },
    addHabitBtn:         { marginTop: 16, paddingVertical: 12, paddingHorizontal: 4 },
    addHabitText:        { color: t.accent, fontSize: 14, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },

    // ── Mobile ──
    mobileCard: { backgroundColor: t.surface, borderRadius: 14, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: 'transparent' },
    mobileCardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    mobileHabitName:     { color: t.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold', lineHeight: 22, flex: 1 },
    mobileNotePreview:   { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 3, fontStyle: 'italic' },
    mobileCardRight:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 },
    mobileCount:         { fontSize: 18, fontFamily: 'Raleway_700Bold', color: t.accent },
    mobileCountGoal:     { fontSize: 13, fontFamily: 'Raleway_400Regular', color: t.textSub },
    mobileDeleteBtn:     { padding: 4 },
    mobileDayRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    mobileDayDot:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.border, backgroundColor: t.bg },
    mobileDayDotToday:   { borderColor: t.accent, backgroundColor: t.today },
    mobileDayDotChecked: { backgroundColor: t.accent, borderColor: t.accent },
    mobileDayDotCheckedToday: { backgroundColor: '#a6e3a1', borderColor: '#a6e3a1' },
    mobileDayDotBlocked: { backgroundColor: t.surface, borderColor: t.delete, borderStyle: 'dashed' },
    mobileDayLabel:      { fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: t.textSub },
    mobileDayLabelChecked: { color: t.accentText },
    mobileBlockMark:     { fontSize: 14, color: t.delete, fontFamily: 'Raleway_700Bold', opacity: 0.6 },
    mobileOrderRow:      { flexDirection: 'row', gap: 16 },
    mobileSumRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderColor: t.border, marginTop: 8 },

    // ── Modal ──
    modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
    modalBox:            { width: 420, borderRadius: 16, padding: 28, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    modalTitle:          { fontSize: 20, fontFamily: 'Raleway_700Bold', color: t.text, marginBottom: 20, letterSpacing: 0.4 },
    modalLabel:          { fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    modalActions:        { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
    input:               { borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, width: '100%', color: t.text, backgroundColor: t.bg, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    notesInput:          { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    charCount:           { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', textAlign: 'right', marginTop: 4 },
    errorText:           { color: t.error, marginTop: 10, fontSize: 13, fontFamily: 'Raleway_400Regular' },
    saveBtn:             { backgroundColor: t.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    saveBtnText:         { color: t.accentText, fontSize: 14, letterSpacing: 0.5, fontFamily: 'Raleway_600SemiBold' },
    cancelBtn:           { paddingHorizontal: 12 },
    cancelText:          { color: t.textSub, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    colorGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    colorSwatch:         { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorSwatchSelected: { borderColor: t.text, transform: [{ scale: 1.15 }] },
  });
}