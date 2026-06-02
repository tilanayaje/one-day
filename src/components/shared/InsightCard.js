import React from 'react';
import { View, Text } from 'react-native';

export default function InsightCard({ label, value, sub, accent, theme, isMobile }) {
  return (
    <View style={{
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: theme.surface,
      borderRadius: 12, padding: isMobile ? 14 : 16,
      borderWidth: 1, borderColor: theme.border,
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      marginBottom: isMobile ? 8 : 0,
    }}>
      <View style={isMobile ? {} : { alignItems: 'center' }}>
        <Text style={{
          fontSize: isMobile ? 12 : 9, fontFamily: 'Raleway_600SemiBold',
          color: theme.textSub, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {label}
        </Text>
        {sub && (
          <Text style={{
            fontSize: 10, fontFamily: 'Raleway_400Regular',
            color: theme.textSub, marginTop: 2,
          }}>
            {sub}
          </Text>
        )}
      </View>
      <Text style={{
        fontSize: isMobile ? 20 : 24, fontFamily: 'Raleway_700Bold',
        color: accent || theme.text, marginTop: isMobile ? 0 : 6,
      }}>
        {value}
      </Text>
    </View>
  );
}