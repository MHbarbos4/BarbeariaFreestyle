import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isClientSuspended } from "@/services/api/authService";

type Role = "client" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  phone?: string;
  role: Role;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
  // login function removida - usar loginWithPhone ou loginAdmin
  loginWithPhone: (payload: { userId: string; name: string; phoneNumber: string }) => Promise<void>;
  loginAdmin: (payload: { id: string; name: string; phoneNumber: string }) => Promise<void>;
  logout: () => void;
  checkSuspension: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "bf_auth";

function readStored(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw) as { user: AuthUser; token: string };
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicializa diretamente com os dados do localStorage para evitar flash de redirecionamento
  const [user, setUser] = useState<AuthUser | null>(() => readStored().user);
  const [token, setToken] = useState<string | null>(() => readStored().token);
  const [suspended, setSuspended] = useState<boolean>(false);

  // Verifica suspensão ao carregar e periodicamente
  const checkSuspension = React.useCallback(async () => {
    if (user && user.role === "client") {
      const isSuspended = await isClientSuspended(user.id);
      setSuspended(isSuspended);
      return isSuspended;
    }
    setSuspended(false);
    return false;
  }, [user]);

  // Verificar suspensão ao carregar
  useEffect(() => {
    checkSuspension();
  }, [checkSuspension]);

  // Função login removida - sistema usa loginWithPhone (cliente) ou loginAdmin (admin)
  // Cliente: autentica apenas com telefone (sem senha)
  // Admin: autentica com telefone + senha

  const loginWithPhone = async ({ userId, name, phoneNumber }: { userId: string; name: string; phoneNumber: string }) => {
    const nextUser: AuthUser = {
      id: userId,
      name,
      phone: phoneNumber,
      role: "client",
    };
    const nextToken = "demo-token";

    setUser(nextUser);
    setToken(nextToken);
    // Verifica suspensão após login (não bloqueia, apenas informa)
    const isSuspended = await isClientSuspended(userId);
    setSuspended(isSuspended);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const loginAdmin = async ({ id, name, phoneNumber }: { id: string; name: string; phoneNumber: string }) => {
    const nextUser: AuthUser = {
      id,
      name,
      phone: phoneNumber,
      role: "admin",
    };
    const nextToken = "demo-token";

    setUser(nextUser);
    setToken(nextToken);
    setSuspended(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSuspended(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === "admin",
      isSuspended: suspended,
      loginWithPhone,
      loginAdmin,
      logout,
      checkSuspension,
    }),
    [user, token, suspended, loginWithPhone, loginAdmin, logout, checkSuspension]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
