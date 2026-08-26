import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

import { getAccessToken } from "@/api/tokenStorage";
import { useLazyGetMeQuery } from "@/store/api/authApi";
import { hydrationFinished, setUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Au démarrage de l'app : si un token d'accès est déjà stocké (Keychain /
 * Keystore), on récupère le profil pour restaurer la session sans repasser
 * par l'écran de connexion. Le splash screen reste visible pendant cette
 * vérification pour éviter un flash de l'écran de login avant redirection.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isHydrating = useAppSelector((state) => state.auth.isHydrating);
  const [fetchMe] = useLazyGetMeQuery();

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        dispatch(hydrationFinished());
        return;
      }
      try {
        const user = await fetchMe().unwrap();
        dispatch(setUser(user));
      } catch {
        // Token invalide/expiré et non-rafraîchissable : on repart propre,
        // l'utilisateur sera redirigé vers l'écran de connexion.
        dispatch(hydrationFinished());
      }
    })();
  }, [dispatch, fetchMe]);

  useEffect(() => {
    if (!isHydrating) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isHydrating]);

  if (isHydrating) return null;

  return <>{children}</>;
}
