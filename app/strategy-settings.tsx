import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { AkiTradeHeader } from "@/components/akitrade-header";
import { Card, EmptyState, LoadingState, PrimaryButton, SectionTitle, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { haptic } from "@/lib/haptics";
import { trpc } from "@/lib/trpc";

export default function StrategySettingsScreen() { return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><StrategySettingsContent /></AkiTradeAuthGate></ScreenContainer>; }

function StrategySettingsContent() {
  const colors = useColors();
  const workspace = trpc.trading.workspace.useQuery();
  const update = trpc.trading.updateStrategy.useMutation({ onSuccess: () => workspace.refetch() });
  const setInstrument = trpc.trading.setInstrument.useMutation({ onSuccess: () => workspace.refetch() });
  const [name, setName] = useState("Baseline moving average");
  const [fast, setFast] = useState("9"); const [slow, setSlow] = useState("21"); const [threshold, setThreshold] = useState("0.0003"); const [stop, setStop] = useState("18"); const [take, setTake] = useState("30");
  const active = workspace.data?.strategies.find((item) => item.isActive) ?? workspace.data?.strategies[0];
  useEffect(() => { if (!active) return; const p = active.parameters as Record<string, number>; setName(active.name); setFast(String(p.fastPeriod)); setSlow(String(p.slowPeriod)); setThreshold(String(p.decisionThreshold)); setStop(String(p.stopLossPips)); setTake(String(p.takeProfitPips)); }, [active?.id]);
  if (workspace.isLoading) return <LoadingState label="Loading strategy controls…" />;
  if (!workspace.data || !active) return <EmptyState title="No strategy available" detail="Your authenticated paper workspace has no editable strategy." />;
  const submit = async () => { haptic.light(); try { await update.mutateAsync({ strategyId: active.id, name, strategyType: active.strategyType, isActive: true, parameters: { fastPeriod: Number(fast), slowPeriod: Number(slow), decisionThreshold: Number(threshold), stopLossPips: Number(stop), takeProfitPips: Number(take) } }); haptic.success(); } catch { haptic.error(); } };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><AkiTradeHeader title="Strategy settings" subtitle="Deterministic paper decision rules" /><Card style={styles.cardGap}><View style={styles.top}><View><Text style={[styles.strategyName, { color: colors.foreground }]}>{active.strategyType.replaceAll("_", " ")}</Text><Text style={[styles.note, { color: colors.muted }]}>Rules calculate BUY, SELL, or WAIT only. The server risk gate remains mandatory.</Text></View><StatusPill label="PAPER ONLY" tone="success" /></View><TextInput accessibilityLabel="Strategy name" value={name} onChangeText={setName} style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]} /></Card><SectionTitle title="Decision parameters" /><Card style={styles.cardGap}><NumberField label="Fast moving-average period" value={fast} onChangeText={setFast} /><NumberField label="Slow moving-average period" value={slow} onChangeText={setSlow} /><NumberField label="Decision threshold" value={threshold} onChangeText={setThreshold} /><NumberField label="Stop-loss distance" suffix="pips" value={stop} onChangeText={setStop} /><NumberField label="Take-profit distance" suffix="pips" value={take} onChangeText={setTake} /></Card><SectionTitle title="Paper instruments" /><Card style={styles.cardGap}>{workspace.data.instruments.map((instrument) => <View key={instrument.id} style={styles.instrument}><View><Text style={[styles.instrumentName, { color: colors.foreground }]}>{instrument.symbol}</Text><Text style={[styles.note, { color: colors.muted }]}>Available to paper decision cycles</Text></View><Switch value={instrument.enabled} onValueChange={(enabled) => { haptic.light(); setInstrument.mutate({ symbol: instrument.symbol as "EURUSD" | "GBPUSD" | "USDJPY", enabled }); }} trackColor={{ false: colors.border, true: colors.success }} /></View>)}</Card><View style={styles.save}><PrimaryButton label={update.isPending ? "Saving strategy…" : "Save strategy"} onPress={submit} disabled={update.isPending} /></View></ScrollView>;
}

function NumberField({ label, value, onChangeText, suffix }: { label: string; value: string; onChangeText: (value: string) => void; suffix?: string }) { const colors = useColors(); return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text><View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: `${colors.primary}08` }]}><TextInput accessibilityLabel={label} value={value} keyboardType="decimal-pad" onChangeText={onChangeText} style={[styles.numberInput, { color: colors.foreground }]} /><Text style={[styles.suffix, { color: colors.muted }]}>{suffix ?? ""}</Text></View></View>; }

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, cardGap: { gap: 15 }, top: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, strategyName: { fontSize: 17, lineHeight: 22, fontWeight: "900", textTransform: "capitalize" }, note: { marginTop: 3, fontSize: 12, lineHeight: 17 }, nameInput: { minHeight: 47, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 15, fontWeight: "700" }, field: { gap: 7 }, fieldLabel: { fontSize: 13, fontWeight: "800" }, inputWrap: { minHeight: 47, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center" }, numberInput: { flex: 1, paddingVertical: 8, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }, suffix: { fontSize: 12, fontWeight: "700" }, instrument: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, instrumentName: { fontSize: 15, fontWeight: "900" }, save: { marginTop: 24 } });
