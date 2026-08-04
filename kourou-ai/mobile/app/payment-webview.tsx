import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { baseApi } from "@/store/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import { colors, spacing, typography } from "@/theme";

// Doit correspondre au chemin contenu dans PAYMENT_RETURN_URL côté backend
// (voir backend/.env.example). Dès que la WebView navigue vers une URL
// contenant ce segment, on considère le paiement terminé côté utilisateur et
// on referme l'écran (le statut réel, lui, vient du webhook CinetPay -> notre
// backend, jamais de cette navigation qui n'est qu'un signal visuel).
const RETURN_URL_MARKER = "/paiement/retour";

export default function PaymentWebViewScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const handleNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      if (navState.url.includes(RETURN_URL_MARKER)) {
        // Invalide le cache des abonnements/transactions pour refléter le
        // nouveau statut dès le retour sur l'app.
        dispatch(baseApi.util.invalidateTags(["Subscription", "Transactions"]));
        router.back();
      }
    },
    [dispatch]
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Paiement Mobile Money</Text>
        <View style={{ width: 22 }} />
      </View>
      {url ? (
        <WebView source={{ uri: url }} onNavigationStateChange={handleNavigationChange} startInLoadingState />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: { padding: spacing.xs },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
});
