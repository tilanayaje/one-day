import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPreference, setPreference } from '../db/database';
import { supabase } from '../db/supabase';

const ThemeContext = createContext();

const light = {
  bg: '#ffffff', surface: '#f7f7f7', border: '#e0e0e0',
  text: '#1a1a1a', textSub: '#6b6b6b',
  accent: '#1a73e8', accentText: '#ffffff',
  checkMark: '#1a1a1a', delete: '#d93025', error: '#d93025',
  today: '#e8f0fe', todayText: '#1a73e8',
  sumRow: '#f0f0f0', orderBtn: '#999999',
  rowColorOpacity: 'bb',
};

const dark = {
  bg: '#0a0a0f', surface: '#111118', border: '#1e1e2e',
  text: '#cdd6f4', textSub: '#6c7086',
  accent: '#89b4fa', accentText: '#0a0a0f',
  checkMark: '#f9e2af', delete: '#f38ba8', error: '#f38ba8',
  today: '#1e1e3a', todayText: '#89b4fa',
  sumRow: '#0e0e14', orderBtn: '#585b70',
  rowColorOpacity: '2a',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark]         = useState(true);
  const [gridLines, setGridLines]   = useState(false);

  useEffect(() => {
    // Grid lines — AsyncStorage only
    AsyncStorage.getItem('gridLines').then(val => {
      if (val !== null) setGridLines(val === 'true');
    });

    // Dark mode — AsyncStorage first (instant), then Supabase only after auth confirmed
    AsyncStorage.getItem('darkMode').then(val => {
      if (val !== null) setIsDark(val === 'true');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        getPreference('darkMode').then(val => {
          if (val !== null) {
            setIsDark(val === 'true');
            AsyncStorage.setItem('darkMode', val);
          }
        }).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem('darkMode', String(next));
    setPreference('darkMode', String(next)).catch(() => {});
  };

  const toggleGridLines = () => {
    const next = !gridLines;
    setGridLines(next);
    AsyncStorage.setItem('gridLines', String(next));
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, isDark, toggleTheme, gridLines, toggleGridLines }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}