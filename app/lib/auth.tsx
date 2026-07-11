import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  email_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEYS = {
  accessToken: "god_access_token",
  refreshToken: "god_refresh_token",
  sessionToken: "god_session_token",
  user: "god_user",
} as const;

let globalLogout: (() => void) | null = null;

export function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then((res) => {
    if (res.status === 401 && globalLogout) {
      globalLogout();
    }
    return res;
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setSessionToken(null);
  }, []);

  useEffect(() => {
    globalLogout = logout;
    return () => { globalLogout = null; };
  }, [logout]);

  useEffect(() => {
    const storedAccess = localStorage.getItem(STORAGE_KEYS.accessToken);
    const storedRefresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const storedSession = localStorage.getItem(STORAGE_KEYS.sessionToken);
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);

    if (storedAccess && storedUser) {
      import("./api").then(({ fetchMe }) => {
        fetchMe(storedAccess)
          .then((userData) => {
            setAccessToken(storedAccess);
            setRefreshToken(storedRefresh);
            setSessionToken(storedSession);
            setUser(userData);
          })
          .catch(() => {
            Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
          })
          .finally(() => setIsLoading(false));
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const persistAuth = (
    access: string,
    refresh: string,
    session: string,
    userData: UserResponse,
  ) => {
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
    localStorage.setItem(STORAGE_KEYS.sessionToken, session);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
    setAccessToken(access);
    setRefreshToken(refresh);
    setSessionToken(session);
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const { loginUser, fetchMe } = await import("./api");
    const tokens = await loginUser(email, password);
    const userData = await fetchMe(tokens.access_token);
    persistAuth(tokens.access_token, tokens.refresh_token, tokens.session_token, userData);
  };

  const register = async (email: string, username: string, password: string) => {
    const { registerUser, fetchMe } = await import("./api");
    const tokens = await registerUser(email, username, password);
    const userData = await fetchMe(tokens.access_token);
    persistAuth(tokens.access_token, tokens.refresh_token, tokens.session_token, userData);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, sessionToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
