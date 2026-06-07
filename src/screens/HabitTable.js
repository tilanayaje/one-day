import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getHabits, addHabit, deleteHabit, updateHabit,
  getWeekData, toggleCompletion, toggleBlock, reorderHabits,
} from '../db/database';
import DesktopDayCell from '../components/habitTable/DesktopDayCell';
import WeekNav        from '../components/habitTable/WeekNav';
import FormModal      from '../components/habitTable/FormModal';
import HelpModal      from '../components/habitTable/HelpModal';
import SortableRow         from '../components/habitTable/SortableRow';
import SortableMobileCard  from '../components/habitTable/SortableMobileCard';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

// ── Constants ────────────────────────────────────────────

const DAYS         = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_HABITS   = 20;
const MOBILE_BP    = 768;
const EMPTY_FORM   = { name: '', goal: '7', color: null, notes: '', error: '' };

// ── Week helpers ─────────────────────────────────────────

function getWeekKeyWithOffset(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  now.setDate(now.getDate() - now.getDay());
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Main component ───────────────────────────────────────

export default function HabitTable() {
  const { theme, gridLines, editPastWeeks } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile  = width < MOBILE_BP;
  const s         = makeStyles(theme, gridLines);
  const route     = useRoute();

  const [data, setData] = useState({
    habits: [], thisChecks: {}, thisBlocks: {}, prevChecks: {},
    loading: true, todayIndex: new Date().getDay(), isCurrentWeek: true,
  });
  const { habits, thisChecks, thisBlocks, prevChecks, loading } = data;
  const todayIndex    = data.todayIndex;
  const isCurrentWeek = data.isCurrentWeek;

  const [modal, setModal]           = useState({ mode: null, habit: null });
  const [form, setForm]             = useState(EMPTY_FORM);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showHelp, setShowHelp]     = useState(false);
  const [toast, setToast]           = useState(null);
  const weekOffsetRef               = React.useRef(weekOffset);
  weekOffsetRef.current             = weekOffset;
  const modalModeRef                = React.useRef('add');
  const currentWeekKey              = getWeekKeyWithOffset(weekOffset);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // ── Data loading ────────────────────────────────────

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
    loadData(weekOffsetRef.current, firstLoad.current);
    firstLoad.current = false;
  }, []));

  useEffect(() => {
    if (!firstLoad.current) loadData(weekOffset);
  }, [weekOffset]);

  useEffect(() => {
    if (route.params?.weekOffset !== undefined) {
      setWeekOffset(route.params.weekOffset);
    }
  }, [route.params?.weekOffset]);

  // ── Check & block handlers ──────────────────────────

  const handleToggle = async (habitId, dayIndex) => {
    if (!isCurrentWeek && !editPastWeeks) return;
    const isBlocked = thisBlocks[habitId]?.[dayIndex] ?? false;
    if (isBlocked) {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: d.thisBlocks[habitId].map((v, i) => i === dayIndex ? false : v) },
        thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? true : v) },
      }));
      try { await toggleCompletion(habitId, currentWeekKey, dayIndex, true); }
      catch (e) { showToast(e.message); }
      return;
    }
    const current = thisChecks[habitId]?.[dayIndex] ?? false;
    setData(d => ({
      ...d,
      thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? !current : v) },
    }));
    try { await toggleCompletion(habitId, currentWeekKey, dayIndex, !current); }
    catch (e) { showToast(e.message); }
  };

  const handleBlock = async (habitId, dayIndex) => {
    if (!isCurrentWeek && !editPastWeeks) return;
    const isBlocked = thisBlocks[habitId]?.[dayIndex] ?? false;
    if (!isBlocked) {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: (d.thisBlocks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? true : v) },
        thisChecks: { ...d.thisChecks, [habitId]: (d.thisChecks[habitId] ?? Array(7).fill(false)).map((v, i) => i === dayIndex ? false : v) },
      }));
      try { await toggleBlock(habitId, currentWeekKey, dayIndex, true); }
      catch (e) { showToast(e.message); }
    } else {
      setData(d => ({
        ...d,
        thisBlocks: { ...d.thisBlocks, [habitId]: d.thisBlocks[habitId].map((v, i) => i === dayIndex ? false : v) },
      }));
      try { await toggleBlock(habitId, currentWeekKey, dayIndex, false); }
      catch (e) { showToast(e.message); }
    }
  };

  // ── CRUD handlers ───────────────────────────────────

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
    if (!name)                                         return 'Name is required.';
    if (name.length > 50)                              return 'Max 50 characters.';
    if (isNaN(goal) || goal < 1 || goal > 7)           return 'Goal must be 1–7.';
    if (modal.mode === 'add' && habits.length >= MAX_HABITS) return `Max ${MAX_HABITS} habits.`;
    if (habits.some(h => h.id !== modal.habit?.id && h.name.toLowerCase() === name.toLowerCase()))
      return 'Name already exists.';
    if (form.notes.length > 1000) return 'Notes max 1000 characters.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setForm(f => ({ ...f, error: err }));
    const name  = form.name.trim();
    const goal  = parseInt(form.goal);
    const notes = form.notes.trim() || null;
    try {
      if (modal.mode === 'add') await addHabit(name, goal, form.color, notes);
      else await updateHabit(modal.habit.id, name, goal, form.color, notes);
      closeModal();
      loadData(weekOffset);
      showToast(modal.mode === 'add' ? 'Habit added' : 'Habit saved');
    } catch (e) {
      setForm(f => ({ ...f, error: e.message }));
    }
  };

  const handleDelete = async (id) => {
    const habit = habits.find(h => h.id === id);
    if (!window.confirm(`Delete "${habit?.name}"? This cannot be undone.`)) return;
    try {
      await deleteHabit(id);
      loadData(weekOffset);
      showToast('Habit deleted');
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex  = habits.findIndex(h => String(h.id) === active.id);
    const newIndex  = habits.findIndex(h => String(h.id) === over.id);
    const reordered = arrayMove(habits, oldIndex, newIndex);
    setData(d => ({ ...d, habits: reordered }));
    await reorderHabits(reordered);
  };

  // ── Derived values ──────────────────────────────────

  const count = (checks, blocks, id) => {
    const c = checks[id] ?? [];
    const b = blocks[id] ?? [];
    return c.filter((v, i) => v && !b[i]).length;
  };

  const totalThis = habits.reduce((sum, h) => sum + count(thisChecks, thisBlocks, h.id), 0);
  const totalPrev = habits.reduce((sum, h) => sum + count(prevChecks, {}, h.id), 0);
  const totalGoal = habits.reduce((sum, h) => sum + h.perweek, 0);

  const getDayState = (habitId, dayIndex) => {
    if (thisBlocks[habitId]?.[dayIndex]) return 'blocked';
    if (thisChecks[habitId]?.[dayIndex]) return 'checked';
    return 'empty';
  };

  // ── Loading state ───────────────────────────────────

  if (loading) return (
    <View style={s.center}><Text style={s.muted}>Loading...</Text></View>
  );

  // ── Shared DnD list ─────────────────────────────────

  const sharedProps = {
    isCurrentWeek, todayIndex, thisChecks, thisBlocks, prevChecks,
    getDayState, handleToggle, handleBlock, openEdit, count, theme, s,
    habitsLength: habits.length, editPastWeeks,
  };

  // ── Mobile layout ───────────────────────────────────

  if (isMobile) {
    return (
      <View style={[s.container, { padding: 12 }]}>
        <WeekNav
          currentWeekKey={currentWeekKey}
          weekOffset={weekOffset}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
          onToday={() => setWeekOffset(0)}
          onHelp={() => setShowHelp(true)}
          theme={theme} isMobile={isMobile} s={s}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={habits.map(h => String(h.id))} strategy={verticalListSortingStrategy}>
              {habits.length === 0 && (
                <View style={s.emptyState}><Text style={s.emptyText}>No habits yet.</Text></View>
              )}
              {habits.map(habit => (
                <SortableMobileCard key={habit.id} habit={habit} {...sharedProps} />
              ))}
            </SortableContext>
          </DndContext>
          {habits.length > 0 && (
            <View style={s.mobileSumRow}>
              <Text style={[s.muted, { fontFamily: 'Raleway_600SemiBold' }]}>This week: {totalThis} / {totalGoal}</Text>
              <Text style={s.muted}>Prev week: {totalPrev}</Text>
            </View>
          )}
          {isCurrentWeek && habits.length < MAX_HABITS && (
            <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}>
              <Text style={s.addHabitText}>+ Add Habit</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
        {toast && (
          <View style={{
            position: 'absolute', bottom: 100, alignSelf: 'center',
            backgroundColor: theme.surface, borderRadius: 10,
            paddingHorizontal: 20, paddingVertical: 10,
            borderWidth: 1, borderColor: theme.border,
          }}>
            <Text style={{ color: theme.text, fontSize: 13, fontFamily: 'Raleway_600SemiBold' }}>{toast}</Text>
          </View>
        )}
        <FormModal
          visible={modal.mode !== null}
          modalModeRef={modalModeRef}
          form={form} setField={setField}
          onSave={handleSave} onClose={closeModal}
          onDelete={() => { closeModal(); handleDelete(modal.habit.id); }}
          theme={theme} isMobile={isMobile} s={s}
        />
        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} theme={theme} isMobile={isMobile} s={s} />
      </View>
    );
  }

  // ── Desktop layout ──────────────────────────────────

  return (
    <View style={s.container}>
      <WeekNav
        currentWeekKey={currentWeekKey}
        weekOffset={weekOffset}
        onPrev={() => setWeekOffset(o => o - 1)}
        onNext={() => setWeekOffset(o => o + 1)}
        onToday={() => setWeekOffset(0)}
        onHelp={() => setShowHelp(true)}
        theme={theme} isMobile={isMobile} s={s}
      />

      {habits.length > 0 && (
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
          {!isCurrentWeek && <Text style={[s.header, s.statCellHeader]}>Net</Text>}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={habits.map(h => String(h.id))} strategy={verticalListSortingStrategy}>
            {habits.length === 0 && (
              <View style={s.emptyState}><Text style={s.emptyText}>No habits yet.</Text></View>
            )}
            {habits.map((habit, index) => (
              <SortableRow key={habit.id} habit={habit} index={index} {...sharedProps} />
            ))}
          </SortableContext>
        </DndContext>

        {habits.length > 0 && (
          <View style={[s.row, s.sumRow]}>
            <View style={s.orderBtns} />
            <Text style={[s.habitCellText, s.bold]}>Sum</Text>
            {DAYS.map((_, i) => <View key={i} style={s.dayCell} />)}
            <Text style={[s.statCell, s.bold]}>{totalThis}</Text>
            <Text style={[s.statCell, s.bold]}>{totalPrev}</Text>
            <Text style={[s.statCell, s.bold]}>{totalGoal}</Text>
            {!isCurrentWeek && (
              <Text style={[s.statCell, s.bold, { color: totalThis >= totalGoal ? '#a6e3a1' : theme.delete }]}>
                {totalGoal - totalThis}
              </Text>
            )}
          </View>
        )}
        {isCurrentWeek && habits.length < MAX_HABITS && (
          <TouchableOpacity style={s.addHabitBtn} onPress={openAdd}>
            <Text style={s.addHabitText}>+ Add Habit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <FormModal
        visible={modal.mode !== null}
        modalModeRef={modalModeRef}
        form={form} setField={setField}
        onSave={handleSave} onClose={closeModal}
        onDelete={() => { closeModal(); handleDelete(modal.habit.id); }}
        theme={theme} isMobile={isMobile} s={s}
      />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} theme={theme} isMobile={isMobile} s={s} />
      {toast && (
        <View style={{
          position: 'absolute', bottom: 100, alignSelf: 'center',
          backgroundColor: theme.surface, borderRadius: 10,
          paddingHorizontal: 20, paddingVertical: 10,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <Text style={{ color: theme.text, fontSize: 13, fontFamily: 'Raleway_600SemiBold' }}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────

function makeStyles(t, gridLines) {
  return StyleSheet.create({
    container:           { flex: 1, paddingHorizontal: 32, paddingTop: 24, backgroundColor: t.bg },
    center:              { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    muted:               { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 14 },
    emptyState:          { paddingVertical: 48, alignItems: 'center' },
    emptyText:           { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },
    weekNav:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    weekArrow:           { paddingHorizontal: 16, paddingVertical: 8 },
    weekArrowText:       { fontSize: 20, color: t.accent, fontFamily: 'Raleway_700Bold' },
    weekCenter:          { alignItems: 'center', minWidth: 220 },
    weekRange:           { color: t.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold', letterSpacing: 0.3 },
    weekTodayBtn:        { color: t.accent, fontSize: 12, fontFamily: 'Raleway_600SemiBold', marginTop: 4 },
    headerRow:           { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 2, borderColor: t.accent, marginBottom: 2 },
    header:              { color: t.text, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: 'Raleway_700Bold' },
    habitHeader:         { width: 240, paddingHorizontal: 12 },
    dayCellHeader:       { width: 80, alignItems: 'center', justifyContent: 'center' },
    statCellHeader:      { width: 88, textAlign: 'center' },
    todayHeader:         { color: t.todayText },
    row:                 { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.border, alignItems: 'center', minHeight: 60, borderLeftWidth: 3, borderLeftColor: 'transparent' },
    goalMet:             { borderLeftColor: '#f9e2af' },
    sumRow:              { backgroundColor: t.sumRow, borderTopWidth: 2, borderTopColor: t.border, marginTop: 2 },
    orderBtns:           { width: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
    orderBtn:            { fontSize: 11, color: t.orderBtn, paddingVertical: 2, fontFamily: 'Raleway_400Regular' },
    disabledBtn:         { color: t.border },
    habitCellBtn:        { width: 240, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
    habitCellText:       { width: 240, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontFamily: 'Raleway_400Regular' },
    habitCell:           { color: t.text, fontSize: 14, letterSpacing: 0.3, fontFamily: 'Raleway_400Regular', lineHeight: 20 },
    notePreview:         { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 2, fontStyle: 'italic' },
    dayCell:             { width: 80, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', borderLeftWidth: gridLines ? 1 : 0, borderLeftColor: t.border },
    todayCell:           { backgroundColor: t.today, borderRadius: 0, borderLeftWidth: gridLines ? 1 : 0, borderLeftColor: t.border, borderBottomWidth: gridLines ? 1 : 0, borderBottomColor: t.border },
    checkMark:           { fontSize: 20, color: t.checkMark, fontFamily: 'Raleway_700Bold' },
    blockMark:           { fontSize: 18, color: t.delete, fontFamily: 'Raleway_700Bold', opacity: 0.6 },
    statCell:            { width: 88, textAlign: 'center', color: t.text, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    bold:                { fontFamily: 'Raleway_600SemiBold', color: t.text },
    addHabitBtn:         { marginTop: 16, paddingVertical: 12, paddingHorizontal: 4 },
    addHabitText:        { color: t.accent, fontSize: 14, letterSpacing: 0.4, fontFamily: 'Raleway_600SemiBold' },
    mobileCard:          { backgroundColor: t.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: 'transparent' },
    mobileCardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    mobileHabitName:     { color: t.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold', lineHeight: 22, flex: 1 },
    mobileNotePreview:   { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', marginTop: 3, fontStyle: 'italic' },
    mobileCardRight:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 },
    mobileCount:         { fontSize: 18, fontFamily: 'Raleway_700Bold', color: t.accent },
    mobileCountGoal:     { fontSize: 13, fontFamily: 'Raleway_400Regular', color: t.textSub },
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