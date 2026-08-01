import { Text, type TextStyle, type StyleProp } from "react-native";
import { SvgXml } from "react-native-svg";

import { parseManaSymbols } from "../lib/mana/parse";
import { MANA_SYMBOL_SVGS } from "../lib/mana/symbols";

type Props = {
  text: string | null | undefined;
  style?: StyleProp<TextStyle>;
  /** Symbol diameter in points; keep it near the text's fontSize. */
  size?: number;
};

/**
 * Renders prose with mana symbols in it - oracle text like
 * "{T}: Add {R}." - flowing the artwork inline with the wrapping text.
 */
export function ManaText({ text, style, size = 14 }: Props) {
  const tokens = parseManaSymbols(text);
  if (tokens.length === 0) return null;

  return (
    <Text style={style}>
      {tokens.map((token, index) =>
        token.kind === "symbol" ? (
          <SvgXml
            key={index}
            xml={MANA_SYMBOL_SVGS[token.code]}
            width={size}
            height={size}
          />
        ) : (
          <Text key={index}>{token.text}</Text>
        ),
      )}
    </Text>
  );
}
