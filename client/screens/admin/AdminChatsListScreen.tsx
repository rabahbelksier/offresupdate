import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  message: string | null;
  message_admin: string | null;
  created_at: string;
  unread_count: string | number;
  online: string | null;
}

function formatRelativeTime(dateStr: string, language: string): string {
  if (!dateStr) return "";
  // Normalize PostgreSQL timestamp format (e.g. "2024-01-15 10:30:00+00")
  // to ISO 8601 so Hermes / JSC can parse it reliably.
  const normalized = dateStr
    .replace(" ", "T")
    .replace(/(\+\d{2})$/, "$1:00");
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (language === "ar") {
    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `${diffMins}د`;
    if (diffHours < 24) return `${diffHours}س`;
    if (diffDays < 7) return `${diffDays}ي`;
  } else {
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
  }
  return date.toLocaleDateString([], { day: "numeric", month: "numeric" });
}

export default function AdminChatsListScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const apiUrl = getApiUrl();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(new URL("/api/admin/chat/conversations", apiUrl).href);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
    finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const q = search.toLowerCase();
        return (
          (c.first_name || "").toLowerCase().includes(q) ||
          (c.last_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          c.user_id.includes(q)
        );
      })
    : conversations;

  const renderItem = ({ item }: { item: Conversation }) => {
    const unread = parseInt(String(item.unread_count || "0"), 10);
    const lastMsg = item.message || item.message_admin || "";
    const isOnline = item.online === "on";
    const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ") || item.user_id;
    const initial = (item.first_name?.[0] || item.user_id[0] || "?").toUpperCase();

    return (
      <Pressable
        style={[
          styles.convCard,
          {
            backgroundColor: unread > 0 ? `${AppColors.primary}12` : theme.backgroundDefault,
            borderColor: unread > 0 ? AppColors.primary : theme.border,
          },
        ]}
        onPress={() => navigation.navigate("AdminChatDetail", { userId: item.user_id, userName: fullName })}
      >
        <View style={[styles.avatar, { backgroundColor: `${AppColors.primary}20` }]}>
          <ThemedText type="body" style={{ color: AppColors.primary, fontWeight: "700" }}>
            {initial}
          </ThemedText>
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
          <View style={styles.convRow}>
            <ThemedText type="body" style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>
              {fullName}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
              {formatRelativeTime(item.created_at, language)}
            </ThemedText>
          </View>
          <View style={styles.convRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
              {lastMsg || "..."}
            </ThemedText>
            {unread > 0 && (
              <View style={styles.badge}>
                <ThemedText type="caption" style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  {unread}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t("search_chats")}
          placeholderTextColor={theme.textSecondary}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="message-square" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            {t("no_conversations")}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchConversations(true); }}
              tintColor={AppColors.primary}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1 },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    marginLeft: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
