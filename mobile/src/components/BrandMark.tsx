import { Image, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

export function BrandMark() {
  return (
    <View style={styles.container}>
      <View style={styles.logoFrame}>
        <Image source={require("@/../assets/icon.png")} style={styles.logo} resizeMode="cover" />
      </View>
      <View>
        <Text style={styles.name}>KOUROU</Text>
        <Text style={styles.ai}>AI</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  logoFrame: { width: 38, height: 38, borderRadius: 11, overflow: "hidden", marginRight: spacing.sm },
  logo: { width: 38, height: 38 },
  name: { ...typography.captionMedium, color: colors.primaryDark, letterSpacing: 1.2 },
  ai: { ...typography.tiny, color: colors.accentSky, letterSpacing: 2 },
});