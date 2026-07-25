import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
} from "react-native-svg";

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
        <Chart
          series={series}
          color={lineColor}
          styles={styles}
          muted={colors.textMuted}
        />
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
/**
 * Left gutter the y-axis labels sit in. The plot starts after it, so the high
 * and low price line up with the top and bottom of the line's own range rather
 * than floating in a caption row.
 */
const AXIS_GUTTER = 48;

function Chart({
  series,
  color,
  styles,
  muted,
}: {
  series: Series;
  color: string;
  styles: ReturnType<typeof createStyles>;
  muted: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Index into `coords` of the touched/pinned point (persists after release,
  // mirroring the web app's chart). Guarded below in case the series shrinks.
  const [pinned, setPinned] = useState<number | null>(null);

  // A new series (finish/range switch, refetch) rebuilds `coords`, so a kept
  // index could silently point at a different day — clear the pin instead
  // (render-time reset, per React's derived-state pattern).
  const [prevSeries, setPrevSeries] = useState(series);
  if (prevSeries !== series) {
    setPrevSeries(series);
    setPinned(null);
  }

  const range = series.max - series.min || 1;
  const count = series.points.length;
  const plotHeight = CHART_HEIGHT - CHART_PAD * 2;
  const plotWidth = Math.max(0, width - AXIS_GUTTER - CHART_PAD);
  const baseline = CHART_HEIGHT - CHART_PAD;

  // Keep only days that have a price, then draw one continuous line through
  // them. Missing days are skipped entirely — the line passes straight from one
  // real point to the next rather than breaking or dipping to zero.
  const coords = series.points
    .map((p, i) => {
      if (p.value == null) return null;
      const x = AXIS_GUTTER + (count <= 1 ? 0 : (i / (count - 1)) * plotWidth);
      const y = CHART_PAD + (1 - (p.value - series.min) / range) * plotHeight;
      return { x, y, date: p.date, value: p.value };
    })
    .filter((c): c is { x: number; y: number; date: string; value: number } => c != null);

  const pinnedPt = pinned != null ? coords[pinned] : undefined;

  // The line closed down to the baseline, so the shaded area reads as volume
  // under the curve rather than a second stroke.
  const areaPoints =
    coords.length > 1
      ? [
          `${coords[0].x},${baseline}`,
          ...coords.map((pt) => `${pt.x},${pt.y}`),
          `${coords[coords.length - 1].x},${baseline}`,
        ].join(" ")
      : "";

  // Touch or drag anywhere on the chart to pin the nearest real data point.
  function pinAt(x: number) {
    if (coords.length === 0) return;
    let best = 0;
    for (let i = 1; i < coords.length; i++) {
      if (Math.abs(coords[i].x - x) < Math.abs(coords[best].x - x)) best = i;
    }
    setPinned(best);
  }

  return (
    <View>
      <Text style={pinnedPt ? [styles.pin, { color }] : styles.pinHint}>
        {pinnedPt
          ? `${pinnedPt.date} · ${formatPrice(pinnedPt.value)}`
          : "Touch the chart to inspect a day"}
      </Text>
      <View
        style={styles.chart}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pinAt(e.nativeEvent.locationX)}
        onResponderMove={(e) => pinAt(e.nativeEvent.locationX)}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.35} />
                <Stop offset="1" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {areaPoints ? <Polygon points={areaPoints} fill="url(#priceArea)" /> : null}
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
            {pinnedPt ? (
              <>
                <Line
                  x1={pinnedPt.x}
                  y1={CHART_PAD}
                  x2={pinnedPt.x}
                  y2={CHART_HEIGHT - CHART_PAD}
                  stroke={muted}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Circle cx={pinnedPt.x} cy={pinnedPt.y} r={4.5} fill={color} />
              </>
            ) : null}
          </Svg>
        ) : null}

        {/* The y-axis labels live in the gutter at the exact heights the high
            and low map to, so price reads against the vertical axis. */}
        <Text style={[styles.yAxis, styles.yAxisMax]}>{formatPrice(series.max)}</Text>
        <Text style={[styles.yAxis, styles.yAxisMin]}>{formatPrice(series.min)}</Text>
      </View>

      {/* The x-axis labels start where the plot starts, so earliest sits under
          the first point and latest under the last. */}
      <View style={[styles.xAxisRow, { marginLeft: AXIS_GUTTER }]}>
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
      marginTop: 6,
    },
    pin: { marginTop: 12, fontSize: 13, fontWeight: "700" },
    pinHint: { marginTop: 12, fontSize: 12, color: colors.textMuted },
    xAxisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    axis: { fontSize: 11, color: colors.textMuted },
    yAxis: {
      position: "absolute",
      left: 0,
      width: AXIS_GUTTER - 8,
      textAlign: "right",
      fontSize: 11,
      color: colors.textMuted,
    },
    // Nudged by half a line-height so each label's center sits on its gridline.
    yAxisMax: { top: CHART_PAD - 7 },
    yAxisMin: { top: CHART_HEIGHT - CHART_PAD - 7 },
  });
