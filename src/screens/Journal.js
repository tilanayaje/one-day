import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, Modal, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getJournalEntries, addJournalEntry, deleteJournalEntry, updateJournalEntry } from '../db/database';

const MOBILE_BREAKPOINT = 768;

export default function Journal() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const s = makeStyles(theme, isMobile);

  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getJournalEntries();
    setEntries(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const openAdd = () => {
    setEditEntry(null);
    setTitle('');
    setBody('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setTitle(entry.title);
    setBody(entry.body);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t) return setError('Title is required.');
    if (!b) return setError('Body is required.');
    if (editEntry) {
      await updateJournalEntry(editEntry.id, t, b);
    } else {
      const today = new Date().toISOString().split('T')[0];
      await addJournalEntry(today, t, b);
    }
    setTitle('');
    setBody('');
    setError('');
    setEditEntry(null);
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    await deleteJournalEntry(id);
    loadData();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <View style={s.center}><Text style={s.muted}>Loading...</Text></View>
  );

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ New Entry</Text>
        </TouchableOpacity>

        {entries.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.muted}>No journal entries yet.</Text>
          </View>
        )}

        {entries.map(entry => {
          const isOpen = expanded === entry.id;
          return (
            <View key={entry.id} style={s.card}>
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => setExpanded(isOpen ? null : entry.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.entryTitle}>{entry.title}</Text>
                  <Text style={s.entryDate}>{formatDate(entry.date)}</Text>
                </View>
                <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={s.cardBody}>
                  <Text style={s.entryBody}>{entry.body}</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                    <TouchableOpacity onPress={() => openEdit(entry)} style={s.editBtn}>
                      <Text style={s.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(entry.id)}>
                      <Text style={s.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={s.modalOverlay}>
          <ScrollView
            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[s.modalBox, isMobile && { width: '100%', maxWidth: 420 }]}>
              <Text style={s.modalTitle}>{editEntry ? 'Edit Entry' : 'New Journal Entry'}</Text>

              <Text style={s.modalLabel}>Title</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={v => { setTitle(v); setError(''); }}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.textSub}
                maxLength={100}
                autoFocus
              />

              <Text style={s.modalLabel}>Body</Text>
              <TextInput
                style={[s.input, s.bodyInput]}
                value={body}
                onChangeText={v => { setBody(v); setError(''); }}
                placeholder="Write your thoughts..."
                placeholderTextColor={theme.textSub}
                multiline
                maxLength={5000}
              />
              <Text style={s.charCount}>{body.length}/5000</Text>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <View style={s.modalActions}>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                  <Text style={s.saveBtnText}>{editEntry ? 'Save' : 'Add'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowForm(false); setError(''); }} style={s.cancelBtn}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t, mobile) {
  return StyleSheet.create({
    container:   { flex: 1, padding: mobile ? 12 : 24, backgroundColor: t.bg },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
    muted:       { color: t.textSub, fontFamily: 'Raleway_400Regular', fontSize: 15 },
    emptyState:  { paddingVertical: 48, alignItems: 'center' },
    addBtn:      { backgroundColor: t.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 20 },
    addBtnText:  { color: t.accentText, fontSize: 14, fontFamily: 'Raleway_600SemiBold', letterSpacing: 0.4 },
    card:        { backgroundColor: t.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    cardHeader:  { flexDirection: 'row', alignItems: 'center', padding: mobile ? 14 : 18 },
    entryTitle:  { fontSize: mobile ? 15 : 17, fontFamily: 'Raleway_600SemiBold', color: t.text, marginBottom: 4 },
    entryDate:   { fontSize: 12, fontFamily: 'Raleway_400Regular', color: t.textSub },
    chevron:     { fontSize: 11, color: t.textSub, marginLeft: 12 },
    cardBody:    { paddingHorizontal: mobile ? 14 : 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: t.border },
    entryBody:   { color: t.text, fontSize: 14, fontFamily: 'Raleway_400Regular', lineHeight: 22, marginTop: 14 },
    editBtn:     { paddingVertical: 8 },
    editText:    { color: t.accent, fontSize: 13, fontFamily: 'Raleway_600SemiBold' },
    deleteText:  { color: t.delete, fontSize: 13, fontFamily: 'Raleway_600SemiBold', paddingVertical: 8 },
    modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
    modalBox:    { width: 500, borderRadius: 16, padding: 28, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    modalTitle:  { fontSize: 20, fontFamily: 'Raleway_700Bold', color: t.text, marginBottom: 20, letterSpacing: 0.4 },
    modalLabel:  { fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: t.textSub, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    modalActions:{ flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
    input:       { borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, width: '100%', color: t.text, backgroundColor: t.bg, fontSize: 14, fontFamily: 'Raleway_400Regular' },
    bodyInput:   { height: 200, textAlignVertical: 'top', paddingTop: 12 },
    charCount:   { color: t.textSub, fontSize: 11, fontFamily: 'Raleway_400Regular', textAlign: 'right', marginTop: 4 },
    errorText:   { color: t.error, marginTop: 10, fontSize: 13, fontFamily: 'Raleway_400Regular' },
    saveBtn:     { backgroundColor: t.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    saveBtnText: { color: t.accentText, fontSize: 14, letterSpacing: 0.5, fontFamily: 'Raleway_600SemiBold' },
    cancelBtn:   { paddingHorizontal: 12 },
    cancelText:  { color: t.textSub, fontSize: 14, fontFamily: 'Raleway_400Regular' },
  });
}