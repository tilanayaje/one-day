import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { signInWithGoogle } from '../db/database';

export default function Login() {
  const { theme } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <Text style={[s.title, { color: theme.text }]}>One Day</Text>
      <Text style={[s.sub, { color: theme.textSub }]}>Fix your day, not your life.</Text>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: theme.accent }]}
        onPress={signInWithGoogle}
      >
        <Text style={[s.btnText, { color: theme.accentText }]}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title:     { fontSize: 48, fontFamily: 'Raleway_700Bold', letterSpacing: 1 },
  sub:       { fontSize: 18, fontFamily: 'Raleway_400Regular', marginBottom: 32 },
  btn:       { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 10 },
  btnText:   { fontSize: 16, fontFamily: 'Raleway_600SemiBold' },
});