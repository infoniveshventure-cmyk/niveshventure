"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth, onAuthStateChanged, User as FirebaseUser } from "@/lib/firebase";

type Profile = {
  memberId: string;
  fullName: string;
  email: string;
  role: string;
  rank: string;
  isActive: boolean;
  walletBalance: number;
  boosterWalletBalance: number;
  nivshWalletBalance: number;
  usdtWalletBalance: number;
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

// Poll interval in milliseconds (30 seconds for real-time balance updates)
const POLL_INTERVAL_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshProfile() {
    try {
      const res = await fetch("/api/user/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        return;
      }
    } catch {
      // ignore and fall back to auth/me
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

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(() => {
      refreshProfile().catch(() => {});
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;
      setFirebaseUser(u);
      if (u) {
        await refreshProfile();
        startPolling();
      } else {
        setProfile(null);
        stopPolling();
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
        startPolling();
      }
    };

    init();

    return () => {
      mounted = false;
      unsub();
      stopPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
