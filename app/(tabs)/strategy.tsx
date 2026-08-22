import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { Card, EmptyState, LoadingState, PrimaryButton, SectionTitle, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function StrategyScreen() {
  return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><StrategyContent /></AkiTradeAuthGate></ScreenContainer>;
}

function StrategyContent() {
  const colors = useColors();
  const workspace = trpc.trading.workspace.useQuery();
  if (workspace.isLoading) return <LoadingState label="Loading strategy and guardrails…" />;
  if (!workspace.data) return <EmptyState title="Strategy unavailable" detail="Your secure workspace could not load its paper strategy configuration." />;
  const active = workspace.data.strategies.find((strategy) => strategy.isActive) ?? workspace.data.strategies[0];
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>SIMULATION SETUP</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Strategy</Text>
      <Card style={styles.strategyCard}>
        <View style={styles.topRow}><View><Text style={[styles.strategyName, { color: colors.foreground }]}>{active?.name ?? "No strategy"}</Text><Text style={[styles.detail, { color: colors.muted }]}>{active?.strategyType.replaceAll("_", " ") ?? "Configure a paper strategy"}</Text></View><StatusPill label={active?.isActive ? "ACTIVE" : "PAUSED"} tone={active?.isActive ? "success" : "warning"} /></View>
        <Text style={[styles.note, { color: colors.muted }]}>Every automated paper entry must first be a BUY or SELL decision from this strategy and then independently pass the risk gate. Low-conviction output remains WAIT.</Text>
        <PrimaryButton label="Edit strategy" onPress={() => router.push("/strategy-settings" as never)} tone="secondary" />
      </Card>
      <SectionTitle title="Enabled instruments" />
      <Card>
        {workspace.data.instruments.map((instrument) => <View key={instrument.id} style={styles.instrument}><Text style={[styles.instrumentName, { color: colors.foreground }]}>{instrument.symbol}</Text><StatusPill label={instrument.enabled ? "ENABLED" : "DISABLED"} tone={instrument.enabled ? "success" : "warning"} /></View>)}
      </Card>
      <SectionTitle title="Risk guardrails" />
      <Card style={styles.guardrails}>
        <View><Text style={[styles.guardrailValue, { color: colors.foreground }]}>{workspace.data.risk.maxRiskPerTradePercent}%</Text><Text style={[styles.detail, { color: colors.muted }]}>maximum risk per paper trade</Text></View>
        <View><Text style={[styles.guardrailValue, { color: colors.foreground }]}>{workspace.data.risk.maxTradesPerDay}</Text><Text style={[styles.detail, { color: colors.muted }]}>maximum paper trades per day</Text></View>
        <PrimaryButton label="Manage risk controls" onPress={() => router.push("/risk-controls" as never)} tone="secondary" />
      </Card>
      <SectionTitle title="Research" />
      <Card style={styles.strategyCard}><Text style={[styles.strategyName, { color: colors.foreground }]}>Paper backtest</Text><Text style={[styles.note, { color: colors.muted }]}>Evaluate the configured strategy against the application’s clearly labelled deterministic paper data. This does not connect to a broker or estimate future profitability.</Text><PrimaryButton label="Open backtest" onPress={() => router.push("/backtest" as never)} /></Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 32 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.5, marginBottom: 18 },
  strategyCard: { gap: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  strategyName: { fontSize: 17, lineHeight: 23, fontWeight: "900", textTransform: "capitalize" },
  detail: { marginTop: 2, fontSize: 12, lineHeight: 17, textTransform: "capitalize" },
  note: { fontSize: 13, lineHeight: 19 },
  instrument: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  instrumentName: { fontSize: 15, fontWeight: "800" },
  guardrails: { gap: 12 },
  guardrailValue: { fontSize: 22, lineHeight: 28, fontWeight: "900", fontVariant: ["tabular-nums"] },
});
