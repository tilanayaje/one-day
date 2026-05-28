import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import T from '../components/T';

export default function Philosophy() {
  const { theme } = useTheme();
  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <T bold style={[s.title, { color: theme.text }]}>Fix your day, not your life.</T>
      <T style={[s.sub, { color: theme.textSub }]}>It takes 66 days to build a habit.</T>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: 28, textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },
  sub:       { fontSize: 18, textAlign: 'center', letterSpacing: 0.3 },
});