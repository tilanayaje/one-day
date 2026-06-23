import { useEffect, useState } from 'react';
import { View, Modal, Platform, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { supabase } from './src/db/supabase';
import { signInWithGoogle, seedDemoData } from './src/db/database';
import { fetchEncryptionKey, clearEncryptionKey } from './src/db/crypto';


import {
  useFonts,
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';

import HabitTable  from './src/screens/HabitTable';
import Analytics   from './src/screens/Analytics';
import Login       from './src/screens/Login';
import You         from './src/screens/You';
import AboutApp from './src/screens/AboutApp';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigationRef = useNavigationContainerRef();

  const [session,      setSession]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          await fetchEncryptionKey(session);
        }
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.is_anonymous) {
        const { data: habits } = await supabase.from('habits').select('id').limit(1);
        if (!habits || habits.length === 0) {
          await seedDemoData();
        }
      }
      if (session) {
        await fetchEncryptionKey(session);
      } else {
        clearEncryptionKey();
      }
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  const isGuest = session?.user?.is_anonymous ?? false;
  
  return (
    <View style={{ flex: 1 }}>
      {isGuest && (
        <View style={{
          backgroundColor: '#FFEB3B',
          paddingVertical: 8, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          width: '100%',
        }}>
          <Text style={{ color: '#000000', fontSize: 12, fontFamily: 'Raleway_400Regular', marginRight: 10 }}>
            Guest mode — sign in to create your own account
          </Text>
          <TouchableOpacity onPress={signInWithGoogle}>
            <Text style={{ color: '#000000', fontSize: 12, fontFamily: 'Raleway_700Bold', textDecorationLine: 'underline' }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
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
          <Tab.Screen name="Habits" component={HabitTable} options={{ title: 'Compound Table' }} />
          <Tab.Screen name="Analytics"  component={Analytics} />
          <Tab.Screen name="You" component={You} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, }}/>
          <Tab.Screen
            name="AboutApp"
            component={AboutApp}
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: { display: 'none' },
              title: 'About',
            }}
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

              {/* About */}
              <TouchableOpacity
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => navigationRef.navigate('AboutApp'), 150);
                }}
                style={{
                  padding: 18, borderBottomWidth: 1, borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontFamily: 'Raleway_600SemiBold', fontSize: 14 }}>About App</Text>
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
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(Platform.OS === 'web' ? {} : {
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