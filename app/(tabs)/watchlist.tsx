import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BuyListView } from "../../components/BuyListView";
import { PriceAlertsView } from "../../components/PriceAlertsView";
import { SegmentedControl } from "../../components/SegmentedControl";
import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../lib/auth/AuthContext";
import { useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

type Tab = "buy" | "alerts";

export default function WatchlistScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Watch prices like a hawk"
        message="Sign in to keep a buy-list and get alerts when a card hits your target price."
      />
    );
  }
  return <WatchlistTabs />;
}

function WatchlistTabs() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <SegmentedControl
          options={[
            { label: "Buy-list", value: "buy" },
            { label: "Price alerts", value: "alerts" },
          ]}
          value={tab}
          onChange={setTab}
          size="compact"
          style={styles.segment}
        />
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
    segment: { flex: 1 },
    import: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  });
