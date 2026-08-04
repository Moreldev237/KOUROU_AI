import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

interface ScreenContainerProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
}

export function ScreenContainer({ children, scrollable = false, padded = true, style, ...rest }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        { flex: scrollable ? undefined : 1, paddingTop: insets.top + spacing.lg },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.xxl },
});
