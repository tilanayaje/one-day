import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Journal() {
  const { theme } = useTheme();
  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <Text style={{ fontSize: 18, color: theme.textSub, fontFamily: 'Raleway_400Regular' }}>
        Journal coming soon.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});