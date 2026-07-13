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
      style={[{ width: size, height: size }, color ? { tintColor: color } : null]}
    />
  );
}
