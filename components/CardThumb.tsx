import { Image } from "expo-image";

import { cardImageUrl, SCRYFALL_USER_AGENT, type CardImageSize } from "../lib/images";
import { useTheme } from "../lib/theme/ThemeContext";

type Props = {
  imgSrc: string | null | undefined;
  size?: CardImageSize;
  width: number;
};

// Magic cards are 63x88mm -> ~0.717 aspect ratio.
const CARD_ASPECT = 0.717;

export function CardThumb({ imgSrc, size = "small", width }: Props) {
  const { colors } = useTheme();
  const uri = cardImageUrl(imgSrc, size);
  const height = width / CARD_ASPECT;
  return (
    <Image
      source={uri ? { uri, headers: { "User-Agent": SCRYFALL_USER_AGENT } } : undefined}
      style={{
        width,
        height,
        borderRadius: width * 0.06,
        backgroundColor: colors.imagePlaceholder,
      }}
      contentFit="contain"
    />
  );
}
