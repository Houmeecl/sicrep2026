import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";

interface AuthUser {
  id: number;
  email: string;
  role: "provider" | "company_admin" | "executive" | "admin";
  fullName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: Record<string, string>) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Evita que la verificación inicial de sesión pise un login/registro que ya
  // resolvió mientras esa verificación seguía en curso.
  const sessionResolvedRef = useRef(false);

  useEffect(() => {
    api<AuthUser>("/api/auth/me")
      .then((u) => {
        if (!sessionResolvedRef.current) setUser(u);
      })
      .catch(() => {
        if (!sessionResolvedRef.current) setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await api<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    sessionResolvedRef.current = true;
    setUser(u);
    return u;
  };

  const register = async (data: Record<string, string>) => {
    const u = await api<AuthUser>("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
    sessionResolvedRef.current = true;
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    sessionResolvedRef.current = true;
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
