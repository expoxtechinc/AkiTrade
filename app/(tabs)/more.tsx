import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { Card, LoadingState, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const destinations = [
  { label: "Performance", detail: "Paper results and risk statistics", route: "/performance" },
  { label: "Notifications", detail: "Trade and risk-limit alerts", route: "/notifications" },
  { label: "Broker connections", detail: "Prepare authorized account links without passwords", route: "/broker-connections" },
  { label: "Connection", detail: "MT5 bridge capability and health", route: "/connection" },
  { label: "Settings & security", detail: "Session, privacy, and paper-mode lock", route: "/settings" },
] as const;

export default function MoreScreen() {
  return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><MoreContent /></AkiTradeAuthGate></ScreenContainer>;
}

function MoreContent() {
  const colors = useColors();
  const bridge = trpc.trading.mt5BridgeHealth.useQuery();
  if (bridge.isLoading) return <LoadingState label="Checking secure connection status…" />;
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>WORKSPACE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
      <Card style={styles.connectionCard}>
        <View style={styles.row}><View><Text style={[styles.connectionTitle, { color: colors.foreground }]}>MT5 bridge</Text><Text style={[styles.detail, { color: colors.muted }]}>No live execution path in version one</Text></View><StatusPill label={bridge.data?.state.replaceAll("_", " ").toUpperCase() ?? "OFFLINE"} tone="warning" /></View>
        <Text style={[styles.detail, { color: colors.muted }]}>A future terminal-side bridge is isolated from this mobile client. Exness passwords, account credentials, and API secrets are not stored in the app.</Text>
      </Card>
      <View style={styles.menu}>
        {destinations.map((item) => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><View><Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.detail, { color: colors.muted }]}>{item.detail}</Text></View><Text style={[styles.chevron, { color: colors.muted }]}>›</Text></Pressable>)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 32 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.5, marginBottom: 18 },
  connectionCard: { gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  connectionTitle: { fontSize: 17, fontWeight: "900" },
  detail: { marginTop: 3, fontSize: 12, lineHeight: 18 },
  menu: { marginTop: 18, gap: 10 },
  menuItem: { minHeight: 74, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  chevron: { fontSize: 29, fontWeight: "300" },
});
