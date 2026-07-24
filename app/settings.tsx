import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { SegmentedControl } from "../components/SegmentedControl";
import {
  PAGE_SIZES,
  useSettings,
  type PageSize,
} from "../lib/settings/SettingsContext";
import { useTheme, useThemedStyles, type ThemeMode } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

const APPEARANCE: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const PAGE_SIZE_OPTIONS: { label: string; value: PageSize }[] = PAGE_SIZES.map(
  (s) => ({ label: String(s), value: s }),
);

export default function SettingsScreen() {
  const { mode, setMode } = useTheme();
  const { pageSize, setPageSize } = useSettings();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Settings" }} />

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <SegmentedControl options={APPEARANCE} value={mode} onChange={setMode} size="large" />

      <Text style={styles.sectionLabel}>CARDS PER PAGE</Text>
      <SegmentedControl
        options={PAGE_SIZE_OPTIONS}
        value={pageSize}
        onChange={setPageSize}
        size="large"
      />
      <Text style={styles.hint}>
        How many cards long lists (sets, inventory, transactions) load at a time.
        More rows scroll in automatically as you reach the end.
      </Text>
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
    hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  });
