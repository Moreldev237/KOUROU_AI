import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ErrorBanner";
import {
  useCreateAdminExamMutation,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useGetAdminDashboardQuery,
  useGetPlatformStatsQuery,
  useGrantAdminTokensMutation,
} from "@/store/api/backofficeApi";
import { useAppSelector } from "@/store/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const userActions = [
  { label: "Ajouter un utilisateur", key: "user", icon: "person-add-outline", accent: colors.primary },
  { label: "Supprimer un utilisateur", key: "delete-user", icon: "person-remove-outline", accent: colors.error },
  { label: "Ajouter des tokens", key: "tokens", icon: "cash-outline", accent: colors.accentGreen },
  { label: "Ajouter un concours", key: "contest", icon: "school-outline", accent: colors.accentSky },
] as const;

type ActionKey = (typeof userActions)[number]["key"];

export default function AdminStatsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const { data: stats, error, isLoading } = useGetPlatformStatsQuery(undefined, { skip: !user?.is_staff });
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetAdminDashboardQuery(undefined, { skip: !user?.is_staff });
  const [createUser, { isLoading: isCreatingUser }] = useCreateAdminUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteAdminUserMutation();
  const [grantTokens, { isLoading: isGrantingTokens }] = useGrantAdminTokensMutation();
  const [createExam, { isLoading: isCreatingExam }] = useCreateAdminExamMutation();

  const [modalAction, setModalAction] = useState<ActionKey | null>(null);
  const [userForm, setUserForm] = useState({ full_name: "", email: "", phone_number: "", password: "" });
  const [deleteForm, setDeleteForm] = useState({ email: "", phone_number: "" });
  const [tokenForm, setTokenForm] = useState({ email: "", phone_number: "", tokens: "25" });
  const [contestForm, setContestForm] = useState({ name: "", description: "", organizing_body: "", prize_amount_fcfa: "500000", icon_emoji: "🎓", color_hex: "#1B4F91" });

  if (!user?.is_staff) {
    return <View style={styles.centered}><Text style={styles.deniedText}>Accès réservé à l&apos;administration.</Text></View>;
  }

  const summaryStats = [
    { label: "Utilisateurs", value: String(stats?.total_users ?? dashboard?.users.length ?? 0), icon: "people-outline", accent: colors.primary },
    { label: "Premium", value: String(stats?.active_premium_users ?? dashboard?.premium_users.length ?? 0), icon: "star-outline", accent: colors.accentGreen },
    { label: "Suspendus", value: String(dashboard?.suspended_users.length ?? 0), icon: "ban-outline", accent: colors.warning },
    { label: "Tokens", value: String(stats?.total_tokens_consumed_last_30_days ?? 0), icon: "flash-outline", accent: colors.accentSky },
  ];

  const submitUserCreation = async () => {
    if (!userForm.full_name || (!userForm.email && !userForm.phone_number) || !userForm.password) {
      Alert.alert("Champs requis", "Nom complet, email ou téléphone, et mot de passe sont nécessaires.");
      return;
    }

    try {
      await createUser({
        full_name: userForm.full_name,
        email: userForm.email || undefined,
        phone_number: userForm.phone_number || undefined,
        password: userForm.password,
      }).unwrap();
      Alert.alert("Succès", "L’utilisateur a été créé.");
      setUserForm({ full_name: "", email: "", phone_number: "", password: "" });
      setModalAction(null);
    } catch (error) {
      const message = (error as { data?: { non_field_errors?: string[]; email?: string[]; phone_number?: string[] } })?.data;
      const details = message?.non_field_errors?.[0] ?? message?.email?.[0] ?? message?.phone_number?.[0] ?? "Vérifiez les champs du formulaire.";
      Alert.alert("Impossible de créer l’utilisateur", details);
    }
  };

  const submitUserDelete = async () => {
    if (!deleteForm.email && !deleteForm.phone_number) {
      Alert.alert("Champs requis", "Saisissez un e-mail ou un numéro pour supprimer un utilisateur.");
      return;
    }

    try {
      await deleteUser({ email: deleteForm.email || undefined, phone_number: deleteForm.phone_number || undefined }).unwrap();
      Alert.alert("Succès", "L’utilisateur a été supprimé.");
      setDeleteForm({ email: "", phone_number: "" });
      setModalAction(null);
    } catch (error) {
      const message = (error as { data?: { detail?: string; non_field_errors?: string[] } })?.data;
      Alert.alert("Suppression impossible", message?.detail ?? message?.non_field_errors?.[0] ?? "Impossible de supprimer cet utilisateur.");
    }
  };

  const submitTokenGrant = async () => {
    if ((!tokenForm.email && !tokenForm.phone_number) || !tokenForm.tokens) {
      Alert.alert("Champs requis", "Précisez l’utilisateur et le nombre de tokens à attribuer.");
      return;
    }

    try {
      await grantTokens({
        email: tokenForm.email || undefined,
        phone_number: tokenForm.phone_number || undefined,
        tokens: Number(tokenForm.tokens),
      }).unwrap();
      Alert.alert("Succès", "Les tokens ont été ajoutés au compte.");
      setTokenForm({ email: "", phone_number: "", tokens: "25" });
      setModalAction(null);
    } catch (error) {
      const message = (error as { data?: { non_field_errors?: string[] } })?.data;
      Alert.alert("Attribution impossible", message?.non_field_errors?.[0] ?? "Vérifiez le compte ou la quantité.");
    }
  };

  const submitContestCreation = async () => {
    if (!contestForm.name) {
      Alert.alert("Champs requis", "Le nom du concours est obligatoire.");
      return;
    }

    try {
      await createExam({
        name: contestForm.name,
        description: contestForm.description,
        organizing_body: contestForm.organizing_body,
        prize_amount_fcfa: Number(contestForm.prize_amount_fcfa || 0),
        icon_emoji: contestForm.icon_emoji,
        color_hex: contestForm.color_hex,
      }).unwrap();
      Alert.alert("Succès", "Le concours a été ajouté.");
      setContestForm({ name: "", description: "", organizing_body: "", prize_amount_fcfa: "500000", icon_emoji: "🎓", color_hex: "#1B4F91" });
      setModalAction(null);
    } catch (error) {
      const message = (error as { data?: { non_field_errors?: string[]; name?: string[] } })?.data;
      Alert.alert("Création impossible", message?.non_field_errors?.[0] ?? message?.name?.[0] ?? "Vérifiez le formulaire.");
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>KOUROU AI · ADMINISTRATION</Text>
            <Text style={styles.title}>Tableau de bord</Text>
          </View>
          <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
        </View>

        <ErrorBanner error={error} />
        {(isLoading || isLoadingDashboard) ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

        <View style={styles.primaryGrid}>
          {summaryStats.map((stat) => (
            <MetricCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon as keyof typeof Ionicons.glyphMap} accent={stat.accent} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Gestion rapide</Text>
        <View style={styles.actionGrid}>
          {userActions.map((action) => (
            <Pressable
              key={action.label}
              style={[styles.actionCard, { borderColor: `${action.accent}40` }]}
              onPress={() => setModalAction(action.key)}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.accent}18` }]}>
                <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={22} color={action.accent} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Utilisateurs premium</Text>
        <View style={styles.listCard}>
          {(dashboard?.premium_users ?? []).length ? (
            (dashboard?.premium_users ?? []).map((userItem) => (
              <View key={userItem.id} style={styles.listRow}>
                <View>
                  <Text style={styles.listName}>{userItem.full_name || userItem.email || userItem.phone_number || "Utilisateur"}</Text>
                  <Text style={styles.listMeta}>{userItem.email ?? userItem.phone_number ?? "Compte premium"}</Text>
                </View>
                <Text style={styles.badge}>Actif</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aucun utilisateur premium.</Text></View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Comptes suspendus</Text>
        <View style={styles.listCard}>
          {(dashboard?.suspended_users ?? []).length ? (
            (dashboard?.suspended_users ?? []).map((userItem) => (
              <View key={userItem.id} style={styles.listRow}>
                <View>
                  <Text style={styles.listName}>{userItem.full_name || userItem.email || userItem.phone_number || "Compte suspendu"}</Text>
                  <Text style={styles.listMeta}>{userItem.suspension_reason || "Compte bloqué"}</Text>
                </View>
                <Text style={styles.badgeWarning}>Suspendu</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aucun compte suspendu.</Text></View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Meilleurs parrains</Text>
        <View style={styles.listCard}>
          {(dashboard?.top_referrers ?? []).length ? (
            (dashboard?.top_referrers ?? []).map((referrer, index) => (
              <View key={referrer.id} style={styles.listRow}>
                <View style={styles.rankRow}>
                  <Text style={styles.rank}>#{index + 1}</Text>
                  <View>
                    <Text style={styles.listName}>{referrer.full_name || referrer.email || referrer.phone_number || "Parrain"}</Text>
                    <Text style={styles.listMeta}>{referrer.referrals} filleuls / bonus {referrer.reward_fcfa.toLocaleString("fr-FR")} FCFA</Text>
                  </View>
                </View>
                <Text style={styles.badge}>Prime</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aucun parrain actif.</Text></View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Utilisateurs récents</Text>
        <View style={styles.listCard}>
          {(dashboard?.users ?? []).slice(0, 6).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View>
                <Text style={styles.listName}>{item.full_name || item.email || item.phone_number || "Utilisateur"}</Text>
                <Text style={styles.listMeta}>{item.is_premium ? "Premium" : item.is_active ? "Actif" : "Inactif"}</Text>
              </View>
              <Text style={styles.miniValue}>{item.quota_daily_limit} tokens</Text>
            </View>
          ))}
        </View>

        {stats ? (
          <>
            <Text style={styles.sectionTitle}>Activité globale</Text>
            <View style={styles.detailCard}>
              <DetailRow label="Nouveaux utilisateurs (7 jours)" value={stats.new_users_last_7_days} />
              <DetailRow label="Sessions QCM" value={stats.total_qcm_sessions} />
              <DetailRow label="Taux de cache IA" value={`${stats.cache_hit_rate_percent}%`} />
              <DetailRow label="Tokens consommés (30 jours)" value={stats.total_tokens_consumed_last_30_days} />
              <DetailRow label="Revenus 30 jours" value={`${stats.revenue_last_30_days_fcfa.toLocaleString("fr-FR")} FCFA`} />
              <DetailRow label="Revenus totaux" value={`${stats.total_revenue_fcfa.toLocaleString("fr-FR")} FCFA`} />
            </View>
          </>
        ) : null}

        <Text style={styles.privateNotice}>Ces données sont réservées aux comptes administrateurs.</Text>
      </ScrollView>

      <Modal transparent visible={modalAction !== null} animationType="slide" onRequestClose={() => setModalAction(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalAction === "user" && "Ajouter un utilisateur"}
                {modalAction === "delete-user" && "Supprimer un utilisateur"}
                {modalAction === "tokens" && "Ajouter des tokens"}
                {modalAction === "contest" && "Ajouter un concours"}
              </Text>
              <Pressable onPress={() => setModalAction(null)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {modalAction === "user" ? (
              <View style={styles.formGroup}>
                <TextInput style={styles.input} placeholder="Nom complet" value={userForm.full_name} onChangeText={(value) => setUserForm((prev) => ({ ...prev, full_name: value }))} />
                <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={userForm.email} onChangeText={(value) => setUserForm((prev) => ({ ...prev, email: value }))} />
                <TextInput style={styles.input} placeholder="Téléphone" value={userForm.phone_number} onChangeText={(value) => setUserForm((prev) => ({ ...prev, phone_number: value }))} />
                <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={userForm.password} onChangeText={(value) => setUserForm((prev) => ({ ...prev, password: value }))} />
                <Pressable style={[styles.primaryButton, isCreatingUser && styles.disabledButton]} onPress={submitUserCreation}>
                  <Text style={styles.primaryButtonText}>{isCreatingUser ? "Création..." : "Créer l’utilisateur"}</Text>
                </Pressable>
              </View>
            ) : null}

            {modalAction === "delete-user" ? (
              <View style={styles.formGroup}>
                <TextInput style={styles.input} placeholder="Email" value={deleteForm.email} onChangeText={(value) => setDeleteForm((prev) => ({ ...prev, email: value }))} />
                <TextInput style={styles.input} placeholder="Téléphone" value={deleteForm.phone_number} onChangeText={(value) => setDeleteForm((prev) => ({ ...prev, phone_number: value }))} />
                <Pressable style={[styles.primaryButton, styles.dangerButton, isDeletingUser && styles.disabledButton]} onPress={submitUserDelete}>
                  <Text style={styles.primaryButtonText}>{isDeletingUser ? "Suppression..." : "Supprimer"}</Text>
                </Pressable>
              </View>
            ) : null}

            {modalAction === "tokens" ? (
              <View style={styles.formGroup}>
                <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={tokenForm.email} onChangeText={(value) => setTokenForm((prev) => ({ ...prev, email: value }))} />
                <TextInput style={styles.input} placeholder="Téléphone" value={tokenForm.phone_number} onChangeText={(value) => setTokenForm((prev) => ({ ...prev, phone_number: value }))} />
                <TextInput style={styles.input} placeholder="Nombre de tokens" keyboardType="number-pad" value={tokenForm.tokens} onChangeText={(value) => setTokenForm((prev) => ({ ...prev, tokens: value }))} />
                <Pressable style={[styles.primaryButton, isGrantingTokens && styles.disabledButton]} onPress={submitTokenGrant}>
                  <Text style={styles.primaryButtonText}>{isGrantingTokens ? "Envoi..." : "Attribuer les tokens"}</Text>
                </Pressable>
              </View>
            ) : null}

            {modalAction === "contest" ? (
              <View style={styles.formGroup}>
                <TextInput style={styles.input} placeholder="Nom du concours" value={contestForm.name} onChangeText={(value) => setContestForm((prev) => ({ ...prev, name: value }))} />
                <TextInput style={styles.input} placeholder="Organisateur" value={contestForm.organizing_body} onChangeText={(value) => setContestForm((prev) => ({ ...prev, organizing_body: value }))} />
                <TextInput style={styles.input} placeholder="Prix du concours (FCFA)" keyboardType="number-pad" value={contestForm.prize_amount_fcfa} onChangeText={(value) => setContestForm((prev) => ({ ...prev, prize_amount_fcfa: value }))} />
                <TextInput style={styles.input} multiline placeholder="Description" value={contestForm.description} onChangeText={(value) => setContestForm((prev) => ({ ...prev, description: value }))} />
                <View style={styles.inlineFields}>
                  <TextInput style={[styles.input, styles.inlineInput]} placeholder="Emoji" value={contestForm.icon_emoji} onChangeText={(value) => setContestForm((prev) => ({ ...prev, icon_emoji: value }))} />
                  <TextInput style={[styles.input, styles.inlineInput]} placeholder="Couleur" value={contestForm.color_hex} onChangeText={(value) => setContestForm((prev) => ({ ...prev, color_hex: value }))} />
                </View>
                <Pressable style={[styles.primaryButton, isCreatingExam && styles.disabledButton]} onPress={submitContestCreation}>
                  <Text style={styles.primaryButtonText}>{isCreatingExam ? "Ajout..." : "Créer le concours"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function MetricCard({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  return <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={icon} size={20} color={accent} /></View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>;
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.background },
  deniedText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  headerCopy: { flex: 1 },
  eyebrow: { ...typography.tiny, color: colors.primary, letterSpacing: 0.8, marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.textPrimary },
  loader: { marginVertical: spacing.xxl },
  primaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { flexGrow: 1, flexBasis: "46%", minWidth: 140, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, ...shadows.card },
  metricIcon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  metricValue: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  metricLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xxl, marginBottom: spacing.sm },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionCard: { flexGrow: 1, flexBasis: "46%", minWidth: 140, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, ...shadows.card },
  actionIcon: { width: 42, height: 42, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  actionLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  listCard: { backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, ...shadows.card },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rankRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  rank: { ...typography.bodyMedium, color: colors.primary, minWidth: 32 },
  listName: { ...typography.bodyMedium, color: colors.textPrimary },
  listMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  badge: { backgroundColor: `${colors.accentGreen}18`, color: colors.accentGreen, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, overflow: "hidden", ...typography.caption },
  badgeWarning: { backgroundColor: `${colors.warning}18`, color: colors.warning, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, overflow: "hidden", ...typography.caption },
  emptyState: { paddingVertical: spacing.md },
  emptyStateText: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  miniValue: { ...typography.caption, color: colors.textSecondary, textAlign: "right" },
  detailCard: { backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.lg, ...shadows.card },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  detailValue: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: "right", flexShrink: 1 },
  privateNotice: { ...typography.caption, color: colors.textTertiary, textAlign: "center", marginTop: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: "rgba(16, 24, 40, 0.45)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, ...shadows.floating },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  formGroup: { gap: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background },
  inlineFields: { flexDirection: "row", gap: spacing.sm },
  inlineInput: { flex: 1 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  dangerButton: { backgroundColor: colors.error },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { ...typography.bodyMedium, color: colors.white },
});