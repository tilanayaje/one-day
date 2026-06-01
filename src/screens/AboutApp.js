import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const MOBILE_BREAKPOINT = 768;

export default function AboutApp() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16, paddingVertical: 4, paddingRight: 12 }}
        >
          <Text style={{ color: theme.accent, fontSize: 15, fontFamily: 'Raleway_600SemiBold' }}>
            ← Back
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ alignItems: 'center', padding: isMobile ? 24 : 48, paddingTop: isMobile ? 40 : 80 }}
    >
      <Text style={[s.title, { color: theme.delete }]}>One Day</Text>
      <Text style={[s.tagline, { color: theme.accent }]}>Fix your day, not your life.</Text>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      <Text style={[s.body, { color: theme.textSub }]}>
        Small daily actions compound into massive results over time. This app provides a system for those with many weekly obligations / goals, as well as an analytical side for data lovers.
      </Text>

      <Text style={[s.body, { color: theme.textSub, marginTop: 12 }]}>
        It takes 66 days to build a habit. Start with one day.
      </Text>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      <Text style={[s.credit, { color: theme.textSub }]}>
        Inspired by The Compound Effect by Darren Hardy
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 }}>
        <Text style={{ color: theme.delete, fontSize: 13, fontFamily: 'Raleway_600SemiBold' }}>
          Built by tilanayaje
        </Text>
        <TouchableOpacity
          onPress={() => window.open('https://github.com/tilanayaje', '_blank')}
        >
          <Image
            source={{ uri: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' }}
            style={{ width: 22, height: 22, borderRadius: 11 }}
          />
        </TouchableOpacity>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title:     { fontSize: 36, fontFamily: 'Raleway_700Bold', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8 },
  tagline:   { fontSize: 18, fontFamily: 'Raleway_400Regular', textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.3 },
  divider:   { width: 60, height: 1, marginVertical: 28 },
  body:      { fontSize: 15, fontFamily: 'Raleway_400Regular', textAlign: 'center', lineHeight: 24, maxWidth: 480 },
  credit:    { fontSize: 13, fontFamily: 'Raleway_400Regular', textAlign: 'center' },
  githubBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginTop: 28 },
});