import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { User } from "@/types";

interface AuthState {
  user: User | null;
  // true tant qu'on n'a pas fini de vérifier s'il existe des tokens stockés
  // au démarrage de l'app (évite un flash de l'écran de connexion).
  isHydrating: boolean;
}

const initialState: AuthState = {
  user: null,
  isHydrating: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isHydrating = false;
    },
    hydrationFinished(state) {
      state.isHydrating = false;
    },
    loggedOut(state) {
      state.user = null;
      state.isHydrating = false;
    },
  },
});

export const { setUser, hydrationFinished, loggedOut } = authSlice.actions;
export default authSlice.reducer;
