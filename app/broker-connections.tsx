import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { Card, LoadingState, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const providers = [
  { id: "ctrader", label: "cTrader", detail: "Broker-approved app authorization" },
  { id: "oanda", label: "OANDA", detail: "Server-side revocable token vault" },
  { id: "mt5_bridge", label: "MT5 bridge", detail: "User-controlled terminal bridge" },
  { id: "mt4_bridge", label: "MT4 bridge", detail: "User-controlled EA bridge" },
] as const;

export default function BrokerConnectionsScreen() {
  return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><BrokerConnectionsContent /></AkiTradeAuthGate></ScreenContainer>;
}

function BrokerConnectionsContent() {
  const colors = useColors();
  const connections = trpc.trading.brokerConnections.useQuery();
  const utils = trpc.useUtils();
  const [provider, setProvider] = useState<(typeof providers)[number]["id"]>("mt5_bridge");
  const [environment, setEnvironment] = useState<"demo" | "live">("demo");
  const [accountReference, setAccountReference] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const requestConnection = trpc.trading.requestBrokerConnection.useMutation({
    onSuccess: (result) => {
      setNotice(result.authorization.instruction);
      setAccountReference("");
      setDisplayName("");
      utils.trading.brokerConnections.invalidate();
    },
    onError: (error) => setNotice(error.message),
  });
  const acknowledge = trpc.trading.acknowledgeLiveTradingConsent.useMutation({
    onSuccess: () => {
      setNotice("Acknowledgement recorded. Live execution remains technically disabled until a separately approved release and verified bridge are available.");
      utils.trading.brokerConnections.invalidate();
    },
    onError: (error) => setNotice(error.message),
  });

  if (connections.isLoading) return <LoadingState label="Loading secure connection controls…" />;
  const canSubmit = accountReference.trim().length >= 3 && displayName.trim().length >= 3 && !requestConnection.isPending;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[styles.eyebrow, { color: colors.muted }]}>BROKER CONNECTIONS</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Account access, under your control.</Text>
      <Text style={[styles.lead, { color: colors.muted }]}>AkiTrade never asks for or stores your Exness or broker password. Add a non-secret account reference, then complete the provider’s authorized connection step.</Text>

      <Card style={styles.lockCard}>
        <View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Live execution is locked</Text><Text style={[styles.detail, { color: colors.muted }]}>This release records connection and consent steps only. It will not submit a live order.</Text></View><StatusPill label="LOCKED" tone="warning" /></View>
      </Card>

      <Text style={[styles.section, { color: colors.foreground }]}>Prepare a connection</Text>
      <View style={styles.chips}>{providers.map((item) => <Pressable key={item.id} onPress={() => setProvider(item.id)} style={({ pressed }) => [styles.chip, { borderColor: provider === item.id ? colors.primary : colors.border, backgroundColor: provider === item.id ? colors.primary : colors.surface, opacity: pressed ? 0.76 : 1 }]}><Text style={[styles.chipTitle, { color: provider === item.id ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text><Text style={[styles.chipDetail, { color: provider === item.id ? "#EAF2FF" : colors.muted }]}>{item.detail}</Text></Pressable>)}</View>

      <View style={styles.modeRow}>{(["demo", "live"] as const).map((mode) => <Pressable key={mode} onPress={() => setEnvironment(mode)} style={({ pressed }) => [styles.mode, { backgroundColor: environment === mode ? colors.primary : colors.surface, borderColor: environment === mode ? colors.primary : colors.border, opacity: pressed ? 0.76 : 1 }]}><Text style={[styles.modeLabel, { color: environment === mode ? "#FFFFFF" : colors.foreground }]}>{mode === "demo" ? "Demo first" : "Live preparation"}</Text></Pressable>)}</View>
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Connection label, e.g. My demo account" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} returnKeyType="next" />
      <TextInput value={accountReference} onChangeText={setAccountReference} placeholder="Non-secret account reference or bridge ID" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} autoCapitalize="none" returnKeyType="done" />
      <Text style={[styles.helper, { color: colors.muted }]}>Do not enter a password, access token, or API key here.</Text>
      <Pressable disabled={!canSubmit} onPress={() => requestConnection.mutate({ provider, environment, accountReference: accountReference.trim(), displayName: displayName.trim() })} style={({ pressed }) => [styles.primary, { backgroundColor: canSubmit ? colors.primary : colors.border, opacity: pressed ? 0.86 : 1 }]}><Text style={styles.primaryLabel}>{requestConnection.isPending ? "Preparing…" : "Prepare authorized connection"}</Text></Pressable>
      {notice ? <Card style={styles.notice}><Text style={[styles.noticeText, { color: colors.foreground }]}>{notice}</Text></Card> : null}

      <Text style={[styles.section, { color: colors.foreground }]}>Your connections</Text>
      {(connections.data ?? []).length === 0 ? <Card><Text style={[styles.detail, { color: colors.muted }]}>No broker connection has been prepared. Paper trading remains available independently.</Text></Card> : (connections.data ?? []).map((connection) => <Card key={connection.id} style={styles.connection}><View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{connection.displayName}</Text><Text style={[styles.detail, { color: colors.muted }]}>{connection.provider.replaceAll("_", " ").toUpperCase()} · {connection.environment.toUpperCase()} · {connection.connectionMode.replaceAll("_", " ")}</Text></View><StatusPill label={connection.status.replaceAll("_", " ").toUpperCase()} tone={connection.status === "ready" ? "success" : "warning"} /></View>{connection.environment === "live" && connection.consent?.status !== "acknowledged" ? <Pressable onPress={() => acknowledge.mutate({ brokerConnectionId: connection.id, confirmed: true })} style={({ pressed }) => [styles.consent, { borderColor: colors.warning, opacity: pressed ? 0.72 : 1 }]}><Text style={[styles.consentLabel, { color: colors.warning }]}>Acknowledge live-mode limits</Text></Pressable> : null}{connection.consent?.status === "acknowledged" ? <Text style={[styles.helper, { color: colors.warning }]}>Limits acknowledged. Live execution remains locked in this release.</Text> : null}</Card>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 36, gap: 12 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.6 },
  lead: { fontSize: 14, lineHeight: 21, marginTop: -4 },
  lockCard: { marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  detail: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  section: { marginTop: 8, fontSize: 17, lineHeight: 22, fontWeight: "900" },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, padding: 13 },
  chipTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  chipDetail: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  modeRow: { flexDirection: "row", gap: 8 },
  mode: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  modeLabel: { fontSize: 13, fontWeight: "900" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 14 },
  helper: { fontSize: 11, lineHeight: 16, marginTop: -5 },
  primary: { minHeight: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  primaryLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  notice: { marginTop: 2 },
  noticeText: { fontSize: 12, lineHeight: 19, fontWeight: "700" },
  connection: { gap: 10 },
  consent: { minHeight: 42, borderWidth: 1, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  consentLabel: { fontSize: 12, fontWeight: "900" },
});
