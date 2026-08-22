import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { Card, EmptyState, formatMoney, LoadingState, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function TradesScreen() {
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <AkiTradeAuthGate><TradesContent /></AkiTradeAuthGate>
    </ScreenContainer>
  );
}

function TradesContent() {
  const colors = useColors();
  const [tab, setTab] = useState<"open" | "history">("open");
  const overview = trpc.trading.overview.useQuery();
  if (overview.isLoading) return <LoadingState label="Loading paper trade records…" />;
  if (!overview.data) return <EmptyState title="Trade records unavailable" detail="Sign in again to refresh your authenticated paper trade history." />;
  const rows = tab === "open" ? overview.data.positions : overview.data.recentClosedPositions;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>PAPER EXECUTION</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Trades</Text>
      <View style={[styles.segment, { backgroundColor: `${colors.primary}10` }]}>
        {(["open", "history"] as const).map((value) => (
          <Pressable key={value} accessibilityRole="tab" onPress={() => setTab(value)} style={({ pressed }) => [styles.segmentButton, { backgroundColor: tab === value ? colors.surface : "transparent", opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[styles.segmentText, { color: tab === value ? colors.foreground : colors.muted }]}>{value === "open" ? `Open (${overview.data.positions.length})` : "History"}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(position) => position.id.toString()}
        contentContainerStyle={rows.length ? styles.list : styles.emptyList}
        ListEmptyComponent={<EmptyState title={tab === "open" ? "No open paper positions" : "No closed paper positions"} detail={tab === "open" ? "Approved BUY or SELL paper decisions will appear here with protective orders." : "Closed simulated positions will appear in this history."} />}
        renderItem={({ item }) => {
          const pnl = Number(item.realizedPnl);
          return (
            <Card style={styles.tradeCard}>
              <View style={styles.tradeTop}>
                <View style={styles.tradeName}>
                  <Text style={[styles.symbol, { color: colors.foreground }]}>{item.symbol}</Text>
                  <StatusPill label={item.side.toUpperCase()} tone={item.side === "buy" ? "success" : "error"} />
                </View>
                <Text style={[styles.pnl, { color: pnl >= 0 ? colors.success : colors.error }]}>{formatMoney(pnl)}</Text>
              </View>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              <View style={styles.tradeMeta}><Text style={[styles.meta, { color: colors.muted }]}>Entry {item.entryPrice}</Text><Text style={[styles.meta, { color: colors.muted }]}>SL {item.stopLoss} · TP {item.takeProfit}</Text></View>
              <Text style={[styles.statusText, { color: colors.muted }]}>{item.status === "open" ? "Open paper position" : `Closed: ${item.closeReason?.replaceAll("_", " ") ?? "paper exit"}`}</Text>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 14 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.5 },
  segment: { flexDirection: "row", borderRadius: 14, marginTop: 18, padding: 4 },
  segmentButton: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  segmentText: { fontSize: 13, fontWeight: "800" },
  list: { paddingTop: 14, paddingBottom: 28, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 48 },
  tradeCard: { gap: 7 },
  tradeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tradeName: { flexDirection: "row", alignItems: "center", gap: 8 },
  symbol: { fontSize: 17, fontWeight: "900" },
  pnl: { fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] },
  rule: { height: 1 },
  tradeMeta: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  meta: { fontSize: 12, fontVariant: ["tabular-nums"] },
  statusText: { fontSize: 12, textTransform: "capitalize" },
});
