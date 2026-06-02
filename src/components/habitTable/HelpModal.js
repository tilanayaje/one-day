import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

export default function HelpModal({ visible, onClose, theme, isMobile, s }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={[s.modalBox, isMobile && { width: '100%', maxWidth: 420 }]}>
            <Text style={s.modalTitle}>How It Works</Text>
            <View style={{ gap: 18, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Raleway_700Bold', color: '#f9e2af', width: 30, textAlign: 'center' }}>✓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold' }}>Check</Text>
                  <Text style={{ color: theme.textSub, fontSize: 13, fontFamily: 'Raleway_400Regular', marginTop: 2 }}>You completed the habit that day</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Raleway_700Bold', color: theme.delete, opacity: 0.6, width: 30, textAlign: 'center' }}>✕</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold' }}>Skip</Text>
                  <Text style={{ color: theme.textSub, fontSize: 13, fontFamily: 'Raleway_400Regular', marginTop: 2 }}>Intentional rest day, travel, etc. Excluded from your stats</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 1.5, borderColor: theme.border, marginHorizontal: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontFamily: 'Raleway_600SemiBold' }}>Miss</Text>
                  <Text style={{ color: theme.textSub, fontSize: 13, fontFamily: 'Raleway_400Regular', marginTop: 2 }}>You didn't do it. Included in your stats</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: theme.border }} />
              <Text style={{ color: theme.textSub, fontSize: 13, fontFamily: 'Raleway_400Regular', lineHeight: 20 }}>
                Right-click (desktop) or long-press (mobile) to skip a day. Hit your weekly goal and the row highlights gold. Tap the habit name to edit or delete it.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: theme.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 24 }}
            >
              <Text style={{ color: theme.accentText, fontSize: 14, fontFamily: 'Raleway_600SemiBold' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}