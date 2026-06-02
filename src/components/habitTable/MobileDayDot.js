import React from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';

export default function MobileDayDot({ state, isToday, isCurrentWeek, onToggle, onBlock, dayInitial, s, theme }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: false }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => { pop(); onToggle(); }}
      onLongPress={() => { pop(); onBlock(); }}
      disabled={!isCurrentWeek}
      style={[
        s.mobileDayDot,
        isToday && s.mobileDayDotToday,
        state === 'checked' && !isToday && s.mobileDayDotChecked,
        state === 'checked' && isToday && s.mobileDayDotCheckedToday,
        state === 'blocked' && s.mobileDayDotBlocked,
        !isCurrentWeek && { opacity: 0.7 },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === 'blocked' ? (
          <Text style={s.mobileBlockMark}>✕</Text>
        ) : (
          <Text style={[
            s.mobileDayLabel,
            state === 'checked' && !isToday && s.mobileDayLabelChecked,
            state === 'checked' && isToday && { color: '#0d1f0d' },
            state === 'empty' && isToday && { color: theme.todayText },
          ]}>
            {dayInitial}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}