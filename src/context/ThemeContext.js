import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPreference, setPreference } from '../db/database';
import { supabase } from '../db/supabase';

const ThemeContext = createContext();

const light = {
  bg: '#ece3d0', surface: '#faf6ec', border: '#d4c4a8',
  text: '#2e2820', textSub: '#7a6f5d',
  accent: '#1a6fd4', accentText: '#ffffff',
  checkMark: '#2e2820', delete: '#c0392b', error: '#c0392b',
  today: '#e3d9c0', todayText: '#1a6fd4',
  sumRow: '#e6dcc8', orderBtn: '#a89878',
  rowColorOpacity: 'bb',
  gold: '#b8860b', success: '#3d8b40',
  accentSoft: '#1a6fd41f', successSoft: '#3d8b401f',
  labelStrong: '#5c5040',
};

const dark = {
  bg: '#0a0a0f', surface: '#111118', border: '#1e1e2e',
  text: '#cdd6f4', textSub: '#6c7086',
  accent: '#89b4fa', accentText: '#0a0a0f',
  checkMark: '#f9e2af', delete: '#f38ba8', error: '#f38ba8',
  today: '#1e1e3a', todayText: '#89b4fa',
  sumRow: '#0e0e14', orderBtn: '#585b70',
  rowColorOpacity: '2a',
  gold: '#f9e2af', success: '#a6e3a1',
  accentSoft: '#89b4fa1a', successSoft: '#a6e3a11a',
  labelStrong: '#6c7086',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark]                           = useState(true);
  const [gridLines, setGridLines]                     = useState(false);
  const [editPastWeeks, setEditPastWeeks]             = useState(false);
  const [highlightsPermanent, setHighlightsPermanent] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('gridLines').then(val => {
      if (val !== null) setGridLines(val === 'true');
    });
    AsyncStorage.getItem('darkMode').then(val => {
      if (val !== null) setIsDark(val === 'true');
    });
    AsyncStorage.getItem('editPastWeeks').then(val => {
      if (val !== null) setEditPastWeeks(val === 'true');
    });
    AsyncStorage.getItem('highlightsPermanent').then(val => {
      if (val !== null) setHighlightsPermanent(val === 'true');
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

  const toggleEditPastWeeks = () => {
    const next = !editPastWeeks;
    setEditPastWeeks(next);
    AsyncStorage.setItem('editPastWeeks', String(next));
  };

  const toggleHighlightsPermanent = () => {
    const next = !highlightsPermanent;
    setHighlightsPermanent(next);
    AsyncStorage.setItem('highlightsPermanent', String(next));
  };

  return (
    <ThemeContext.Provider value={{
      theme: isDark ? dark : light, isDark, toggleTheme,
      gridLines, toggleGridLines,
      editPastWeeks, toggleEditPastWeeks,
      highlightsPermanent, toggleHighlightsPermanent,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}