import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ExternalLink } from "@/components/external-link";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { haptic } from "@/lib/haptics";
import { LoadingState, PrimaryButton, StatusPill } from "./akitrade-ui";

export function AkiTradeAuthGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth();
  const [starting, setStarting] = useState(false);

  if (loading) return <LoadingState label="Checking your secure session…" />;
  if (isAuthenticated) return <>{children}</>;

  const handleSignIn = async () => {
    haptic.light();
    setStarting(true);
    try {
      await startOAuthLogin();
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { backgroundColor: `${colors.primary}18` }]}>
        <Text style={[styles.markText, { color: colors.primary }]}>AKI</Text>
      </View>
      <StatusPill label="SECURE PAPER WORKSPACE" tone="success" />
      <Text style={[styles.title, { color: colors.foreground }]}>Control demo automation with clear limits.</Text>
      <Text style={[styles.detail, { color: colors.muted }]}>Sign in to access your encrypted session, paper workspace, risk controls, and audit history. This app never asks for or stores your Exness password.</Text>
      <View style={styles.action}>
        <PrimaryButton label={starting ? "Opening secure sign-in…" : "Sign in securely"} onPress={handleSignIn} disabled={starting} />
      </View>
      <Text style={[styles.note, { color: colors.muted }]}>Version one is restricted to demo / paper trading. Simulated results do not guarantee future performance.</Text>
      <Text style={[styles.legal, { color: colors.muted }]}>By continuing, you acknowledge the <ExternalLink href={"https://akitrade-pnwe78x4.manus.space/privacy"} style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</ExternalLink> and <ExternalLink href={"https://akitrade-pnwe78x4.manus.space/terms"} style={[styles.legalLink, { color: colors.primary }]}>Terms of Service</ExternalLink>.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 52, gap: 16 },
  mark: { width: 66, height: 66, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  markText: { fontSize: 18, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "900", letterSpacing: -0.4 },
  detail: { fontSize: 15, lineHeight: 22 },
  action: { marginTop: 8 },
  note: { marginTop: 5, fontSize: 12, lineHeight: 18 },
  legal: { fontSize: 12, lineHeight: 18 },
  legalLink: { fontWeight: "800", textDecorationLine: "underline" },
});
