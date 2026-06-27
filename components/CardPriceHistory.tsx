import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchCardPriceHistory } from "../lib/api/catalog";
import type { ApiPriceHistoryPoint } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Finish = "normal" | "foil";

const RANGES: { label: string; days: number }[] = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

const CHART_HEIGHT = 120;

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

export function CardPriceHistory({ cardId, hasNonFoil, hasFoil }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [days, setDays] = useState(90);
  const [finish, setFinish] = useState<Finish>(hasNonFoil ? "normal" : "foil");

  const query = useQuery({
    queryKey: ["card", cardId, "price-history", days],
    queryFn: () => fetchCardPriceHistory(cardId, days),
  });

  const series = useMemo(
    () => buildSeries(query.data ?? [], finish),
    [query.data, finish],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Price history</Text>
        {series.current != null ? (
          <Text style={styles.current}>{formatPrice(series.current)}</Text>
        ) : null}
      </View>

      <View style={styles.chips}>
        {RANGES.map((r) => {
          const active = days === r.days;
          return (
            <Chip
              key={r.days}
              label={r.label}
              active={active}
              onPress={() => setDays(r.days)}
              styles={styles}
            />
          );
        })}
        {hasNonFoil && hasFoil ? (
          <View style={styles.finishChips}>
            {(["normal", "foil"] as const).map((f) => (
              <Chip
                key={f}
                label={f === "normal" ? "Normal" : "Foil"}
                active={finish === f}
                onPress={() => setFinish(f)}
                styles={styles}
              />
            ))}
          </View>
        ) : null}
      </View>

      {query.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.accent} />
      ) : query.isError ? (
        <View style={styles.state}>
          <Text style={styles.muted}>Couldn’t load price history.</Text>
          <Pressable
            onPress={() => query.refetch()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : series.definedCount < 2 ? (
        <Text style={styles.empty}>Not enough price history yet.</Text>
      ) : (
        <Chart series={series} color={colors.accent} styles={styles} />
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

type Series = {
  points: { date: string; value: number | undefined }[];
  /** How many points actually have a value for the selected finish. */
  definedCount: number;
  min: number;
  max: number;
  current: number | undefined;
  first?: string;
  last?: string;
};

function buildSeries(data: ApiPriceHistoryPoint[], finish: Finish): Series {
  const points = data.map((p) => ({
    date: p.date,
    value: finish === "foil" ? p.foil : p.normal,
  }));
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  let current: number | undefined;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value != null) {
      current = points[i].value;
      break;
    }
  }
  return {
    points,
    definedCount: values.length,
    min,
    max,
    current,
    first: points[0]?.date,
    last: points[points.length - 1]?.date,
  };
}

function Chart({
  series,
  color,
  styles,
}: {
  series: Series;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const range = series.max - series.min || 1;
  return (
    <View>
      <View style={styles.chart}>
        {series.points.map((p, i) => {
          const height =
            p.value == null ? 0 : Math.max(2, ((p.value - series.min) / range) * CHART_HEIGHT);
          return (
            <View
              key={`${p.date}-${i}`}
              style={[styles.bar, { height, backgroundColor: color }]}
            />
          );
        })}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axis}>{formatPrice(series.min)}</Text>
        <Text style={styles.axis}>{formatPrice(series.max)}</Text>
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axis}>{series.first ?? ""}</Text>
        <Text style={styles.axis}>{series.last ?? ""}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      backgroundColor: colors.surface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heading: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    current: { fontSize: 16, fontWeight: "700", color: colors.success },
    chips: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
    finishChips: { flexDirection: "row", gap: 8, marginLeft: "auto" },
    chip: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.onAccent },
    state: { marginTop: 16, alignItems: "center", gap: 8 },
    muted: { color: colors.textMuted, fontSize: 14 },
    retry: { color: colors.accent, fontSize: 14, fontWeight: "600" },
    empty: { marginTop: 16, color: colors.textMuted, fontSize: 14 },
    chart: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: CHART_HEIGHT,
      marginTop: 16,
      gap: 1,
    },
    bar: { flex: 1, borderRadius: 1, minWidth: 1 },
    axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    axis: { fontSize: 11, color: colors.textMuted },
  });
