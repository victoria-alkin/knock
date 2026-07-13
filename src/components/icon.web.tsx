import { ColorValue, Image, ImageSourcePropType } from 'react-native';

/**
 * Web tinting via CSS mask instead of react-native-web's SVG-filter approach,
 * which collides across icons under static/server rendering (filter IDs are a
 * module counter, so the plus could pick up another icon's tint after hydration).
 */
export function Icon({
  source,
  size = 24,
  color,
}: {
  source: ImageSourcePropType;
  size?: number;
  color?: ColorValue;
}) {
  const uri = Image.resolveAssetSource(source)?.uri;

  if (!color || !uri) {
    return (
      <Image
        source={source}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const mask = `url("${uri}") center / contain no-repeat`;
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color as string,
        display: 'inline-block',
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
