import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Modal, ScrollView, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getHabits, addHabit, deleteHabit, updateHabit,
  getCompletionsForWeek, toggleCompletion, reorderHabits,
} from '../db/database';
import { getWeekKey, getLastWeekKey } from '../utils/date';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_HABITS = 20;

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
const MOBILE_BREAKPOINT = 768;

export default function HabitTable() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const s = makeStyles(theme);

  const [habits,      setHabits]      = useState([]);
  const [thisWeek,    setThisWeek]    = useState({});
  const [lastWeek,    setLastWeek]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [modal,       setModal]       = useState({ mode: null, habit: null });
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [weekKeys,    setWeekKeys]    = useState({
    this: getWeekKey(), last: getLastWeekKey(), today: new Date().getDay(),
  });

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

  const handleToggle = async (habitId, dayIndex) => {
    const current = thisWeek[habitId]?.[dayIndex] ?? false;
    const updated  = { ...thisWeek, [habitId]: [...(thisWeek[habitId] ?? Array(7).fill(false))] };
    updated[habitId][dayIndex] = !current;
    setThisWeek(updated);
    await toggleCompletion(habitId, weekKeys.this, dayIndex, !current);
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setModal({ mode: 'add', habit: null }); };
  const openEdit = (habit) => {
    setForm({ name: habit.name, goal: String(habit.perweek), color: habit.color ?? null, notes: habit.notes ?? '', error: '' });
    setModal({ mode: 'edit', habit });
  };
  const closeModal = () => setModal({ mode: null, habit: null });
  const setField   = (key, val) => setForm(f => ({ ...f, [key]: val, error: '' }));

  const validate = () => {
    const name = form.name.trim();
    const goal = parseInt(form.goal);
    if (!name)                                                                        return 'Name is required.';
    if (name.length > 50)                                                             return 'Max 50 characters.';
    if (isNaN(goal) || goal < 1 || goal > 7)                                          return 'Goal must be 1–7.';
    if (modal.mode === 'add' && habits.length >= MAX_HABITS)                          return `Max ${MAX_HABITS} habits.`;
    if (habits.some(h => h.id !== modal.habit?.id && h.name.toLowerCase() === name.toLowerCase()))
                                                                                      return 'Name already exists.';
    if (form.notes.length > 1000)                                                     return 'Notes max 1000 characters.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setForm(f => ({ ...f, error: err }));
    const name  = form.name.trim();
    const goal  = parseInt(form.goal);
    const notes = form.notes.trim() || null;
    if (modal.mode === 'add') {
      await addHabit(name, goal, form.color, notes);
    } else {
      await updateHabit(modal.habit.id, name, goal, form.color, notes);
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

  const count    = (completions, id) => (completions[id] ?? []).filter(Boolean).length;
  const totalThis = habits.reduce((sum, h) => sum + count(thisWeek, h.id), 0);
  const totalLast = habits.reduce((sum, h) => sum + count(lastWeek, h.id), 0);
  const totalGoal = habits.reduce((sum, h) => sum + h.perweek, 0);

  // ── Mobile Card ───────────────────────────────────────────

  const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  const renderMobileCard = ({ item: habit, index }) => {
    const tw      = count(thisWeek, habit.id);
    const goalMet = tw >= habit.perweek;

    return (
      <View style={[
        s.mobileCard,
        habit.color && { borderLeftColor: habit.color, borderLeftWidth: 4 },
        goalMet && { borderLeftColor: '#f9e2af', borderLeftWidth: 4 },
      ]}>
        {/* Top row */}
        <View style={s.mobileCardHeader}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(habit)}>
            <Text style={s.mobileHabitName} numberOfLines={2}>{habit.name}</Text>
            {habit.notes ? (
              <Text style={s.mobileNotePreview} numberOfLines={1}>{habit.notes}</Text>
            ) : null}
          </TouchableOpacity>
          <View style={s.mobileCardRight}>
            <Text style={[s.mobileCount, goalMet && { color: '#f9e2af' }]}>
              {tw}<Text style={s.mobileCountGoal}>/{habit.perweek}</Text>
            </Text>
            <TouchableOpacity onPress={() => handleDelete(habit.id)} style={s.mobileDeleteBtn}>
              <Text style={s.deleteBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day dots */}
        <View style={s.mobileDayRow}>
          {DAYS.map((_, i) => {
            const checked = thisWeek[habit.id]?.[i] ?? false;
            const isToday = i === weekKeys.today;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleToggle(habit.id, i)}
                style={[
                  s.mobileDayDot,
                  isToday && s.mobileDayDotToday,
                  checked && !isToday && s.mobileDayDotChecked,
                  checked && isToday && s.mobileDayDotCheckedToday,
                ]}
              >
                <Text 
                  style={[
                    s.mobileDayLabel,
                    checked && !isToday && s.mobileDayLabelChecked,
                    checked && isToday && { color: '#0d1f0d' },
                    !checked && isToday && { color: theme.todayText },
                  ]}
                >
                {DAY_INITIALS[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reorder */}
        <View style={s.mobileOrderRow}>
          <TouchableOpacity onPress={() => moveHabit(index, -1)} disabled={index === 0}>
            <Text style={[s.orderBtn, index === 0 && s.disabledBtn]}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => moveHabit(index, 1)} disabled={index === habits.length - 1}>
            <Text style={[s.orderBtn, index === habits.length - 1 && s.disabledBtn]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Desktop Row ───────────────────────────────────────────

  const renderDesktopRow = ({ item: habit, index }) => {
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
          {habit.notes ? (
            <Text style={s.notePreview} numberOfLines={1}>{habit.notes}</Text>
          ) : null}
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
    <View style={s.center}><Text style={s.muted}>Loading...</Text></View>
  );

  // ── Modal ─────────────────────────────────────────────────

  const FormModal = (
    <Modal
      visible={modal.mode !== null}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <View style={s.modalOverlay}>
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[s.modalBox, isMobile && { width: '100%', maxWidth: 420 }]}>
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
              style={[s.input, { width: 100 }]}
              value={form.goal}
              onChangeText={v => setField('goal', v)}
              placeholder="1–7"
              placeholderTextColor={theme.textSub}
              keyboardType="numeric"
              maxLength={1}
            />

            <Text style={s.modalLabel}>Notes</Text>
            <TextInput
              style={[s.input, s.notesInput]}
              value={form.notes}
              onChangeText={v => setField('notes', v)}
              placeholder="Optional notes..."
              placeholderTextColor={theme.textSub}
              multiline
              maxLength={1000}
            />
            <Text style={s.charCount}>{form.notes.length}/1000</Text>

            <Text style={s.modalLabel}>Row Color</Text>
            <View style={s.colorGrid}>
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
        </ScrollView>
      </View>
    </Modal>
  );

  // ── Mobile Layout ─────────────────────────────────────────

  if (isMobile) {
    return (
      <View style={[s.container, { padding: 12 }]}>
        <Text style={[s.dateHeader, { marginBottom: 16 }]}>{todayStr}</Text>
        <FlatList
          data={habits}
          keyExtractor={item => String(item.id)}
          renderItem={renderMobileCard}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No habits yet. Add one below.</Text>
            </View>
          }
          ListFooterComponent={
            <>
              {/* Mobile Sum */}
              <View style={s.mobileSumRow}>
                <Text style={[s.muted, { fontFamily: 'Raleway_600SemiBold' }]}>
                  This week: {totalThis} / {totalGoal}
                </Text>
                <Text style={s.muted}>Last week: {totalLast}</Text>
              </View>

              {habits.length < MAX_HABITS && (
                <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}>
                  <Text style={s.addHabitText}>+ Add Habit</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 40 }} />
            </>
          }
        />
        {FormModal}
      </View>
    );
  }

  // ── Desktop Layout ────────────────────────────────────────

  return (
    <View style={s.container}>
      <Text style={s.dateHeader}>{todayStr}</Text>
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
        renderItem={renderDesktopRow}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyText}>No habits yet. Add one below.</Text>
          </View>
        }
        ListFooterComponent={
          <>
            <View style={[s.row, s.sumRow]}>
              <View style={s.orderBtns} />
              <Text style={[s.habitCellText, s.bold]}>Sum</Text>
              {DAYS.map((_, i) => <View key={i} style={s.dayCell} />)}
              <Text style={[s.statCell, s.bold]}>{totalThis}</Text>
              <Text style={[s.statCell, s.bold]}>{totalLast}</Text>
              <Text style={[s.statCell, s.bold]}>{totalGoal}</Text>
              <View style={s.actionCell} />
            </View>

            {habits.length < MAX_HABITS && (
              <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}>
                <Text style={s.addHabitText}>+ Add Habit</Text>
              </TouchableOpacity>
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
    dateHeader: { color: t.textSub, fontFamily: 'Raleway_600SemiBold', fontSize: 13, letterSpacing: 0.8, marginBottom: 20 },

    // ── Desktop ──
    headerRow:           { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 2, borderColor: t.accent, marginBottom: 2 },
    header:              { color: t.text, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    habitHeader:         { width: 240, paddingHorizontal: 12 },
    dayCellHeader:       { width: 80, alignItems: 'center', justifyContent: 'center' },
    statCellHeader:      { width: 88, textAlign: 'center' },
    todayHeader:         { color: t.todayText },
    row:                 { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.border, alignItems: 'center', minHeight: 60 },
    goalMet:             { borderLeftWidth: 3, borderLeftColor: '#f9e2af' },
    sumRow:              { backgroundColor: t.sumRow, borderTopWidth: 2, borderTopColor: t.border, marginTop: 2 },
    orderBtns:           { width: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
    orderBtn:            { fontSize: 11, color: t.orderBtn, paddingVertical: 2, fontFamily: 'Raleway_400Regular' },
    disabledBtn:         { color: t.border },
    habitCellBtn:        { width: 240, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
    habitCellText:       { width: 240, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontFamily: 'Raleway_400Regular' },
    habitCell:           { color: t.text, fontSize: 14, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular', lineHeight: 20 },
    notePreview:         { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 2, fontStyle: 'italic' },
    dayCell:             { width: 80, alignItems: 'center', justifyContent: 'center', height: 60 },
    todayCell:           { backgroundColor: t.today, borderRadius: 6 },
    checkMark:           { fontSize: 20, color: t.checkMark, fontFamily: 'Raleway_700Bold' },
    statCell:            { width: 88, textAlign: 'center', color: t.text, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    bold:                { fontFamily: 'Raleway_600SemiBold', color: t.text },
    actionCell:          { width: 44, alignItems: 'center' },
    deleteBtn:           { color: t.delete, fontSize: 15, fontFamily: 'Raleway_400Regular' },
    addHabitBtn:         { marginTop: 16, paddingVertical: 12, paddingHorizontal: 4 },
    addHabitText:        { color: t.accent, fontSize: 14, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },

    // ── Mobile ──
    mobileCard:          { backgroundColor: t.surface, borderRadius: 14, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: t.border },
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
    mobileDayDotCheckedToday: { backgroundColor: '#a6e3a1', borderColor: '#a6e3a1'},
    mobileDayLabel:      { fontSize: 12, fontFamily: 'Raleway_600SemiBold', color: t.textSub },
    mobileDayLabelChecked: { color: t.accentText },
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