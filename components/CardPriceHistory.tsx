import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { cardPriceHistoryKey, fetchCardPriceHistory } from "../lib/api/catalog";
import type { ApiPriceHistoryPoint } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardPanel } from "./CardPanel";
import { Chip } from "./Chip";
import { ErrorState } from "./ErrorState";

type Finish = "normal" | "foil";

/** Line colors mirroring the web app's price chart (teal normal / purple foil). */
const LINE_COLORS = {
  light: { normal: "#0d9488", foil: "#7c3aed" },
  dark: { normal: "#2cc8ca", foil: "#a95de0" },
};

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
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [days, setDays] = useState(90);
  const [finish, setFinish] = useState<Finish>(hasNonFoil ? "normal" : "foil");
  const lineColor = LINE_COLORS[scheme][finish];

  const query = useQuery({
    queryKey: cardPriceHistoryKey(cardId, days),
    queryFn: () => fetchCardPriceHistory(cardId, days),
  });

  const series = useMemo(
    () => buildSeries(query.data ?? [], finish),
    [query.data, finish],
  );

  return (
    <CardPanel
      title="Price history"
      headerRight={
        series.current != null ? (
          <Text style={styles.current}>{formatPrice(series.current)}</Text>
        ) : null
      }
    >
      <View style={styles.chips}>
        {RANGES.map((r) => (
          <Chip
            key={r.days}
            label={r.label}
            active={days === r.days}
            onPress={() => setDays(r.days)}
            size="small"
          />
        ))}
        {hasNonFoil && hasFoil ? (
          <View style={styles.finishChips}>
            {(["normal", "foil"] as const).map((f) => (
              <Chip
                key={f}
                label={f === "normal" ? "Normal" : "Foil"}
                active={finish === f}
                onPress={() => setFinish(f)}
                size="small"
              />
            ))}
          </View>
        ) : null}
      </View>

      {query.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.accent} />
      ) : query.isError ? (
        <View style={styles.state}>
          <ErrorState
            variant="inline"
            message="Couldn’t load price history."
            onRetry={() => query.refetch()}
          />
        </View>
      ) : series.definedCount < 2 ? (
        <Text style={styles.empty}>Not enough price history yet.</Text>
      ) : (
        <Chart series={series} color={lineColor} styles={styles} />
      )}
    </CardPanel>
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

/** Breathing room so the line/points never touch (or clip at) the chart edges. */
const CHART_PAD = 4;
const STROKE_WIDTH = 2;

function Chart({
  series,
  color,
  styles,
}: {
  series: Series;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const range = series.max - series.min || 1;
  const count = series.points.length;
  const plotHeight = CHART_HEIGHT - CHART_PAD * 2;
  const plotWidth = width - CHART_PAD * 2;

  // Keep only days that have a price, then draw one continuous line through
  // them. Missing days are skipped entirely — the line passes straight from one
  // real point to the next rather than breaking or dipping to zero.
  const coords = series.points
    .map((p, i) => {
      if (p.value == null) return null;
      const x = CHART_PAD + (count <= 1 ? 0 : (i / (count - 1)) * plotWidth);
      const y = CHART_PAD + (1 - (p.value - series.min) / range) * plotHeight;
      return { x, y };
    })
    .filter((c): c is { x: number; y: number } => c != null);

  return (
    <View>
      <View style={styles.chart} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            {coords.length === 1 ? (
              <Circle cx={coords[0].x} cy={coords[0].y} r={STROKE_WIDTH} fill={color} />
            ) : (
              <Polyline
                points={coords.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </Svg>
        ) : null}
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
    current: { fontSize: 16, fontWeight: "700", color: colors.success },
    // CardPanel's heading row carries 8 of the 10px gap the chips used to add.
    chips: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" },
    finishChips: { flexDirection: "row", gap: 8, marginLeft: "auto" },
    state: { marginTop: 16 },
    empty: { marginTop: 16, color: colors.textMuted, fontSize: 14 },
    chart: {
      height: CHART_HEIGHT,
      marginTop: 16,
    },
    axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    axis: { fontSize: 11, color: colors.textMuted },
  });
