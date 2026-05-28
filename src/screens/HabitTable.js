import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  TextInput, StyleSheet, FlatList, Modal, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getHabits, addHabit, deleteHabit, updateHabit,
  getCompletionsForWeek, toggleCompletion, reorderHabits
} from '../db/database';
import { getWeekKey, getLastWeekKey } from '../utils/date';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const THIS_WEEK = getWeekKey();
const LAST_WEEK = getLastWeekKey();
const TODAY = new Date().getDay();
const MAX_HABITS = 20;

const ROW_COLORS = [
  null,
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#1DD1A1',
  '#48DBFB',
  '#A29BFE',
  '#FD79A8',
];

export default function HabitTable() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [habits, setHabits]             = useState([]);
  const [thisWeek, setThisWeek]         = useState({});
  const [lastWeek, setLastWeek]         = useState({});
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [newName, setNewName]           = useState('');
  const [newGoal, setNewGoal]           = useState('7');
  const [formError, setFormError]       = useState('');
  const [editingHabit, setEditingHabit] = useState(null);
  const [editName, setEditName]         = useState('');
  const [editGoal, setEditGoal]         = useState('');
  const [editColor, setEditColor]       = useState(null);
  const [editError, setEditError]       = useState('');

  const loadData = async () => {
    setLoading(true);
    const [h, tw, lw] = await Promise.all([
      getHabits(),
      getCompletionsForWeek(THIS_WEEK),
      getCompletionsForWeek(LAST_WEEK),
    ]);
    setHabits(h);
    setThisWeek(tw);
    setLastWeek(lw);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleToggle = async (habitId, dayIndex) => {
    const current = thisWeek[habitId]?.[dayIndex] ?? false;
    const updated = { ...thisWeek };
    if (!updated[habitId]) updated[habitId] = Array(7).fill(false);
    updated[habitId] = [...updated[habitId]];
    updated[habitId][dayIndex] = !current;
    setThisWeek(updated);
    await toggleCompletion(habitId, THIS_WEEK, dayIndex, !current);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    const goal = parseInt(newGoal);
    if (!name) return setFormError('Habit name is required.');
    if (name.length > 50) return setFormError('Name must be 50 characters or fewer.');
    if (habits.some(h => h.name.toLowerCase() === name.toLowerCase()))
      return setFormError('A habit with that name already exists.');
    if (habits.length >= MAX_HABITS) return setFormError(`Maximum of ${MAX_HABITS} habits allowed.`);
    if (isNaN(goal) || goal < 1 || goal > 7) return setFormError('Goal must be between 1 and 7.');
    await addHabit(name, goal);
    setNewName(''); setNewGoal('7'); setFormError(''); setShowForm(false);
    loadData();
  };





    const handleDelete = async (id) => {
    const habit = habits.find(h => h.id === id);
    Alert.alert(
        'Delete Habit',
        `Are you sure you want to delete "${habit?.name}"? This cannot be undone.`,
        [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteHabit(id);
            loadData();
        }},
        ]
    );
    };

  const handleEditSave = async () => {
    const name = editName.trim();
    const goal = parseInt(editGoal);
    if (!name) return setEditError('Name is required.');
    if (name.length > 50) return setEditError('Max 50 characters.');
    if (habits.some(h => h.id !== editingHabit.id && h.name.toLowerCase() === name.toLowerCase()))
      return setEditError('A habit with that name already exists.');
    if (isNaN(goal) || goal < 1 || goal > 7) return setEditError('Goal must be between 1 and 7.');
    await updateHabit(editingHabit.id, name, goal, editColor);
    setEditingHabit(null);
    loadData();
  };

  const moveHabit = async (index, direction) => {
    const next = [...habits];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setHabits(next);
    await reorderHabits(next);
  };

  const count = (completions, habitId) =>
    (completions[habitId] ?? []).filter(Boolean).length;

  const totalThis = habits.reduce((sum, h) => sum + count(thisWeek, h.id), 0);
  const totalLast = habits.reduce((sum, h) => sum + count(lastWeek, h.id), 0);
  const totalGoal = habits.reduce((sum, h) => sum + h.perweek, 0);

    const renderHabit = ({ item: habit, index }) => {
        const tw = count(thisWeek, habit.id);
        const lw = count(lastWeek, habit.id);
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

            <TouchableOpacity
            style={s.habitCellBtn}
            onPress={() => {
                setEditingHabit(habit);
                setEditName(habit.name);
                setEditGoal(String(habit.perweek));
                setEditColor(habit.color ?? null);
                setEditError('');
            }}
            >
            <Text style={s.habitCell}>{habit.name}</Text>
            </TouchableOpacity>

            {DAYS.map((_, i) => {
            const checked = thisWeek[habit.id]?.[i] ?? false;
            return (
                <TouchableOpacity
                key={i}
                style={[s.dayCell, i === TODAY && s.todayCell]}
                onPress={() => handleToggle(habit.id, i)}
                >
                <Text style={s.checkMark}>{checked ? '✓' : ''}</Text>
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
      <Text style={s.text}>Loading...</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header Row */}
      <View style={s.headerRow}>
        <View style={s.orderBtns} />
        <Text style={s.habitHeader}>Habit</Text>
        {DAYS.map((d, i) => (
          <View key={d} style={s.dayCellHeader}>
            <Text style={[s.header, i === TODAY && s.todayHeader]}>{d}</Text>
          </View>
        ))}
        <Text style={[s.statCellHeader, s.header]}>This Wk</Text>
        <Text style={[s.statCellHeader, s.header]}>Last Wk</Text>
        <Text style={[s.statCellHeader, s.header]}>Goal</Text>
        <View style={s.actionCell} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={item => String(item.id)}
        renderItem={renderHabit}
        ListFooterComponent={
          <>
            {/* Sum Row */}
            <View style={[s.row, s.sumRow]}>
              <View style={s.orderBtns} />
              <Text style={[s.sumHabitCell, s.bold]}>Sum</Text>
              {DAYS.map((_, i) => <View key={i} style={s.dayCell} />)}
              <Text style={[s.statCell, s.bold]}>{totalThis}</Text>
              <Text style={[s.statCell, s.bold]}>{totalLast}</Text>
              <Text style={[s.statCell, s.bold]}>{totalGoal}</Text>
              <View style={s.actionCell} />
            </View>

            {/* Add Habit */}
            {habits.length < MAX_HABITS && (
              showForm ? (
                <View style={s.formWrapper}>
                  <View style={s.form}>
                    <TextInput
                      style={s.input}
                      placeholder="Habit name (max 50 chars)"
                      placeholderTextColor={theme.textSub}
                      value={newName}
                      onChangeText={t => { setNewName(t); setFormError(''); }}
                      maxLength={50}
                    />
                    <TextInput
                      style={[s.input, s.goalInput]}
                      placeholder="Goal (1–7)"
                      placeholderTextColor={theme.textSub}
                      value={newGoal}
                      onChangeText={t => { setNewGoal(t); setFormError(''); }}
                      keyboardType="numeric"
                      maxLength={1}
                    />
                    <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
                      <Text style={s.addBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setShowForm(false); setFormError(''); }}
                      style={s.cancelBtn}
                    >
                      <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  {formError ? <Text style={s.errorText}>{formError}</Text> : null}
                </View>
              ) : (
                <TouchableOpacity style={s.addHabitBtn} onPress={() => setShowForm(true)}>
                  <Text style={s.addHabitText}>+ Add Habit</Text>
                </TouchableOpacity>
              )
            )}
          </>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={!!editingHabit}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingHabit(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: theme.surface }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Edit Habit</Text>

            <Text style={[s.modalLabel, { color: theme.textSub }]}>Name</Text>
            <TextInput
              style={[s.input, { marginBottom: 16 }]}
              value={editName}
              onChangeText={t => { setEditName(t); setEditError(''); }}
              maxLength={50}
              placeholderTextColor={theme.textSub}
            />

            <Text style={[s.modalLabel, { color: theme.textSub }]}>Goal (1–7)</Text>
            <TextInput
              style={[s.input, s.goalInput, { marginBottom: 16 }]}
              value={editGoal}
              onChangeText={t => { setEditGoal(t); setEditError(''); }}
              keyboardType="numeric"
              maxLength={1}
              placeholderTextColor={theme.textSub}
            />

            <Text style={[s.modalLabel, { color: theme.textSub }]}>Row Color</Text>
            <View style={s.colorRow}>
              {ROW_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setEditColor(c)}
                  style={[
                    s.colorSwatch,
                    { backgroundColor: c ?? theme.border },
                    editColor === c && s.colorSwatchSelected,
                  ]}
                >
                  {c === null && (
                    <Text style={{ color: theme.textSub, fontSize: 10 }}>✕</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {editError ? <Text style={s.errorText}>{editError}</Text> : null}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.addBtn} onPress={handleEditSave}>
                <Text style={s.addBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingHabit(null)} style={s.cancelBtn}>
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
    container:           { flex: 1, padding: 32, backgroundColor: t.bg },
    center:              { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    text:                { color: t.text, fontSize: 16, fontFamily: 'Raleway_400Regular' },
    headerRow:           { flexDirection: 'row', alignItems: 'center', minHeight: 72, borderBottomWidth: 2, borderColor: t.accent, marginBottom: 4 },
    row:                 { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.border, alignItems: 'center', minHeight: 64 },
    goalMet:             { backgroundColor: t.goalMet, borderLeftWidth: 3, borderLeftColor: '#F5C518' },
    sumRow:              { backgroundColor: t.sumRow, marginTop: 4, borderTopWidth: 2, borderTopColor: t.border },
    orderBtns:           { width: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
    orderBtn:            { fontSize: 12, color: t.orderBtn, paddingVertical: 2, fontFamily: 'Raleway_400Regular' },
    disabledBtn:         { color: t.border },
    habitCellBtn:        { width: 240, paddingHorizontal: 12, paddingVertical: 14, justifyContent: 'center' },
    habitCell:           { color: t.text, fontSize: 15, letterSpacing: 0.4, fontFamily: 'Raleway_400Regular' },
    dayCell:             { width: 88, alignItems: 'center', justifyContent: 'center', height: 64 },
    dayCellHeader:       { width: 88, alignItems: 'center', justifyContent: 'center', height: 72 },
    statCell:            { width: 96, textAlign: 'center', paddingHorizontal: 4, color: t.text, fontSize: 15, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular' },
    statCellHeader:      { width: 96, textAlign: 'center', paddingHorizontal: 4 },
    actionCell:          { width: 48, alignItems: 'center' },
    todayCell:           { backgroundColor: t.today, borderRadius: 8 },
    todayHeader:         { color: t.todayText },
    header:              { color: t.text, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    habitHeader:         { width: 240, paddingHorizontal: 12, color: t.text, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    bold:                { color: t.text, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },
    checkMark: { fontSize: 22, color: t.checkMark, fontFamily: 'Raleway_400Regular' },
    deleteBtn:           { color: t.delete, fontSize: 16, fontFamily: 'Raleway_400Regular' },
    formWrapper:         { marginTop: 24 },
    form:                { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input:               { borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, width: 240, color: t.text, backgroundColor: t.surface, fontSize: 15, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular' },
    goalInput:           { width: 90 },
    addBtn:              { backgroundColor: t.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    addBtnText:          { color: t.accentText, fontSize: 15, letterSpacing: 0.5, fontFamily: 'Raleway_600SemiBold' },
    cancelBtn:           { paddingHorizontal: 14 },
    cancelText:          { color: t.textSub, fontSize: 15, fontFamily: 'Raleway_400Regular' },
    errorText:           { color: t.error, marginTop: 8, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    addHabitBtn:         { marginTop: 20, padding: 12 },
    addHabitText:        { color: t.accent, fontSize: 15, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },
    modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    modalBox:            { width: 380, borderRadius: 14, padding: 32 },
    modalTitle:          { fontSize: 22, fontFamily: 'Raleway_700Bold', marginBottom: 24, letterSpacing: 0.5 },
    modalLabel:          { fontSize: 12, fontFamily: 'Raleway_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    modalActions:        { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
    colorRow:            { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
    colorSwatch:         { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorSwatchSelected: { borderColor: t.text },
    sumHabitCell: { width: 240, paddingHorizontal: 12, paddingVertical: 10 },

  });
}