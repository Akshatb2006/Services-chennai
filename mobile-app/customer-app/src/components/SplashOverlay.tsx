import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { colors, motion } from "@/theme";
import { Wordmark } from "./Logo";

const ease = Easing.bezier(...motion.easing);

/**
 * Branded hand-off from the native splash (same Carbon Ink background):
 * wordmark rises in once, then the overlay fades away. Skipped animation under Reduce Motion.
 */
export function SplashOverlay({ ready, onDone }: { ready: boolean; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const enter = useSharedValue(reduced ? 1 : 0);
  const exit = useSharedValue(1);
  const finish = () => {
    setVisible(false);
    onDone?.();
  };

  useEffect(() => {
    if (!reduced) enter.value = withTiming(1, { duration: motion.slow, easing: ease });
  }, [enter, reduced]);

  useEffect(() => {
    if (!ready) return;
    exit.value = withDelay(reduced ? 0 : 450, withTiming(0, { duration: reduced ? 1 : motion.base, easing: ease }, (done) => {
      if (done) scheduleOnRN(finish);
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when ready flips
  }, [ready]);

  const container = useAnimatedStyle(() => ({ opacity: exit.value }));
  const mark = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 12 }] }));

  if (!visible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, container]} pointerEvents="none" aria-hidden>
      <Animated.View style={mark}>
        <Wordmark tone="light" size={40} />
      </Animated.View>
      <View style={styles.dot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", zIndex: 10 },
  dot: { position: "absolute", bottom: 64, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.citrus },
});
