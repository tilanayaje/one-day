import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from 'react-native';

export default function Gratitude() {
  const { theme } = useTheme();
  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <Text style={{ fontSize: 18, color: theme.textSub, fontFamily: 'Raleway_400Regular' }}>
        Daily Gratitude coming soon.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});