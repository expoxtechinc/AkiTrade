import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { Card, EmptyState, formatMoney, Metric, PrimaryButton, SectionTitle, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { haptic } from "@/lib/haptics";
import { showPaperAlert } from "@/lib/paper-notifications";
import { trpc } from "@/lib/trpc";

export default function OverviewScreen() {
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <AkiTradeAuthGate>
        <OverviewContent />
      </AkiTradeAuthGate>
    </ScreenContainer>
  );
}

function OverviewContent() {
  const colors = useColors();
  const overview = trpc.trading.overview.useQuery();
  const setAutomation = trpc.trading.setAutomation.useMutation({ onSuccess: () => overview.refetch() });
  const runCycle = trpc.trading.runDemoPaperCycle.useMutation({ onSuccess: () => overview.refetch() });
  const closeAll = trpc.trading.closeAllPaperPositions.useMutation({ onSuccess: () => overview.refetch() });
  const data = overview.data;

  const toggleAutomation = async () => {
    if (!data) return;
    haptic.light();
    try {
      await setAutomation.mutateAsync({ status: data.profile.automationStatus === "running" ? "stopped" : "running" });
      haptic.success();
    } catch {
      haptic.error();
    }
  };

  const confirmCloseAll = () => {
    Alert.alert(
      "Close all paper trades?",
      "This pauses paper automation and closes every open simulated position at its current paper mark. It cannot send an order to Exness or MT5.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Close all", style: "destructive", onPress: async () => {
          haptic.medium();
          try {
            const result = await closeAll.mutateAsync();
            await showPaperAlert("Paper trades closed", `${result.closedCount} simulated position${result.closedCount === 1 ? "" : "s"} closed and paper automation paused.`);
            haptic.success();
          } catch {
            haptic.error();
          }
        } },
      ],
    );
  };

  if (overview.isLoading) return <View style={styles.fill} />;
  if (!data) return <EmptyState title="Workspace unavailable" detail="Your secure paper workspace could not be loaded. Check your session and try again." />;

  const running = data.profile.automationStatus === "running";
  const lastDecision = data.recentDecisions[0];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>AKITRADE CONTROL</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Paper trading</Text>
        </View>
        <StatusPill label="DEMO / PAPER" tone="success" />
      </View>

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroLabel, { color: colors.muted }]}>AUTOMATION</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>{running ? "Paper engine active" : "Paper engine stopped"}</Text>
          </View>
          <StatusPill label={running ? "RUNNING" : data.profile.automationStatus.toUpperCase()} tone={running ? "success" : "warning"} />
        </View>
        <Text style={[styles.heroNote, { color: colors.muted }]}>The version-one engine evaluates only simulated market data and can create paper positions only after its server-side risk gate approves.</Text>
        <PrimaryButton label={running ? "Stop paper automation" : "Start paper automation"} onPress={toggleAutomation} disabled={setAutomation.isPending} tone={running ? "secondary" : "primary"} />
      </Card>

      <SectionTitle title="Account snapshot" />
      <Card>
        <View style={styles.metricRow}>
          <Metric label="Balance" value={formatMoney(data.accountSummary.balance)} />
          <Metric label="Equity" value={formatMoney(data.accountSummary.equity)} />
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <View style={styles.metricRow}>
          <Metric label="Margin at risk" value={formatMoney(data.accountSummary.margin)} />
          <Metric label="Open P/L" value={formatMoney(data.accountSummary.unrealizedPnl)} tone={data.accountSummary.unrealizedPnl >= 0 ? "positive" : "negative"} />
        </View>
      </Card>

      <SectionTitle title="Decision engine" />
      <Card>
        <View style={styles.decisionRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.decisionLabel, { color: colors.muted }]}>LATEST SIGNAL</Text>
            <Text style={[styles.decisionValue, { color: colors.foreground }]}>{lastDecision?.decision?.toUpperCase() ?? "WAIT"}</Text>
          </View>
          <StatusPill label={lastDecision?.riskStatus === "approved" ? "RISK APPROVED" : lastDecision?.riskStatus === "blocked" ? "RISK BLOCKED" : "NO ORDER"} tone={lastDecision?.riskStatus === "approved" ? "success" : lastDecision?.riskStatus === "blocked" ? "error" : "info"} />
        </View>
        <Text style={[styles.heroNote, { color: colors.muted }]}>{lastDecision?.rationale ?? "No paper decision has been evaluated yet. Start automation, then run a monitored demo cycle."}</Text>
        <PrimaryButton label={runCycle.isPending ? "Evaluating paper cycle…" : "Run monitored paper cycle"} onPress={() => { haptic.light(); runCycle.mutate({ symbol: "EURUSD" }, { onSuccess: async (result) => { if (result.paperPositionId) await showPaperAlert("Paper position opened", `${result.symbol} ${result.decision.toUpperCase()} passed all paper risk controls.`); if (result.riskReason === "daily_loss_limit") await showPaperAlert("Paper daily-loss limit reached", "Paper automation will not open new positions until the next trading day."); haptic.success(); }, onError: () => haptic.error() }); }} disabled={!running || runCycle.isPending} tone="secondary" />
      </Card>

      <SectionTitle title={`Open positions (${data.positions.length})`} />
      {data.positions.length === 0 ? (
        <EmptyState title="No open paper positions" detail="Open positions appear here only after a simulated decision passes all risk controls." />
      ) : (
        <Card>
          {data.positions.slice(0, 3).map((position) => (
            <View key={position.id} style={styles.positionRow}>
              <View>
                <Text style={[styles.positionSymbol, { color: colors.foreground }]}>{position.symbol} · {position.side.toUpperCase()}</Text>
                <Text style={[styles.positionMeta, { color: colors.muted }]}>SL {position.stopLoss} · TP {position.takeProfit}</Text>
              </View>
              <Text style={[styles.positionPnl, { color: Number(position.realizedPnl) >= 0 ? colors.success : colors.error }]}>{formatMoney(Number(position.realizedPnl))}</Text>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle title="Emergency control" />
      <Card style={[styles.emergencyCard, { borderColor: `${colors.error}55` }]}>
        <Text style={[styles.emergencyTitle, { color: colors.foreground }]}>Close all paper trades</Text>
        <Text style={[styles.heroNote, { color: colors.muted }]}>This is a protected paper-only action. It pauses automation and never transmits a live order.</Text>
        <PrimaryButton label="Close all trades" onPress={confirmCloseAll} disabled={closeAll.isPending} tone="danger" />
      </Card>

      <Text style={[styles.disclaimer, { color: colors.muted }]}>Paper simulation only. Trading involves risk; results are not a forecast or guarantee of profitability.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 14, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  headerCopy: { flexShrink: 1, gap: 2 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.5 },
  heroCard: { gap: 13 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  heroLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  heroTitle: { marginTop: 3, fontSize: 20, lineHeight: 26, fontWeight: "900" },
  heroNote: { fontSize: 13, lineHeight: 19 },
  metricRow: { flexDirection: "row", gap: 14 },
  rule: { height: 1, marginVertical: 4 },
  decisionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  decisionLabel: { fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 0.8 },
  decisionValue: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  positionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  positionSymbol: { fontSize: 15, fontWeight: "800" },
  positionMeta: { marginTop: 3, fontSize: 12, fontVariant: ["tabular-nums"] },
  positionPnl: { fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] },
  emergencyCard: { gap: 10 },
  emergencyTitle: { fontSize: 16, fontWeight: "900" },
  disclaimer: { marginTop: 22, paddingHorizontal: 4, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
