import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, View } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {
  useFonts,
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';

import HabitTable  from './src/screens/HabitTable';
import Analytics   from './src/screens/Analytics';
import Journal     from './src/screens/Journal';
import Gratitude   from './src/screens/Gratitude';
import Philosophy  from './src/screens/Philosophy';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
          screenOptions={{
            headerStyle:     { backgroundColor: theme.bg, height: 70 },
            headerTintColor: theme.text,
            headerTitle: ({ children }) => (
              <Text style={{ fontFamily: 'Raleway_700Bold', fontSize: 20, color: theme.text }}>
                {children}
              </Text>
            ),
            tabBarStyle: {
              backgroundColor: theme.bg,
              borderTopColor:  theme.border,
              height:          80,
              paddingBottom:   12,
              paddingTop:      8,
            },
            tabBarLabel: ({ children, color }) => (
              <Text style={{ fontFamily: 'Raleway_600SemiBold', fontSize: 14, color }}>
                {children}
              </Text>
            ),
            tabBarActiveTintColor:   theme.accent,
            tabBarInactiveTintColor: theme.textSub,
            headerRight: () => (
              <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 20, padding: 6 }}>
                <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
            ),
          }}
      >
        <Tab.Screen name="Habits"     component={HabitTable} />
        <Tab.Screen name="Analytics"  component={Analytics} />
        <Tab.Screen name="Journal"    component={Journal} />
        <Tab.Screen name="Gratitude"  component={Gratitude} />
        <Tab.Screen name="Philosophy" component={Philosophy} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Raleway_400Regular,
    Raleway_600SemiBold,
    Raleway_700Bold,
  });

  if (!fontsLoaded) return <View style={{ flex: 1 }} />;

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}