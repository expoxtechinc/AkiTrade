import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getDashboardLoadingCopy, type DashboardLoadingPhase } from "@/lib/dashboard-loading";

export function DashboardLoadingState({ phase = "loading" }: { phase?: DashboardLoadingPhase }) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;
  const dotPulses = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const copy = getDashboardLoadingCopy(phase);

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const dotAnimations = dotPulses.map((pulse, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]),
      ),
    );

    shimmerAnimation.start();
    dotAnimations.forEach((animation) => animation.start());
    return () => {
      shimmerAnimation.stop();
      dotAnimations.forEach((animation) => animation.stop());
    };
  }, [dotPulses, shimmer]);

  const skeletonOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.78] });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={copy.detail}
      accessibilityLiveRegion="polite"
      style={styles.wrap}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.mark, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.markText, { color: colors.primary }]}>AKI</Text>
          </View>
          <View style={styles.copyBlock}>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>{copy.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
          </View>
        </View>
        <View style={styles.dots} accessibilityElementsHidden>
          {dotPulses.map((pulse, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.26, 1] }),
                  transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.detail, { color: colors.muted }]}>{copy.detail}</Text>

      <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Animated.View style={[styles.skeletonLabel, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
        <Animated.View style={[styles.skeletonHeadline, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
        <Animated.View style={[styles.skeletonAction, { backgroundColor: colors.primary, opacity: skeletonOpacity }]} />
      </View>

      <View style={styles.metricPair}>
        {["balance", "equity"].map((metric) => (
          <View key={metric} style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Animated.View style={[styles.metricLabel, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
            <Animated.View style={[styles.metricValue, { backgroundColor: colors.border, opacity: skeletonOpacity }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function DashboardRefreshIndicator() {
  return <DashboardLoadingState phase="refreshing" />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 14, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  brandRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  mark: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  markText: { fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  copyBlock: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 0.9 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "900", letterSpacing: -0.35 },
  detail: { fontSize: 13, lineHeight: 19 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  skeletonCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  skeletonLabel: { width: "28%", height: 11, borderRadius: 6 },
  skeletonHeadline: { width: "68%", height: 24, borderRadius: 8 },
  skeletonLine: { width: "92%", height: 12, borderRadius: 6 },
  skeletonAction: { marginTop: 2, width: "100%", height: 48, borderRadius: 14 },
  metricPair: { flexDirection: "row", gap: 14 },
  metricCard: { flex: 1, minHeight: 112, borderWidth: 1, borderRadius: 20, padding: 16, justifyContent: "center", gap: 12 },
  metricLabel: { width: "52%", height: 11, borderRadius: 6 },
  metricValue: { width: "82%", height: 23, borderRadius: 8 },
});
