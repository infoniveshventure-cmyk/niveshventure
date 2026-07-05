"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthStateChanged, User as FirebaseUser } from "@/lib/firebase";

type Profile = {
  memberId: string;
  fullName: string;
  email: string;
  role: string;
  rank: string;
  isActive: boolean;
  walletBalance: number;
  [key: string]: any;
};

type AuthState = {
  firebaseUser: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const res = await fetch("/api/user/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        return;
      }
    } catch {
      // ignore and fall back to Firebase-based state
    }

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        return;
      }
    } catch {
      // ignore
    }

    setProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;
      setFirebaseUser(u);
      if (u) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      if (mounted) {
        setLoading(false);
      }
    });

    const init = async () => {
      if (!mounted) return;
      await refreshProfile();
      if (mounted) {
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
