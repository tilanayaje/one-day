import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import T from '../components/T';

export default function Journal() {
  const { theme } = useTheme();
  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <T style={{ fontSize: 18, color: theme.textSub }}>Journal coming soon.</T>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});