import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function formatMoney(value: number, currency = "USD") {
  const amount = Number.isFinite(value) ? value : 0;
  const sign = amount > 0 ? "+" : "";
  return `${sign}${currency === "USD" ? "$" : `${currency} `}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.replace("$-", "-$");
}

export function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function StatusPill({ label, tone = "info" }: { label: string; tone?: "info" | "success" | "warning" | "error" }) {
  const colors = useColors();
  const palette = {
    info: { color: colors.primary, backgroundColor: `${colors.primary}18` },
    success: { color: colors.success, backgroundColor: `${colors.success}18` },
    warning: { color: colors.warning, backgroundColor: `${colors.warning}1F` },
    error: { color: colors.error, backgroundColor: `${colors.error}18` },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {action}
    </View>
  );
}

export function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
  const colors = useColors();
  const color = tone === "positive" ? colors.success : tone === "negative" ? colors.error : colors.foreground;
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, tone = "primary" }: { label: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "danger" | "secondary" }) {
  const colors = useColors();
  const backgroundColor = tone === "danger" ? colors.error : tone === "secondary" ? colors.surface : colors.primary;
  const borderColor = tone === "secondary" ? colors.border : backgroundColor;
  const textColor = tone === "secondary" ? colors.foreground : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, opacity: disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !disabled ? 0.98 : 1 }] },
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = "Loading secure workspace…" }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.stateText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  const colors = useColors();
  return (
    <Card style={styles.emptyCard}>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: colors.muted }]}>{detail}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  pill: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.25 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  metric: { flex: 1, gap: 4 },
  metricLabel: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  metricValue: { fontSize: 20, lineHeight: 26, fontWeight: "800", fontVariant: ["tabular-nums"] },
  button: { minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: "800" },
  centerState: { flex: 1, gap: 12, alignItems: "center", justifyContent: "center", padding: 32 },
  stateText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyDetail: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
