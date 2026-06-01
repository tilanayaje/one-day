import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { signInWithGoogle, signInAnonymously } from '../db/database';

const MOBILE_BREAKPOINT = 768;

export default function Login() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={s.content}>
        <Text style={[s.title, { color: theme.delete }]}>One Day</Text>
        <Text style={[s.tagline, { color: theme.accent }]}>Fix your day, not your life.</Text>
        <Text style={[s.desc, { color: theme.textSub }]}>
          Track your habits, build consistency, and let the compound effect do the rest.
        </Text>

        <View style={[s.btnGroup, isMobile && { width: '100%' }]}>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={signInWithGoogle}
          >
            <Text style={[s.primaryBtnText, { color: theme.accentText }]}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: theme.border }]}
            onPress={signInAnonymously}
          >
            <Text style={[s.secondaryBtnText, { color: theme.textSub }]}>Try without an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.footnote, { color: theme.textSub }]}>
          Guest data is temporary. Sign in to save your progress.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content:         { alignItems: 'center', maxWidth: 400, width: '100%' },
  title:           { fontSize: 52, fontFamily: 'Raleway_700Bold', letterSpacing: 1, marginBottom: 8 },
  tagline:         { fontSize: 18, fontFamily: 'Raleway_400Regular', fontStyle: 'italic', marginBottom: 24, letterSpacing: 0.3 },
  desc:            { fontSize: 15, fontFamily: 'Raleway_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  btnGroup:        { gap: 12, width: 320, alignItems: 'stretch' },
  primaryBtn:      { paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  primaryBtnText:  { fontSize: 16, fontFamily: 'Raleway_600SemiBold' },
  secondaryBtn:    { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText:{ fontSize: 15, fontFamily: 'Raleway_400Regular' },
  footnote:        { fontSize: 12, fontFamily: 'Raleway_400Regular', marginTop: 20, textAlign: 'center' },
});