import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "@/components/AuthGate";
import { GdprConsentBanner } from "@/components/GdprConsentBanner";
import { store } from "@/store";
import { LanguageProvider } from "@/i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Filet de sécurité : si jamais l'hydratation échoue silencieusement, on
    // ne bloque pas l'utilisateur indéfiniment sur le splash screen.
    const timeout = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 8000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <LanguageProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="qcm/[id]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="payment-webview" options={{ presentation: "modal" }} />
              <Stack.Screen name="privacy-policy" options={{ presentation: "modal" }} />
              <Stack.Screen name="admin-stats" options={{ presentation: "modal" }} />
              <Stack.Screen name="about" options={{ presentation: "modal" }} />
              <Stack.Screen name="support" options={{ presentation: "modal" }} />
              <Stack.Screen name="rate-app" options={{ presentation: "modal" }} />
              <Stack.Screen name="license" options={{ presentation: "modal" }} />
              <Stack.Screen name="disclaimer" options={{ presentation: "modal" }} />
              <Stack.Screen name="faq" options={{ presentation: "modal" }} />
              <Stack.Screen name="support-category" options={{ presentation: "modal" }} />
            </Stack>
            <GdprConsentBanner />
          </AuthGate>
        </LanguageProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
