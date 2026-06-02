import React from 'react';
import { Text } from 'react-native';

export default function SectionLabel({ text, theme }) {
  return (
    <Text style={{
      fontSize: 11, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
      letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14,
    }}>
      {text}
    </Text>
  );
}