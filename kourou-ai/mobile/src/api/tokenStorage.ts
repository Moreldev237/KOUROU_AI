import * as SecureStore from "expo-secure-store";

// On stocke les JWT dans le stockage sécurisé natif (Keychain/Keystore), pas
// dans AsyncStorage : ce sont des identifiants sensibles, ils méritent le
// même traitement qu'un mot de passe.

const ACCESS_TOKEN_KEY = "kourou_access_token";
const REFRESH_TOKEN_KEY = "kourou_refresh_token";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

async function secureStoreIsAvailable(): Promise<boolean> {
  if (isBrowser) {
    return false;
  }

  try {
    return Boolean(
      typeof SecureStore.isAvailableAsync === "function" &&
        (await SecureStore.isAvailableAsync())
    );
  } catch {
    return false;
  }
}

function getBrowserItem(key: string): string | null {
  if (!isBrowser) {
    return null;
  }
  return window.localStorage.getItem(key);
}

async function getItem(key: string): Promise<string | null> {
  return (await secureStoreIsAvailable())
    ? SecureStore.getItemAsync(key)
    : getBrowserItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (await secureStoreIsAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (isBrowser) {
    window.localStorage.setItem(key, value);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (await secureStoreIsAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (isBrowser) {
    window.localStorage.removeItem(key);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, access), setItem(REFRESH_TOKEN_KEY, refresh)]);
}

export async function setAccessToken(access: string): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, access);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}
