import { Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { AkiTradeAuthGate } from "@/components/akitrade-auth-gate";
import { AkiTradeHeader } from "@/components/akitrade-header";
import { Card, EmptyState, LoadingState, PrimaryButton, SectionTitle, StatusPill } from "@/components/akitrade-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { haptic } from "@/lib/haptics";
import { registerPaperNotifications } from "@/lib/paper-notifications";
import { trpc } from "@/lib/trpc";

export default function NotificationsScreen() { return <ScreenContainer className="px-5" containerClassName="bg-background"><AkiTradeAuthGate><NotificationsContent /></AkiTradeAuthGate></ScreenContainer>; }
function NotificationsContent() {
  const colors = useColors();
  const workspace = trpc.trading.workspace.useQuery();
  const overview = trpc.trading.overview.useQuery();
  const save = trpc.trading.setNotificationPreferences.useMutation({ onSuccess: () => workspace.refetch() });
  const register = trpc.trading.registerPushToken.useMutation();
  if (workspace.isLoading || overview.isLoading) return <LoadingState label="Loading paper alert preferences…" />;
  if (!workspace.data || !overview.data) return <EmptyState title="Notifications unavailable" detail="Your secure workspace could not load its alert preferences." />;
  const preferences = workspace.data.notifications;
  const setValue = (key: "notifyTradeOpened" | "notifyTradeClosed" | "notifyDailyLossLimit", value: boolean) => {
    haptic.light();
    save.mutate({ ...preferences, [key]: value }, { onSuccess: () => haptic.success(), onError: () => haptic.error() });
  };
  const enableDeviceAlerts = async () => {
    haptic.light();
    try {
      const result = await registerPaperNotifications();
      if (result.token && Platform.OS !== "web") await register.mutateAsync({ token: result.token, platform: Platform.OS === "ios" ? "ios" : "android" });
      result.granted ? haptic.success() : haptic.warning();
    } catch { haptic.error(); }
  };
  return <ScrollView contentContainerStyle={styles.content}><AkiTradeHeader title="Notifications" subtitle="Paper positions and risk limits" /><Card style={styles.cardGap}><StatusPill label="OPT-IN ONLY" tone="success" /><Text style={[styles.note, { color: colors.muted }]}>Choose the paper events you want to receive. Alert settings apply to your authenticated workspace and never disclose account credentials.</Text><PrimaryButton label={register.isPending ? "Registering device…" : "Enable device alerts"} onPress={enableDeviceAlerts} disabled={register.isPending} tone="secondary" /></Card><SectionTitle title="Alert preferences" /><Card style={styles.cardGap}><Toggle label="Paper trade opened" detail="When a risk-approved simulated position opens" value={preferences.notifyTradeOpened} onValueChange={(value) => setValue("notifyTradeOpened", value)} /><Toggle label="Paper trade closed" detail="When a simulated position is closed" value={preferences.notifyTradeClosed} onValueChange={(value) => setValue("notifyTradeClosed", value)} /><Toggle label="Daily loss limit" detail="When paper automation is blocked by the daily limit" value={preferences.notifyDailyLossLimit} onValueChange={(value) => setValue("notifyDailyLossLimit", value)} /></Card><SectionTitle title="Recent in-app events" />{overview.data.recentNotifications.length === 0 ? <EmptyState title="No notifications yet" detail="Paper trade and risk events will be retained here when your selected alerts are triggered." /> : <View style={styles.stack}>{overview.data.recentNotifications.map((event) => <Card key={event.id}><Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text><Text style={[styles.note, { color: colors.muted }]}>{event.body}</Text></Card>)}</View>}<Text style={[styles.disclaimer, { color: colors.muted }]}>Remote alerts require a compatible device build and permission. In-app events remain available from the secure backend audit trail.</Text></ScrollView>;
}
function Toggle({ label, detail, value, onValueChange }: { label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) { const colors = useColors(); return <View style={styles.toggle}><View style={styles.toggleCopy}><Text style={[styles.eventTitle, { color: colors.foreground }]}>{label}</Text><Text style={[styles.note, { color: colors.muted }]}>{detail}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.success }} /></View>; }
const styles = StyleSheet.create({ content: { paddingBottom: 32 }, cardGap: { gap: 14 }, note: { fontSize: 12, lineHeight: 18 }, toggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 }, toggleCopy: { flex: 1 }, eventTitle: { fontSize: 14, fontWeight: "900" }, stack: { gap: 9 }, disclaimer: { marginTop: 22, fontSize: 12, lineHeight: 18, textAlign: "center" } });
