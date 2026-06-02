import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

export default function DesktopDayCell({ habitId, dayIndex, state, isToday, isCurrentWeek, onToggle, onBlock, s }) {
  const ref = React.useRef(null);
  const scale = React.useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: false }).start();
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !isCurrentWeek) return;
    const handler = (e) => { e.preventDefault(); pop(); onBlock(); };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [isCurrentWeek, onBlock]);

  return (
    <TouchableOpacity
      ref={ref}
      style={[s.dayCell, isToday && s.todayCell, !isCurrentWeek && { opacity: 0.7 }]}
      onPress={() => { pop(); onToggle(); }}
      disabled={!isCurrentWeek}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === 'checked' && <Text style={s.checkMark}>✓</Text>}
        {state === 'blocked' && <Text style={s.blockMark}>✕</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}