"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/client";

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthState {
  user: UserInfo | null;
  tenant: TenantInfo | null;
  token: string | null;
  tenants: Array<{
    tenantId: string;
    role: string;
    tenant: { id: string; name: string; slug: string };
  }>;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; name: string; phone?: string; invitationToken?: string }) => Promise<{ tenantToken?: string; invitationAccepted?: boolean }>;
  selectTenant: (tenantId: string) => Promise<void>;
  createTenant: (data: { name: string; slug: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseToken(token: string): { userId?: string; email?: string; tenantId?: string; role?: string; exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    token: null,
    tenants: [],
    isLoading: true,
  });

  // Restore from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const tenantStr = localStorage.getItem("tenant");
    const tenantsStr = localStorage.getItem("tenants");

    if (token && userStr) {
      const parsed = parseToken(token);
      if (parsed?.exp && parsed.exp * 1000 < Date.now()) {
        // Token expired
        localStorage.clear();
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }
      setState({
        user: JSON.parse(userStr),
        tenant: tenantStr ? JSON.parse(tenantStr) : null,
        token,
        tenants: tenantsStr ? JSON.parse(tenantsStr) : [],
        isLoading: false,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    const user = { id: res.user.id, email: res.user.email, name: res.user.name };
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("tenants", JSON.stringify(res.tenants));
    setState({
      user,
      tenant: null,
      token: res.token,
      tenants: res.tenants,
      isLoading: false,
    });
  }, []);

  const signup = useCallback(
    async (data: { email: string; password: string; name: string; phone?: string; invitationToken?: string }) => {
      const res = await api.auth.signup(data);
      const user = { id: res.user.id, email: res.user.email, name: res.user.name };

      // If invitation was accepted and we have a tenant token, store it
      if (res.invitationAccepted && res.tenantToken) {
        localStorage.setItem("token", res.tenantToken);
        localStorage.setItem("user", JSON.stringify(user));
        // Populate tenants with the joined organization
        const tenants = res.tenant
          ? [{ tenantId: res.tenant.id, role: "user", tenant: res.tenant }]
          : [];
        localStorage.setItem("tenants", JSON.stringify(tenants));
        localStorage.setItem("tenant", JSON.stringify({
          id: "",
          name: "",
          slug: "",
          role: "",
        }));
        setState({
          user,
          tenant: null,
          token: res.tenantToken,
          tenants,
          isLoading: false,
        });
        return { tenantToken: res.tenantToken, invitationAccepted: true };
      }

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("tenants", JSON.stringify([]));
      setState({
        user,
        tenant: null,
        token: res.token,
        tenants: [],
        isLoading: false,
      });
      return { invitationAccepted: false };
    },
    []
  );

  const selectTenant = useCallback(
    async (tenantId: string) => {
      const res = await api.auth.selectTenant({ tenantId });
      const tenantEntry = state.tenants.find((t) => t.tenantId === tenantId);
      const tenant = {
        id: res.tenant.id,
        name: res.tenant.name,
        slug: res.tenant.slug,
        role: tenantEntry?.role || "user",
      };
      localStorage.setItem("token", res.token);
      localStorage.setItem("tenant", JSON.stringify(tenant));
      setState((s) => ({ ...s, token: res.token, tenant }));
    },
    [state.tenants]
  );

  const createTenant = useCallback(async (data: { name: string; slug: string }) => {
    const res = await api.tenants.create(data);
    const tenant = {
      id: res.tenant.id,
      name: res.tenant.name,
      slug: res.tenant.slug,
      role: "owner",
    };
    const newEntry = { tenantId: res.tenant.id, role: "owner", tenant: res.tenant };
    localStorage.setItem("token", res.token);
    localStorage.setItem("tenant", JSON.stringify(tenant));
    setState((s) => ({
      ...s,
      token: res.token,
      tenant,
      tenants: [...s.tenants, newEntry],
    }));
    localStorage.setItem(
      "tenants",
      JSON.stringify([...state.tenants, newEntry])
    );
  }, [state.tenants]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    localStorage.removeItem("tenants");
    setState({
      user: null,
      tenant: null,
      token: null,
      tenants: [],
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, selectTenant, createTenant, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
