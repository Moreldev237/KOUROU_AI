import * as SecureStore from "expo-secure-store";

const CONSENT_KEY_PREFIX = "kourou_rgpd_consent_";
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

async function secureStoreIsAvailable(): Promise<boolean> {
  if (isBrowser) return false;

  try {
    return Boolean(
      typeof SecureStore.isAvailableAsync === "function" &&
        (await SecureStore.isAvailableAsync())
    );
  } catch {
    return false;
  }
}

function consentKey(userId: string): string {
  return `${CONSENT_KEY_PREFIX}${userId}`;
}

export async function getConsent(userId: string): Promise<string | null> {
  const key = consentKey(userId);
  if (await secureStoreIsAvailable()) {
    return SecureStore.getItemAsync(key);
  }

  return isBrowser ? window.localStorage.getItem(key) : null;
}

export async function setConsent(userId: string, value: "accepted" | "declined"): Promise<void> {
  const key = consentKey(userId);
  if (await secureStoreIsAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (isBrowser) {
    window.localStorage.setItem(key, value);
  }
}