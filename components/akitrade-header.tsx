import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useColors } from "@/hooks/use-colors";

export function AkiTradeHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.65 : 1 }]}>
        <Text style={[styles.backText, { color: colors.foreground }]}>‹</Text>
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 14, marginBottom: 18 },
  back: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 13 },
  backText: { fontSize: 32, lineHeight: 33, fontWeight: "300", marginTop: -3 },
  copy: { flex: 1 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: "900", letterSpacing: -0.25 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 1 },
});
