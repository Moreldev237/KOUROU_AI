import { useCallback } from "react";
import { router } from "expo-router";

import { clearTokens, setTokens } from "@/api/tokenStorage";
import { baseApi } from "@/store/api/baseApi";
import { loggedOut, setUser } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import type { AuthTokens, User } from "@/types";

export function useAuth() {
  const dispatch = useAppDispatch();

  const applyAuthResult = useCallback(
    async (result: AuthTokens & { user: User }) => {
      await setTokens(result.access, result.refresh);
      dispatch(setUser(result.user));
      router.replace("/(tabs)");
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await clearTokens();
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)/login");
  }, [dispatch]);

  return { applyAuthResult, logout };
}
