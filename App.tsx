import { Slot } from "expo-router";

import { AuthProvider } from "./src/features/auth/context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
