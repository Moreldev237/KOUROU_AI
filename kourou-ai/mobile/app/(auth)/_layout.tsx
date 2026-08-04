import { Redirect, Stack } from "expo-router";

import { useAppSelector } from "@/store/hooks";

export default function AuthLayout() {
  const user = useAppSelector((state) => state.auth.user);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
