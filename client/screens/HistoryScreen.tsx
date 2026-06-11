import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProductCard } from "@/components/ProductCard";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import {
  getRecentProducts,
  clearRecentProducts,
  ProductItem,
} from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [recentProducts, setRecentProducts] = useState<ProductItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });

  const loadProducts = useCallback(async () => {
    const products = await getRecentProducts();
    setRecentProducts(products);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleClearConfirm = async () => {
    await clearRecentProducts();
    setRecentProducts([]);
    setShowClearConfirm(false);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setToast({ visible: true, message: t("info"), type: "success" });
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: isDark
              ? "rgba(255,106,0,0.12)"
              : "rgba(255,106,0,0.08)",
          },
        ]}
      >
        <Image
          source={require("../../assets/images/empty-history.png")}
          style={styles.emptyImage}
          resizeMode="contain"
        />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        {t("no_recent_products")}
      </ThemedText>
      <ThemedText
        type="small"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        {t("paste_desc")}
      </ThemedText>
    </View>
  );

  const renderFooter = () => {
    if (recentProducts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.clearBtn,
            {
              backgroundColor: isDark
                ? "rgba(255,77,79,0.1)"
                : "rgba(255,77,79,0.06)",
              borderColor: isDark
                ? "rgba(255,77,79,0.25)"
                : "rgba(255,77,79,0.15)",
            },
            pressed && styles.pressed,
          ]}
          onPress={() => setShowClearConfirm(true)}
        >
          <Feather name="trash-2" size={16} color={AppColors.error} />
          <ThemedText
            type="small"
            style={{ color: AppColors.error, fontWeight: "600" }}
          >
            {t("clear_history")}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
      <ConfirmDeleteModal
        visible={showClearConfirm}
        message={t("delete_confirm_history_msg")}
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />

      {recentProducts.length > 0 && (
        <View
          style={[
            styles.sectionHeader,
            {
              flexDirection: language === "ar" ? "row-reverse" : "row",
              borderBottomColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View
            style={[styles.sectionDot, { backgroundColor: AppColors.primary }]}
          />
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t("recent_products")}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginLeft: 4 }}
          >
            ({recentProducts.length})
          </ThemedText>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={recentProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() =>
              navigation.navigate("ProductDetails", { product: item })
            }
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 15 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyImage: { width: 90, height: 90 },
  emptyTitle: { marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
