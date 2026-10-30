import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: number;
  email: string;
  role: "ADMIN" | "MEMBER";
  dmz: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("synop_token");
    const savedUser = localStorage.getItem("synop_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("synop_token", newToken);
    localStorage.setItem("synop_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("synop_token");
    localStorage.removeItem("synop_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Global axios interceptor for token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("synop_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global axios interceptor for 403 Forbidden (Session expired or invalidated)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      localStorage.removeItem("synop_token");
      localStorage.removeItem("synop_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
