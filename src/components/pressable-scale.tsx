import { ReactNode, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  /** Visual style — applied to the scaled inner view. */
  style?: StyleProp<ViewStyle>;
  /** Layout style — applied to the outer pressable (e.g. flex: 1). */
  outerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: number;
  accessibilityLabel?: string;
};

/**
 * A Pressable that springs down slightly while held — the tactile "liquid
 * glass" press feel. Uses the native driver so it stays smooth.
 */
export function PressableScale({
  children,
  onPress,
  style,
  outerStyle,
  disabled,
  scaleTo = 0.96,
  hitSlop,
  accessibilityLabel,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number, bounciness: number) =>
    Animated.spring(scale, {
      toValue,
      bounciness,
      speed: 40,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(scaleTo, 0)}
      onPressOut={() => spring(1, 8)}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={outerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
