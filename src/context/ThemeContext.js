import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  rowColorOpacity: 'bb',
  bg:          '#ffffff',
  surface:     '#f7f7f7',
  border:      '#e0e0e0',
  text:        '#1a1a1a',
  textSub:     '#666666',
  today: '#90b8f8',
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
  checkMark: '#1a1a1a',
};

const dark = {
  rowColorOpacity: '2a',
  bg:          '#121212',
  surface:     '#1e1e1e',
  border:      '#333333',
  text:        '#e8e8e8',
  textSub:     '#999999',
  today: '#1a3a6e',
  todayText:   '#7ab4f5',
  goalMet:     '#0d2e0d',
  check:       '#66bb6a',
  delete:      '#ef5350',
  accent:      '#4a90d9',
  accentText:  '#ffffff',
  orderBtn:    '#555555',
  sumRow:      '#1a1a1a',
  dragging:    '#1a2e4a',
  error:       '#ef5350',
  checkMark: '#F5C518',
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