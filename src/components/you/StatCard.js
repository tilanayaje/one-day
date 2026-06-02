import React from 'react';
import { View, Text } from 'react-native';

export default function StatCard({ label, value, accent, theme, isMobile }) {
  return (
    <View style={{
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: theme.surface,
      borderRadius: 14, padding: isMobile ? 16 : 20,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      marginBottom: isMobile ? 10 : 0,
    }}>
      <Text style={{
        fontSize: isMobile ? 13 : 10, fontFamily: 'Raleway_600SemiBold',
        color: theme.textSub, letterSpacing: 1, textTransform: 'uppercase',
      }}>
        {label}
      </Text>
      <Text style={{
        fontSize: isMobile ? 24 : 32, fontFamily: 'Raleway_700Bold',
        color: accent || theme.text, marginTop: isMobile ? 0 : 8,
      }}>
        {value}
      </Text>
    </View>
  );
}