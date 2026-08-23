import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { formatPrice, listPrice } from "../lib/format";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  prices: { normal?: number | null; foil?: number | null } | null | undefined;
  /** The surrounding surface's price text style, so each list keeps its own size. */
  style?: StyleProp<TextStyle>;
};

/**
 * A card's list price, labelled `foil` when that is the finish it came from.
 *
 * The label is the reason this is a component rather than three calls to
 * `formatPrice(listPrice(...).value)`. A foil price is not the price of the
 * normal printing, so showing it bare can read as the normal price and drive a
 * bad buy - and getting the fallback right while forgetting the label is an
 * easy thing for a new surface to do, because the value alone looks correct.
 * Binding the two together means a surface cannot take one without the other.
 *
 * The label is a nested `Text`, so it stays on the price's own line and does
 * not change the height of a grid cell or a row. Note it deliberately does not
 * reuse the `✦` glyph: in the binder grid that already means "you own a foil
 * copy", which is a different claim about a different thing.
 */
export function CardPrice({ prices, style }: Props) {
  const styles = useThemedStyles(createStyles);
  const { value, isFoil } = listPrice(prices);
  return (
    <Text style={style} numberOfLines={1}>
      {formatPrice(value)}
      {isFoil ? <Text style={styles.foil}> foil</Text> : null}
    </Text>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    foil: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  });
