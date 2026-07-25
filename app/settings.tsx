import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { SegmentedControl } from "../components/SegmentedControl";
import { useTheme, useThemedStyles, type ThemeMode } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

const APPEARANCE: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function SettingsScreen() {
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Settings" }} />

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <SegmentedControl options={APPEARANCE} value={mode} onChange={setMode} size="large" />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background },
    content: { padding: 20, gap: 8 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
  });
