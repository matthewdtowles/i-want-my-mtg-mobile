import { Image } from "react-native";

import { cardImageUrl, type CardImageSize } from "../lib/images";

type Props = {
  imgSrc: string | null | undefined;
  size?: CardImageSize;
  width: number;
};

// Magic cards are 63x88mm -> ~0.717 aspect ratio.
const CARD_ASPECT = 0.717;

export function CardThumb({ imgSrc, size = "small", width }: Props) {
  const uri = cardImageUrl(imgSrc, size);
  const height = width / CARD_ASPECT;
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={{ width, height, borderRadius: width * 0.06, backgroundColor: "#e5e7eb" }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
