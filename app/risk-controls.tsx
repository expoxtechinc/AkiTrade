import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { AkiTradeHeader } from "@/components/akitrade-header";
import { Card, EmptyState, LoadingState, PrimaryButton, SectionTitle, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { haptic } from "@/lib/haptics";
import { trpc } from "@/lib/trpc";

export default function RiskControlsScreen() {
  return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><RiskControlsContent /></AkiTradeAuthGate></ScreenContainer>;
}

function RiskControlsContent() {
  const colors = useColors();
  const workspace = trpc.trading.workspace.useQuery();
  const save = trpc.trading.setRiskControls.useMutation({ onSuccess: () => workspace.refetch() });
  const [values, setValues] = useState({ risk: "1", dailyLoss: "250", trades: "5", positions: "2" });
  useEffect(() => {
    if (workspace.data?.risk) setValues({ risk: workspace.data.risk.maxRiskPerTradePercent, dailyLoss: workspace.data.risk.maxDailyLoss, trades: String(workspace.data.risk.maxTradesPerDay), positions: String(workspace.data.risk.maxOpenPositions) });
  }, [workspace.data?.risk]);
  if (workspace.isLoading) return <LoadingState label="Loading server-enforced limits…" />;
  if (!workspace.data) return <EmptyState title="Risk controls unavailable" detail="Your paper workspace could not load its risk configuration." />;
  const submit = async () => {
    haptic.light();
    try {
      await save.mutateAsync({ maxRiskPerTradePercent: Number(values.risk), maxDailyLoss: Number(values.dailyLoss), maxTradesPerDay: Number(values.trades), maxOpenPositions: Number(values.positions), requireStopLoss: true, requireTakeProfit: true });
      haptic.success();
    } catch { haptic.error(); }
  };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><AkiTradeHeader title="Risk controls" subtitle="Validated on every paper order" /><Card><StatusPill label="SERVER ENFORCED" tone="success" /><Text style={[styles.note, { color: colors.muted }]}>These controls are evaluated independently of the decision engine. A paper order must have a stop-loss and take-profit, remain under your per-trade risk cap, and satisfy all daily limits.</Text></Card><SectionTitle title="Limits" />
    <Card style={styles.cardGap}>
      <Field label="Maximum risk per trade" suffix="%" value={values.risk} onChangeText={(risk) => setValues((current) => ({ ...current, risk }))} />
      <Field label="Maximum daily loss" suffix="USD" value={values.dailyLoss} onChangeText={(dailyLoss) => setValues((current) => ({ ...current, dailyLoss }))} />
      <Field label="Maximum trades per day" value={values.trades} onChangeText={(trades) => setValues((current) => ({ ...current, trades }))} />
      <Field label="Maximum open positions" value={values.positions} onChangeText={(positions) => setValues((current) => ({ ...current, positions }))} />
    </Card><SectionTitle title="Required protection" /><Card style={styles.cardGap}><LockedSwitch label="Stop-loss required" /><LockedSwitch label="Take-profit required" /></Card><View style={styles.save}><PrimaryButton label={save.isPending ? "Saving controls…" : "Save paper risk controls"} disabled={save.isPending} onPress={submit} /></View><Text style={[styles.disclaimer, { color: colors.muted }]}>Paper trading only. These application guardrails do not replace independent account, broker, or regulatory safeguards.</Text></ScrollView>;
}

function Field({ label, value, onChangeText, suffix }: { label: string; value: string; onChangeText: (value: string) => void; suffix?: string }) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text><View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: `${colors.primary}08` }]}><TextInput accessibilityLabel={label} value={value} keyboardType="decimal-pad" onChangeText={onChangeText} returnKeyType="done" style={[styles.input, { color: colors.foreground }]} /><Text style={[styles.suffix, { color: colors.muted }]}>{suffix ?? ""}</Text></View></View>;
}

function LockedSwitch({ label }: { label: string }) { const colors = useColors(); return <View style={styles.lockedRow}><View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.lockedDetail, { color: colors.muted }]}>Mandatory in this paper release</Text></View><Switch value disabled trackColor={{ false: colors.border, true: colors.success }} /></View>; }

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, cardGap: { gap: 16 }, note: { fontSize: 13, lineHeight: 19 }, field: { gap: 8 }, fieldLabel: { fontSize: 14, lineHeight: 19, fontWeight: "800" }, inputWrap: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center" }, input: { flex: 1, fontSize: 16, fontWeight: "800", paddingVertical: 8, fontVariant: ["tabular-nums"] }, suffix: { fontSize: 12, fontWeight: "700" }, lockedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, lockedDetail: { marginTop: 2, fontSize: 12 }, save: { marginTop: 24 }, disclaimer: { marginTop: 15, textAlign: "center", fontSize: 12, lineHeight: 18 } });
