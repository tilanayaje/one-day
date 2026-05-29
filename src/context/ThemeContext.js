import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  rowColorOpacity: 'bb',
  bg:          '#ffffff',
  surface:     '#f7f7f7',
  border:      '#e0e0e0',
  text:        '#1a1a1a',
  textSub:     '#666666',
  today:       '#90b8f8',
  todayText:   '#1a73e8',
  goalMet:     '#f0fff4',
  check:       '#2e7d32',
  delete:      '#cc0000',
  accent:      '#1a73e8',
  accentText:  '#ffffff',
  orderBtn:    '#aaaaaa',
  sumRow:      '#f0f0f0',
  dragging:    '#dde8ff',
  error:       '#cc0000',
  checkMark:   '#1a1a1a',
};

const dark = {
  rowColorOpacity: '2a',
  bg:          '#0a0a0f',
  surface:     '#111118',
  border:      '#1e1e2e',
  text:        '#cdd6f4',
  textSub:     '#6c7086',
  today:       '#1e1e3a',
  todayText:   '#89b4fa',
  goalMet:     '#0d1f0d',
  check:       '#a6e3a1',
  delete:      '#f38ba8',
  accent:      '#89b4fa',
  accentText:  '#1e1e2e',
  orderBtn:    '#45475a',
  sumRow:      '#0d0d14',
  dragging:    '#1e1e3a',
  error:       '#f38ba8',
  checkMark:   '#f9e2af',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@darkMode').then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('@darkMode', String(next));
  };

  const theme = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}