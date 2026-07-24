import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { SCRYFALL_USER_AGENT, setSymbolUrl } from "../lib/images";

// Fetched manually (not SvgUri) so the request can carry our User-Agent —
// Scryfall rejects generic HTTP-library agents (see lib/images.ts).
async function fetchSvg(uri: string): Promise<string | null> {
  const res = await fetch(uri, { headers: { "User-Agent": SCRYFALL_USER_AGENT } });
  if (!res.ok) return null;
  return res.text();
}

/**
 * A set's expansion symbol (Scryfall's per-set SVG) in a light circular badge,
 * so the black glyph stays readable over card art and in dark mode alike.
 */
export function SetSymbol({ code, size = 28 }: { code: string; size?: number }) {
  const uri = setSymbolUrl(code);
  const svg = useQuery({
    queryKey: ["set-symbol", code.toLowerCase()],
    queryFn: () => fetchSvg(uri as string),
    enabled: !!uri,
    staleTime: Infinity,
  });

  if (!svg.data) return null;
  const glyph = size * 0.62;
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <SvgXml xml={svg.data} width={glyph} height={glyph} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
});
