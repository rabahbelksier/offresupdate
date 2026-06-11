import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { getApiUrl } from "@/lib/query-client";
import { fetchAndCacheTemplatesFromServer } from "@/lib/storage";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@offers365_user";

async function updatePushTokenWithUser(userId: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "6a569cd5-9b06-4750-95c1-8f65687e521b",
    });
    await fetch(new URL("/api/push-token", getApiUrl()).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenData.data, userId }),
    });
  } catch {}
}

async function setOnlineStatus(userId: string, status: "on" | "off") {
  if (!userId || userId === "admin") return;
  try {
    const apiUrl = getApiUrl();
    await fetch(new URL(`/api/auth/online/${userId}`, apiUrl).href, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: status }),
    });
  } catch {
    // Silently ignore network errors for status updates
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    loadUser();
  }, []);

  // Track app foreground/background for online status.
  // Session time is now calculated entirely server-side:
  // every heartbeat (online=on) adds elapsed seconds since lastSeen to temps,
  // and going offline adds the remaining time since the last heartbeat.
  useEffect(() => {
    if (!user || user.isAdmin) return;

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev !== "active" && nextState === "active") {
        setOnlineStatus(user.id, "on");
      } else if (prev === "active" && (nextState === "background" || nextState === "inactive")) {
        setOnlineStatus(user.id, "off");
      }
    });

    return () => sub.remove();
  }, [user]);

  // Heartbeat every 45s: server accumulates elapsed time on each "on" call
  useEffect(() => {
    if (!user || user.isAdmin) return;

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        setOnlineStatus(user.id, "on");
      }
    }, 45_000);

    return () => clearInterval(interval);
  }, [user]);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as User;
        setUser(parsed);
        if (!parsed.isAdmin) {
          setOnlineStatus(parsed.id, "on");
          const apiUrl = getApiUrl();
          fetchAndCacheTemplatesFromServer(apiUrl).catch(() => {});
          // Re-link push token with userId on every app start so that
          // country-specific and chat notifications always work, even for
          // tokens that were originally saved before the user logged in.
          updatePushTokenWithUser(parsed.id).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      if (!userData.isAdmin) {
        await setOnlineStatus(userData.id, "on");
        const apiUrl = getApiUrl();
        fetchAndCacheTemplatesFromServer(apiUrl).catch(() => {});
        updatePushTokenWithUser(userData.id).catch(() => {});
      }
    } catch (error) {
      console.error("Failed to save user:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user && !user.isAdmin) {
        await setOnlineStatus(user.id, "off");
      }
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Failed to logout:", error);
      throw error;
    }
  };

  const updateUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: !!(user?.isAdmin),
        login,
        logout,
        updateUser,
      }}
    >
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
