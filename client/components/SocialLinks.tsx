import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Linking, AppState, Text } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCachedSocialLinks,
  fetchSocialLinksFromApi,
  SocialLinksData,
} from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ICONS = [
  { key: "telegram" as const, icon: "telegram" },
  { key: "facebook" as const, icon: "facebook" },
  { key: "tiktok" as const, icon: "tiktok" },
  { key: "bot" as const, icon: "robot" },
] as const;

const SOCIAL_REFRESH_INTERVAL = 5 * 60 * 1000;
const UNREAD_POLL_INTERVAL = 30_000;

export const LAST_READ_COUNT_KEY = (userId: string) =>
  `@offers365_chat_read_count_${userId}`;

export function SocialLinks() {
  const [links, setLinks] = useState<SocialLinksData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchRef = useRef<number>(0);
  const { user, isAdmin } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const apiUrl = getApiUrl();

  useEffect(() => {
    let mounted = true;

    const loadLinks = async (forceApi = false) => {
      const cached = await getCachedSocialLinks();
      if (mounted) setLinks(cached);

      const now = Date.now();
      if (!forceApi && now - lastFetchRef.current < SOCIAL_REFRESH_INTERVAL) return;

      const fresh = await fetchSocialLinksFromApi(apiUrl);
      if (mounted && fresh) {
        setLinks(fresh);
        lastFetchRef.current = Date.now();
      }
    };

    loadLinks(true);
    const interval = setInterval(() => loadLinks(true), SOCIAL_REFRESH_INTERVAL);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") loadLinks(); });

    return () => { mounted = false; clearInterval(interval); sub.remove(); };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchUnread = async () => {
      try {
        if (isAdmin) {
          const res = await fetch(new URL("/api/admin/chat/total-unread", apiUrl).href);
          if (res.ok && mounted) {
            const data = await res.json();
            setUnreadCount(data.count || 0);
          }
        } else if (user?.id) {
          const res = await fetch(new URL(`/api/chat/unread/${user.id}`, apiUrl).href);
          if (res.ok && mounted) {
            const data = await res.json();
            const total: number = data.count || 0;
            const stored = await AsyncStorage.getItem(LAST_READ_COUNT_KEY(user.id));
            const lastSeen = stored ? parseInt(stored, 10) : 0;
            setUnreadCount(Math.max(0, total - lastSeen));
          }
        }
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, UNREAD_POLL_INTERVAL);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") fetchUnread(); });

    return () => { mounted = false; clearInterval(interval); sub.remove(); };
  }, [user?.id, isAdmin]);

  const openLink = async (url: string | null) => {
    if (!url) return;
    try { await Linking.openURL(url); } catch {}
  };

  const handleSupportPress = () => {
    if (isAdmin) {
      navigation.navigate("AdminChatsList");
    } else {
      navigation.navigate("SupportChat");
    }
  };

  if (!links) return null;

  const iconBg = isDark ? "rgba(255,106,0,0.12)" : "rgba(255,106,0,0.08)";

  return (
    <View style={styles.container}>
      {ICONS.map(({ key, icon }) =>
        links[key] ? (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: iconBg },
              pressed && styles.pressed,
            ]}
            onPress={() => openLink(links[key])}
            testID={`social-${key}`}
          >
            <FontAwesome5 name={icon} size={15} color={AppColors.primary} />
          </Pressable>
        ) : null
      )}

      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          { backgroundColor: iconBg },
          pressed && styles.pressed,
        ]}
        onPress={handleSupportPress}
        testID="social-support"
      >
        <FontAwesome5 name="headset" size={15} color={AppColors.primary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.93 }],
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});
