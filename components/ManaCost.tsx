import { StyleSheet, Text, View, type TextStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import { parseManaSymbols } from "../lib/mana/parse";
import { MANA_SYMBOL_SVGS } from "../lib/mana/symbols";
import { useTheme } from "../lib/theme/ThemeContext";

type Props = {
  manaCost: string | null | undefined;
  /** Symbol diameter in points. */
  size?: number;
  /** Style for the leftover text (split-card separators, unknown symbols). */
  textStyle?: TextStyle;
};

/** Renders a cost - "{2}{G/W}{R}" - as a row of Scryfall mana symbol artwork. */
export function ManaCost({ manaCost, size = 16, textStyle }: Props) {
  const { colors } = useTheme();
  // A cost is symbols and separators only, so the gaps between them carry no
  // meaning; oracle text is the case where whitespace has to survive.
  const tokens = parseManaSymbols(manaCost).filter(
    (token) => token.kind === "symbol" || token.text.trim() !== "",
  );
  if (tokens.length === 0) return null;

  return (
    <View style={styles.row}>
      {tokens.map((token, index) =>
        token.kind === "symbol" ? (
          <SvgXml
            key={index}
            xml={MANA_SYMBOL_SVGS[token.code]}
            width={size}
            height={size}
          />
        ) : (
          <Text
            key={index}
            style={[{ fontSize: size, color: colors.textSecondary }, textStyle]}
          >
            {token.text.trim()}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2 },
});
