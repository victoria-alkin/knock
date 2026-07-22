import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

const W = 54;
const H = 32;
const PAD = 3;
const THUMB = H - PAD * 2;

/** A purple/white "liquid glass" toggle: a blurred track with a sliding thumb. */
export function GlassSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, W - THUMB - PAD],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={styles.track}
    >
      <BlurView tint="light" intensity={26} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[styles.fill, styles.offFill, { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      />
      <Animated.View style={[styles.fill, styles.onFill, { opacity: anim }]} />
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
  },
  fill: { ...StyleSheet.absoluteFillObject },
  offFill: { backgroundColor: 'rgba(214, 206, 233, 0.55)' },
  onFill: { backgroundColor: 'rgba(109, 40, 217, 0.82)' },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1F1438',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
