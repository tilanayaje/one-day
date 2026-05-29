import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, StyleSheet, FlatList, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getHabits, addHabit, deleteHabit, updateHabit,
  getCompletionsForWeek, toggleCompletion, reorderHabits,
} from '../db/database';
import { getWeekKey, getLastWeekKey } from '../utils/date';

const DAYS      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_HABITS = 20;
const ROW_COLORS = [null, '#FF6B6B', '#FF9F43', '#FECA57', '#1DD1A1', '#48DBFB', '#A29BFE', '#FD79A8'];

const EMPTY_FORM = { name: '', goal: '7', color: null, error: '' };

export default function HabitTable() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [habits,      setHabits]      = useState([]);
  const [thisWeek,    setThisWeek]    = useState({});
  const [lastWeek,    setLastWeek]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Unified modal state — mode: null | 'add' | 'edit'
  const [modal,     setModal]     = useState({ mode: null, habit: null });
  const [form,      setForm]      = useState(EMPTY_FORM);

  // Week keys computed fresh on each focus
  const [weekKeys, setWeekKeys] = useState({ this: getWeekKey(), last: getLastWeekKey(), today: new Date().getDay() });

  const loadData = async () => {
    if (initialLoad) setLoading(true);
    const wk = { this: getWeekKey(), last: getLastWeekKey(), today: new Date().getDay() };
    setWeekKeys(wk);
    const [h, tw, lw] = await Promise.all([
      getHabits(),
      getCompletionsForWeek(wk.this),
      getCompletionsForWeek(wk.last),
    ]);
    setHabits(h);
    setThisWeek(tw);
    setLastWeek(lw);
    setLoading(false);
    setInitialLoad(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // ── Handlers ──────────────────────────────────────────────

  const handleToggle = async (habitId, dayIndex) => {
    const current = thisWeek[habitId]?.[dayIndex] ?? false;
    const updated  = { ...thisWeek, [habitId]: [...(thisWeek[habitId] ?? Array(7).fill(false))] };
    updated[habitId][dayIndex] = !current;
    setThisWeek(updated);
    await toggleCompletion(habitId, weekKeys.this, dayIndex, !current);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add', habit: null });
  };

  const openEdit = (habit) => {
    setForm({ name: habit.name, goal: String(habit.perweek), color: habit.color ?? null, error: '' });
    setModal({ mode: 'edit', habit });
  };

  const closeModal = () => setModal({ mode: null, habit: null });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val, error: '' }));

  const validate = () => {
    const name = form.name.trim();
    const goal = parseInt(form.goal);
    if (!name)                                      return 'Habit name is required.';
    if (name.length > 50)                           return 'Max 50 characters.';
    if (isNaN(goal) || goal < 1 || goal > 7)        return 'Goal must be between 1 and 7.';
    if (modal.mode === 'add' && habits.length >= MAX_HABITS)
                                                    return `Max ${MAX_HABITS} habits.`;
    if (habits.some(h => h.id !== modal.habit?.id && h.name.toLowerCase() === name.toLowerCase()))
                                                    return 'A habit with that name already exists.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setForm(f => ({ ...f, error: err }));
    const name = form.name.trim();
    const goal = parseInt(form.goal);
    if (modal.mode === 'add') {
      await addHabit(name, goal, form.color);
    } else {
      await updateHabit(modal.habit.id, name, goal, form.color);
    }
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
    setHabits(next);
    await reorderHabits(next);
  };

  // ── Derived ───────────────────────────────────────────────

  const count = (completions, id) => (completions[id] ?? []).filter(Boolean).length;
  const totalThis = habits.reduce((sum, h) => sum + count(thisWeek, h.id), 0);
  const totalLast = habits.reduce((sum, h) => sum + count(lastWeek, h.id), 0);
  const totalGoal = habits.reduce((sum, h) => sum + h.perweek, 0);

  // ── Render ────────────────────────────────────────────────

  const renderHabit = ({ item: habit, index }) => {
    const tw      = count(thisWeek, habit.id);
    const lw      = count(lastWeek, habit.id);
    const goalMet = tw >= habit.perweek;

    return (
      <View style={[
        s.row,
        habit.color && { backgroundColor: habit.color + theme.rowColorOpacity },
        goalMet && s.goalMet,
      ]}>
        <View style={s.orderBtns}>
          <TouchableOpacity onPress={() => moveHabit(index, -1)} disabled={index === 0}>
            <Text style={[s.orderBtn, index === 0 && s.disabledBtn]}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => moveHabit(index, 1)} disabled={index === habits.length - 1}>
            <Text style={[s.orderBtn, index === habits.length - 1 && s.disabledBtn]}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.habitCellBtn} onPress={() => openEdit(habit)}>
          <Text style={s.habitCell} numberOfLines={2}>{habit.name}</Text>
        </TouchableOpacity>

        {DAYS.map((_, i) => {
          const checked = thisWeek[habit.id]?.[i] ?? false;
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayCell, i === weekKeys.today && s.todayCell]}
              onPress={() => handleToggle(habit.id, i)}
            >
              {checked && <Text style={s.checkMark}>✓</Text>}
            </TouchableOpacity>
          );
        })}

        <Text style={s.statCell}>{tw}</Text>
        <Text style={s.statCell}>{lw}</Text>
        <Text style={s.statCell}>{habit.perweek}</Text>

        <TouchableOpacity style={s.actionCell} onPress={() => handleDelete(habit.id)}>
          <Text style={s.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return (
    <View style={s.center}>
      <Text style={s.muted}>Loading...</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.orderBtns} />
        <Text style={[s.header, s.habitHeader]}>Habit</Text>
        {DAYS.map((d, i) => (
          <View key={d} style={s.dayCellHeader}>
            <Text style={[s.header, i === weekKeys.today && s.todayHeader]}>{d}</Text>
          </View>
        ))}
        <Text style={[s.header, s.statCellHeader]}>This Wk</Text>
        <Text style={[s.header, s.statCellHeader]}>Last Wk</Text>
        <Text style={[s.header, s.statCellHeader]}>Goal</Text>
        <View style={s.actionCell} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={item => String(item.id)}
        renderItem={renderHabit}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyText}>No habits yet. Add one below.</Text>
          </View>
        }
        ListFooterComponent={
          <>
            {/* Sum Row */}
            <View style={[s.row, s.sumRow]}>
              <View style={s.orderBtns} />
              <Text style={[s.habitCellText, s.bold]}>Sum</Text>
              {DAYS.map((_, i) => <View key={i} style={s.dayCell} />)}
              <Text style={[s.statCell, s.bold]}>{totalThis}</Text>
              <Text style={[s.statCell, s.bold]}>{totalLast}</Text>
              <Text style={[s.statCell, s.bold]}>{totalGoal}</Text>
              <View style={s.actionCell} />
            </View>

            {/* Add */}
            {habits.length < MAX_HABITS && (
              <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}>
                <Text style={s.addHabitText}>+ Add Habit</Text>
              </TouchableOpacity>
            )}
          </>
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={modal.mode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {modal.mode === 'add' ? 'New Habit' : 'Edit Habit'}
            </Text>

            <Text style={s.modalLabel}>Name</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => setField('name', v)}
              placeholder="e.g. Go to gym"
              placeholderTextColor={theme.textSub}
              maxLength={50}
              autoFocus
            />

            <Text style={s.modalLabel}>Goal (days / week)</Text>
            <TextInput
              style={[s.input, s.goalInput]}
              value={form.goal}
              onChangeText={v => setField('goal', v)}
              placeholder="1–7"
              placeholderTextColor={theme.textSub}
              keyboardType="numeric"
              maxLength={1}
            />

            <Text style={s.modalLabel}>Row Color</Text>
            <View style={s.colorRow}>
              {ROW_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setField('color', c)}
                  style={[
                    s.colorSwatch,
                    { backgroundColor: c ?? theme.border },
                    form.color === c && s.colorSwatchSelected,
                  ]}
                >
                  {c === null && <Text style={{ color: theme.textSub, fontSize: 10 }}>✕</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {form.error ? <Text style={s.errorText}>{form.error}</Text> : null}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>{modal.mode === 'add' ? 'Add' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeModal} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:           { flex: 1, paddingHorizontal: 32, paddingTop: 24, backgroundColor: t.bg },
    center:              { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    muted:               { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },

    // Table
    headerRow:           { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 2, borderColor: t.accent, marginBottom: 2 },
    header:              { color: t.text, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    habitHeader:         { width: 240, paddingHorizontal: 12 },
    dayCellHeader:       { width: 80, alignItems: 'center', justifyContent: 'center' },
    statCellHeader:      { width: 88, textAlign: 'center' },
    todayHeader:         { color: t.todayText },

    row:                 { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.border, alignItems: 'center', minHeight: 60 },
    goalMet:             { borderLeftWidth: 3, borderLeftColor: '#f9e2af' },
    sumRow:              { backgroundColor: t.sumRow, borderTopWidth: 2, borderTopColor: t.border, marginTop: 2 },
    emptyState:          { paddingVertical: 48, alignItems: 'center' },
    emptyText:           { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },

    orderBtns:           { width: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
    orderBtn:            { fontSize: 11, color: t.orderBtn, paddingVertical: 2, fontFamily: 'Raleway_400Regular' },
    disabledBtn:         { color: t.border },

    habitCellBtn:        { width: 240, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
    habitCellText:       { width: 240, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontFamily: 'Raleway_400Regular' },
    habitCell:           { color: t.text, fontSize: 14, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular', lineHeight: 20 },

    dayCell:             { width: 80, alignItems: 'center', justifyContent: 'center', height: 60 },
    todayCell:           { backgroundColor: t.today, borderRadius: 6 },
    checkMark:           { fontSize: 20, color: t.checkMark, fontFamily: 'Raleway_700Bold' },

    statCell:            { width: 88, textAlign: 'center', color: t.text, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    bold:                { fontFamily: 'Raleway_600SemiBold', color: t.text },
    actionCell:          { width: 44, alignItems: 'center' },
    deleteBtn:           { color: t.delete, fontSize: 15, fontFamily: 'Raleway_400Regular' },

    addHabitBtn:         { marginTop: 16, paddingVertical: 12, paddingHorizontal: 4 },
    addHabitText:        { color: t.accent, fontSize: 14, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },

    // Modal
    modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
    modalBox:            { width: 400, borderRadius: 16, padding: 32, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    modalTitle:          { fontSize: 20, fontFamily: 'Raleway_700Bold', color: t.text, marginBottom: 24, letterSpacing: 0.4 },
    modalLabel:          { fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    modalActions:        { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },

    input:               { borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, width: '100%', color: t.text, backgroundColor: t.bg, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    goalInput:           { width: 100 },
    errorText:           { color: t.error, marginTop: 10, fontSize: 13, fontFamily: 'Raleway_400Regular' },

    saveBtn:             { backgroundColor: t.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    saveBtnText:         { color: t.accentText, fontSize: 14, letterSpacing: 0.5, fontFamily: 'Raleway_600SemiBold' },
    cancelBtn:           { paddingHorizontal: 12 },
    cancelText:          { color: t.textSub, fontSize: 14, fontFamily: 'Raleway_400Regular' },

    colorRow:            { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
    colorSwatch:         { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorSwatchSelected: { borderColor: t.text, transform: [{ scale: 1.15 }] },
  });
}