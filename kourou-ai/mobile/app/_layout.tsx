import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "@/components/AuthGate";
import { store } from "@/store";

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
        <StatusBar style="dark" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="qcm/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="payment-webview" options={{ presentation: "modal" }} />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </Provider>
  );
}
