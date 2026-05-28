import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Philosophy() {
  const { theme } = useTheme();
  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <Text style={[s.title, { color: theme.text }]}>Fix your day, not your life.</Text>
      <Text style={[s.sub, { color: theme.textSub }]}>It takes 66 days to build a habit.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: 28, fontFamily: 'Raleway_700Bold', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },
  sub:       { fontSize: 18, fontFamily: 'Raleway_400Regular', textAlign: 'center', letterSpacing: 0.3 },
});