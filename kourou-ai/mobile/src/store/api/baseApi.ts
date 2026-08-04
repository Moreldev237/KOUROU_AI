import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "@/api/tokenStorage";
import type { RootState } from "@/store";
import { loggedOut } from "@/store/authSlice";

function getDefaultApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const debuggerHost = Constants.expoConfig?.hostUri ?? (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  if (Platform.OS === "android") {
    return "http://192.168.1.20:8000";
  }

  if (Platform.OS === "ios") {
    return "http://192.168.1.20:8000";
  }

  return "http://192.168.1.20:8000";
}

export const API_BASE_URL = getDefaultApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: async (headers) => {
    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Évite que N requêtes en échec simultané (401) ne déclenchent N appels de
// rafraîchissement en parallèle : la première déclenche le refresh, les
// suivantes attendent la même promesse.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access: string };
    await setAccessToken(data.access);
    return data.access;
  } catch {
    return null;
  }
}

/**
 * baseQuery avec ré-authentification automatique : sur un 401, tente un
 * rafraîchissement du token d'accès puis rejoue la requête UNE seule fois.
 * Si le rafraîchissement échoue (refresh token expiré/révoqué), on déconnecte
 * proprement l'utilisateur plutôt que de le laisser bloqué sur des 401 en boucle.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccess = await refreshPromise;

    if (newAccess) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      await clearTokens();
      api.dispatch(loggedOut());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Profile", "Quota", "Exams", "Subject", "QCMSession", "TutorConversations", "Subscription", "Transactions"],
  endpoints: () => ({}),
});

// Type utilitaire pour les selectors qui ont besoin du RootState complet.
export type { RootState };
