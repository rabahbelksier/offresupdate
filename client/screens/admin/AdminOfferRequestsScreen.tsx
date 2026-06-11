import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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

interface OfferRequest {
  id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  user_link: string | null;
  user_link_img: string | null;
  user_details: string | null;
  country: string | null;
  created_user_at: string;
  link: string | null;
  link_img: string | null;
  details: string | null;
  title: string | null;
  price: string | null;
  code_value: string | null;
  coupon_vondor: string | null;
  status: string | null;
  created_admin_at: string | null;
}

function formatAlgerianTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  // Algeria is UTC+1 year-round (no DST) — reliable on all platforms
  const local = new Date(date.getTime() + 60 * 60 * 1000);
  const d = String(local.getUTCDate()).padStart(2, "0");
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const y = local.getUTCFullYear();
  const h = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

export default function AdminOfferRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const apiUrl = getApiUrl();

  const [requests, setRequests] = useState<OfferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRequests = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(new URL("/api/admin/offre-users", apiUrl).href);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = ({ item }: { item: OfferRequest }) => {
    const userName =
      [item.first_name, item.last_name].filter(Boolean).join(" ") || item.user_id;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() =>
          navigation.navigate("AdminOfferRequestDetail", { request: item })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${AppColors.primary}20` },
              ]}
            >
              <Feather name="user" size={16} color={AppColors.primary} />
            </View>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              {userName}
            </ThemedText>
          </View>
          <View style={styles.cardMeta}>
            {item.country ? (
              <View style={[styles.countryBadge, { backgroundColor: `${AppColors.primary}15` }]}>
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "700" }}>
                  {item.country}
                </ThemedText>
              </View>
            ) : null}
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatAlgerianTime(item.created_user_at)}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="h3">{t("admin_offer_requests")}</ThemedText>
        <Pressable
          onPress={() => navigation.navigate("AdminOfferHistory")}
          style={({ pressed }) => [styles.historyBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Feather name="archive" size={22} color={AppColors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            {t("offer_request_loading")}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRequests(true)}
              tintColor={AppColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={52} color={theme.textSecondary} />
              <ThemedText
                type="h4"
                style={{
                  color: theme.textSecondary,
                  marginTop: Spacing.md,
                  textAlign: "center",
                }}
              >
                {t("offer_request_empty")}
              </ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  historyBtn: {
    padding: Spacing.xs,
  },
  list: { padding: Spacing.md, paddingBottom: 60 },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  countryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
  },
});
