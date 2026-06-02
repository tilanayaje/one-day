import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';

const ROW_COLORS = [
  null,
  '#FF6B6B', '#FF4757', '#FF7F50',
  '#FF9F43', '#FFA502', '#FECA57',
  '#1DD1A1', '#2ED573', '#00CEC9',
  '#48DBFB', '#1E90FF', '#4A90D9',
  '#A29BFE', '#5352ED', '#6C5CE7',
  '#FD79A8', '#FF6EB4', '#B8860B',
];

export default function FormModal({ visible, modalModeRef, form, setField, onSave, onClose, onDelete, theme, isMobile, s }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[s.modalBox, isMobile && { width: '100%', maxWidth: 420 }]}>
            <Text style={s.modalTitle}>
              {modalModeRef.current === 'add' ? 'New Habit' : 'Edit Habit'}
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

            <View style={[s.modalActions, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity style={s.saveBtn} onPress={onSave}>
                  <Text style={s.saveBtnText}>
                    {modalModeRef.current === 'add' ? 'Add' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              {modalModeRef.current === 'edit' && (
                <TouchableOpacity
                  onPress={onDelete}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: theme.delete + '1a',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.delete, fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}