import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGetCurrentUser, apiLogout, type AuthUser } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: apiGetCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const user = data?.user ?? null;

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.setQueryData(["/api/auth/me"], { user: null });
    queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
  }, [queryClient]);

  const refreshUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoginOpen, openLogin, closeLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
