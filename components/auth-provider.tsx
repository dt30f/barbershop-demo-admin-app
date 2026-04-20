'use client';

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loginStaff } from '@/lib/api';
import { readStoredSession, writeStoredSession } from '@/lib/auth';
import { StaffSession } from '@/lib/types';

type AuthContextValue = {
  session: StaffSession | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async login(input) {
        const nextSession = await loginStaff(input);
        writeStoredSession(nextSession);
        setSession(nextSession);
      },
      logout() {
        writeStoredSession(null);
        setSession(null);
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
