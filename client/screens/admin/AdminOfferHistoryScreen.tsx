import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
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

function formatAlgerianTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-DZ", {
    timeZone: "Africa/Algiers",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOfferHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const apiUrl = getApiUrl();

  const [requests, setRequests] = useState<OfferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHistory = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(new URL("/api/admin/offre-users/history", apiUrl).href);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {}
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const getStatusColor = (status: string | null) => {
    if (status === "yes") return "#22c55e";
    if (status === "no") return AppColors.error;
    return theme.textSecondary;
  };

  const getStatusLabel = (status: string | null) => {
    if (status === "yes") return t("offer_request_processed");
    if (status === "no") return t("offer_request_cancelled");
    return t("offer_request_pending");
  };

  const renderItem = ({ item }: { item: OfferRequest }) => {
    const userName =
      [item.first_name, item.last_name].filter(Boolean).join(" ") || item.user_id;
    const statusColor = getStatusColor(item.status);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: statusColor,
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
                { backgroundColor: `${statusColor}20` },
              ]}
            >
              <Feather
                name={item.status === "yes" ? "check-circle" : "x-circle"}
                size={16}
                color={statusColor}
              />
            </View>
            <View>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                {userName}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: statusColor, fontWeight: "600" }}
              >
                {getStatusLabel(item.status)}
              </ThemedText>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {t("offer_request_sent_at")}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatAlgerianTime(item.created_user_at)}
            </ThemedText>
          </View>
        </View>

        {item.link_img || item.user_link_img ? (
          <Image
            source={{ uri: (item.link_img || item.user_link_img)! }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : null}

        {item.title ? (
          <ThemedText
            type="body"
            style={{ fontWeight: "700", marginBottom: Spacing.xs }}
            numberOfLines={2}
          >
            {item.title}
          </ThemedText>
        ) : null}

        {item.price ? (
          <ThemedText type="caption" style={{ color: AppColors.primary }}>
            {t("offer_request_final_price")}: {item.price}
          </ThemedText>
        ) : null}

        {item.created_admin_at && (
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            {t("offer_request_processed_at")}: {formatAlgerianTime(item.created_admin_at)}
          </ThemedText>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="h3">{t("offer_request_history_title")}</ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.primary} />
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
              onRefresh={() => fetchHistory(true)}
              tintColor={AppColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="archive" size={52} color={theme.textSecondary} />
              <ThemedText
                type="h4"
                style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  list: { padding: Spacing.md, paddingBottom: 60 },
  card: {
    borderWidth: 2,
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
  cardImage: {
    width: "100%",
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
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
