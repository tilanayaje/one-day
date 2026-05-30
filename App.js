import { useEffect, useState } from 'react';
import { View, Modal, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { supabase } from './src/db/supabase';

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
import Login       from './src/screens/Login';
import You         from './src/screens/You';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigationRef = useNavigationContainerRef();

  const [session,      setSession]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Failsafe — if session check hangs, show login after 3s
    const timeout = setTimeout(() => setLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) return (
  <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 16 }}>Loading...</Text>
  </View>
  );
  if (!session) return <Login />;

  const goToYou = () => {
    setShowSettings(false);
    setTimeout(() => navigationRef.navigate('You'), 150);
  };

  return (
    <NavigationContainer ref={navigationRef}>
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
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={{ marginRight: 20, padding: 4 }}
            >
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: theme.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: theme.accentText, fontSize: 15, fontFamily: 'Raleway_700Bold' }}>
                  {session.user.user_metadata?.full_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      >
        <Tab.Screen name="Habits"     component={HabitTable} />
        <Tab.Screen name="Analytics"  component={Analytics} />
        <Tab.Screen name="Journal"    component={Journal} />
        <Tab.Screen name="Gratitude"  component={Gratitude} />
        <Tab.Screen name="Philosophy" component={Philosophy} />
        <Tab.Screen
          name="You"
          component={You}
          options={{ tabBarButton: () => null }}
        />
      </Tab.Navigator>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View style={{
            position: 'absolute',
            top: 70,
            right: 16,
            backgroundColor: theme.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            width: 280,
            overflow: 'hidden',
          }}>

            {/* Profile */}
            <View style={{
              padding: 20,
              borderBottomWidth: 1,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: theme.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: theme.accentText, fontSize: 18, fontFamily: 'Raleway_700Bold' }}>
                  {session.user.user_metadata?.full_name?.[0] ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: 'Raleway_600SemiBold', fontSize: 14 }} numberOfLines={1}>
                  {session.user.user_metadata?.full_name ?? 'User'}
                </Text>
                <Text style={{ color: theme.textSub, fontFamily: 'Raleway_400Regular', fontSize: 12 }} numberOfLines={1}>
                  {session.user.email}
                </Text>
              </View>
            </View>

            {/* You */}
            <TouchableOpacity
              onPress={goToYou}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 18,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontFamily: 'Raleway_600SemiBold', fontSize: 14 }}>
                You
              </Text>
              <Text style={{ color: theme.textSub, fontSize: 16 }}>→</Text>
            </TouchableOpacity>

            {/* Dark Mode */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 18,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontFamily: 'Raleway_600SemiBold', fontSize: 14 }}>
                Dark Mode
              </Text>
              <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={async () => {
                setShowSettings(false);
                await supabase.auth.signOut();
              }}
              style={{ padding: 18 }}
            >
              <Text style={{ color: theme.delete, fontFamily: 'Raleway_600SemiBold', fontSize: 14 }}>
                Sign Out
              </Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(Platform.OS === 'web' ? {} : {
    Raleway_400Regular,
    Raleway_600SemiBold,
    Raleway_700Bold,
  });

  if (!fontsLoaded && Platform.OS !== 'web') return <View style={{ flex: 1 }} />;

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}