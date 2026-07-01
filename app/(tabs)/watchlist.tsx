import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BuyListView } from "../../components/BuyListView";
import { PriceAlertsView } from "../../components/PriceAlertsView";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

type Tab = "buy" | "alerts";

export default function WatchlistScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <View style={styles.segment}>
          {(["buy", "alerts"] as const).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setTab(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t === "buy" ? "Buy-list" : "Price alerts"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tab === "buy" ? (
          <Pressable
            hitSlop={8}
            onPress={() => router.push("/buy-list-import")}
            accessibilityRole="button"
            accessibilityLabel="Import buy-list from CSV"
          >
            <Text style={styles.import}>Import</Text>
          </Pressable>
        ) : null}
      </View>

      {tab === "buy" ? <BuyListView /> : <PriceAlertsView />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    segmentBtnActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    segmentTextActive: { color: colors.onAccent },
    import: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  });
