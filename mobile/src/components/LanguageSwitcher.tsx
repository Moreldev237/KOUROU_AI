import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLanguage } from "@/i18n";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Changer de langue")}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.globe, compact && styles.compactGlobe, pressed && styles.pressed]}
      >
        <Ionicons name="globe-outline" size={22} color={colors.primary} />
      </Pressable>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.title}>{t("Choisir la langue")}</Text>
            {(["fr", "en"] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option === "fr" ? t("Français") : t("English")}
                style={[styles.option, language === option && styles.activeOption]}
                onPress={() => { setLanguage(option); setIsOpen(false); }}
              >
                <Text style={styles.flag}>{option === "fr" ? "🇫🇷" : "🇬🇧"}</Text>
                <Text style={styles.optionText}>{option === "fr" ? t("Français") : t("English")}</Text>
                {language === option ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  globe: { width: 42, height: 42, alignSelf: "flex-end", borderRadius: radii.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  compactGlobe: { marginBottom: 0 },
  pressed: { opacity: 0.72 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.xl },
  menu: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, ...shadows.floating },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  option: { flexDirection: "row", alignItems: "center", minHeight: 48, borderRadius: radii.sm, paddingHorizontal: spacing.sm, gap: spacing.sm },
  activeOption: { backgroundColor: colors.primarySoft },
  flag: { fontSize: 20, lineHeight: 24 },
  optionText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
});
