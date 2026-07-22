import { ColorValue, Image, ImageSourcePropType } from 'react-native';

/** Renders a PNG glyph, optionally tinted to a color. */
export function Icon({
  source,
  size = 24,
  color,
}: {
  source: ImageSourcePropType;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      // Pass as a prop (not style); react-native-web 0.21 ignores style.tintColor.
      tintColor={color}
      style={{ width: size, height: size }}
    />
  );
}
