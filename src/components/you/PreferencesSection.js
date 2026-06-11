import React from 'react';
import { View, Text, Switch } from 'react-native';
import SectionLabel from '../shared/SectionLabel';

function PreferenceGroup({ label, theme, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        fontSize: 10, fontFamily: 'Raleway_600SemiBold', color: theme.textSub,
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
      }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: theme.surface, borderRadius: 12,
        borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

function PreferenceRow({ label, sub, value, onToggle, theme }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Raleway_600SemiBold' }}>
          {label}
        </Text>
        {sub && (
          <Text style={{ color: theme.textSub, fontSize: 12, fontFamily: 'Raleway_400Regular', marginTop: 2 }}>
            {sub}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

export default function PreferencesSection({
  theme, gridLines, toggleGridLines, editPastWeeks, toggleEditPastWeeks,
  highlightsPermanent, toggleHighlightsPermanent, isMobile,
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <SectionLabel text="Preferences" theme={theme} />
      <PreferenceGroup label="Compound Table" theme={theme}>
        {!isMobile && (
          <PreferenceRow
            label="Grid Lines"
            sub="Show column separators on the habit table"
            value={gridLines}
            onToggle={toggleGridLines}
            theme={theme}
          />
        )}
        <PreferenceRow
          label="Edit Past Weeks"
          sub="Allow checking and skipping days from previous weeks"
          value={editPastWeeks}
          onToggle={toggleEditPastWeeks}
          theme={theme}
        />
        <PreferenceRow
          label="Permanent Highlights"
          sub="Highlights persist until manually removed instead of resetting every Sunday"
          value={highlightsPermanent}
          onToggle={toggleHighlightsPermanent}
          theme={theme}
        />
      </PreferenceGroup>
    </View>
  );
}