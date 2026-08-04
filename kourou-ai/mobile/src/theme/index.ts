/**
 * Design tokens de KOUROU AI.
 *
 * Les couleurs `primary`/`primaryDark`/`accentSky`/`accentGreen` sont
 * extraites directement du logo fourni (assets/logo-source.png), pas
 * inventées : c'est la vraie identité de marque, pas une palette générique.
 */

export const colors = {
  // --- Marque (extraites du logo) ---
  primary: "#235AA4", // bleu principal — boutons, liens, éléments actifs
  primaryDark: "#122B6E", // bleu marine profond — en-têtes, fonds contrastés
  primaryLight: "#4A7FC4", // variante claire — états hover/pressed, dégradés
  accentSky: "#4FB6FF", // bleu ciel — mise en avant secondaire, infos
  accentGreen: "#29B875", // vert — succès, bonne réponse, progression

  // --- États sémantiques ---
  success: "#29B875",
  error: "#DC3545",
  warning: "#F5A623",
  info: "#4FB6FF",

  // --- Neutres ---
  background: "#F7F9FC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#101828",
  textSecondary: "#475467",
  textTertiary: "#98A2B3",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(16, 24, 40, 0.6)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "800" as const, lineHeight: 40 },
  h1: { fontSize: 26, fontWeight: "700" as const, lineHeight: 34 },
  h2: { fontSize: 21, fontWeight: "700" as const, lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  captionMedium: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  tiny: { fontSize: 11, fontWeight: "500" as const, lineHeight: 14 },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const difficultyColors: Record<string, string> = {
  facile: colors.success,
  moyen: colors.warning,
  difficile: colors.error,
};
