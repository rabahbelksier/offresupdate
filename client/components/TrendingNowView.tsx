import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import {
  getCachedTrendingNowPage,
  saveTrendingNowPage,
  getCachedTrendingNowVersion,
  saveTrendingNowVersion,
  getCachedTrendingNowTotal,
  saveTrendingNowTotal,
  TrendingNowProduct,
} from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { getSettings } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const PAGE_SIZE = 10;

// Module-level persistence: survives navigation back without resetting to page 0
let _savedPage = 0;
let _savedCountry = "";

export function TrendingNowView() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [products, setProducts] = useState<TrendingNowProduct[]>([]);
  const [page, setPage] = useState(_savedPage);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingOffersId, setFetchingOffersId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [userCountry, setUserCountry] = useState("DZ");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchPage = useCallback(async (targetPage: number, country: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(
        new URL(`/api/trending/products?page=${targetPage}&country=${encodeURIComponent(country)}`, apiUrl).href
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const { products: newProducts, total: newTotal, version } = data;
      if (!isMounted.current) return;
      setProducts(newProducts);
      setTotal(newTotal);
      await saveTrendingNowPage(targetPage, country, newProducts);
      await saveTrendingNowVersion(version, country);
      await saveTrendingNowTotal(country, newTotal);
    } catch {
    } finally {
      if (isMounted.current && !silent) setIsLoading(false);
    }
  }, []);

  const loadPage = useCallback(
    async (targetPage: number, country: string) => {
      const cached = await getCachedTrendingNowPage(targetPage, country);
      if (cached && cached.length > 0) {
        setProducts(cached);
        // Restore total from cache so pagination buttons appear immediately
        const cachedTotal = await getCachedTrendingNowTotal(country);
        if (cachedTotal > 0 && isMounted.current) {
          setTotal(cachedTotal);
        }
      } else {
        await fetchPage(targetPage, country);
        return;
      }

      // Version check in background
      try {
        const cachedVersion = await getCachedTrendingNowVersion(country);
        const apiUrl = getApiUrl();
        const res = await fetch(
          new URL(`/api/trending/version?country=${encodeURIComponent(country)}`, apiUrl).href
        );
        if (res.ok) {
          const { version: serverVersion } = await res.json();
          if (serverVersion !== cachedVersion) {
            await fetchPage(targetPage, country, true);
          }
        }
      } catch {}
    },
    [fetchPage]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const settings = await getSettings();
        const country = (settings.country || "DZ").toUpperCase();
        if (!cancelled && isMounted.current) {
          setUserCountry(country);
          if (country !== _savedCountry) {
            // Country changed (or first load): reset to page 0
            _savedPage = 0;
            _savedCountry = country;
            setPage(0);
            loadPage(0, country);
          } else {
            // Same country: restore saved page (e.g. navigating back from ProductDetails)
            setPage(_savedPage);
            loadPage(_savedPage, country);
          }
        }
      })();
      return () => { cancelled = true; };
    }, [loadPage])
  );

  const handleNext = async () => {
    const next = page + 1;
    _savedPage = next;
    setPage(next);
    setIsLoading(true);
    const cached = await getCachedTrendingNowPage(next, userCountry);
    if (cached && cached.length > 0) {
      setProducts(cached);
      setIsLoading(false);
      // Background refresh
      fetchPage(next, userCountry, true);
    } else {
      await fetchPage(next, userCountry);
    }
  };

  const handlePrev = async () => {
    if (page === 0) return;
    const prev = page - 1;
    _savedPage = prev;
    setPage(prev);
    setIsLoading(true);
    const cached = await getCachedTrendingNowPage(prev, userCountry);
    if (cached && cached.length > 0) {
      setProducts(cached);
      setIsLoading(false);
    } else {
      await fetchPage(prev, userCountry);
    }
  };

  const handleCardPress = async (product: TrendingNowProduct) => {
    if (fetchingOffersId) return;
    setFetchingOffersId(product.productId);

    const apiUrl = getApiUrl();

    // Fire-and-forget: record +1 tap score for this card before fetching offers.
    // Uses skipTrending=true in /api/product so only this +1 is counted, not +5.
    fetch(new URL("/api/trending/tap", apiUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.productId,
        country: userCountry,
        title: product.title || null,
        imageUrl: product.imageUrl || null,
        price: product.price || null,
        originalPrice: product.originalPrice || null,
        discount: product.discount || null,
      }),
    }).catch(() => {});

    try {
      const settings = await getSettings();
      const url = `https://www.aliexpress.com/item/${product.productId}.html`;
      const res = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          country: settings.country,
          currency: settings.currency,
          language: settings.productLanguage,
          skipTrending: true,
        }),
      });
      if (!res.ok) throw new Error("fetch failed");
      const productData = await res.json();
      productData.originalUrl = url;

      // Build the updated products list using current state
      const updatedProducts = products.map(p =>
        p.productId === product.productId
          ? {
              ...p,
              title:         productData.title        || p.title,
              imageUrl:      productData.imageUrl     || p.imageUrl,
              price:         productData.price        || p.price,
              originalPrice: productData.originalPrice|| p.originalPrice,
              discount:      productData.discount     || p.discount,
            }
          : p
      );

      // Update the card in-place immediately
      setProducts(updatedProducts);

      // Await both cache and server updates before navigating so that
      // when useFocusEffect re-runs on return, both have the fresh data
      // and fetchPage cannot overwrite the card with the old server data.
      await Promise.all([
        saveTrendingNowPage(page, userCountry, updatedProducts).catch(() => {}),
        fetch(new URL("/api/trending/update-meta", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.productId,
            country: userCountry,
            title: productData.title || null,
            imageUrl: productData.imageUrl || null,
            price: productData.price || null,
            originalPrice: productData.originalPrice || null,
            discount: productData.discount || null,
          }),
        }).catch(() => {}),
      ]);

      navigation.navigate("ProductDetails", { product: productData });
    } catch {
    } finally {
      if (isMounted.current) setFetchingOffersId(null);
    }
  };

  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasPrev = page > 0;
  const isRtl = language === "ar";

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View
        style={[
          styles.sectionHeader,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.titleRow}>
          <View
            style={[
              styles.fireBadge,
              { backgroundColor: isDark ? "rgba(255,106,0,0.15)" : "rgba(255,106,0,0.1)" },
            ]}
          >
            <ThemedText style={styles.fireEmoji}>🔥</ThemedText>
          </View>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: AppColors.primary }]}>
            {t("trending_now")}
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.6 }]}
          onPress={() => setShowInfo(true)}
          hitSlop={8}
        >
          <Feather name="info" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Empty state */}
      {products.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {t("trending_now_empty")}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
            {t("trending_now_empty_desc")}
          </ThemedText>
        </View>
      ) : (
        <>
          {/* Product Cards */}
          {products.map((item, index) => (
            <Pressable
              key={item.productId}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                },
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleCardPress(item)}
              disabled={fetchingOffersId !== null}
            >
              {/* Rank badge */}
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor:
                      index === 0
                        ? "#FFD700"
                        : index === 1
                        ? "#C0C0C0"
                        : index === 2
                        ? "#CD7F32"
                        : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.rankText,
                    { color: index < 3 ? "#333" : theme.textSecondary },
                  ]}
                >
                  {page * PAGE_SIZE + index + 1}
                </ThemedText>
              </View>

              {/* Image */}
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.productImage,
                    styles.imagePlaceholder,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,106,0,0.08)"
                        : "rgba(255,106,0,0.05)",
                    },
                  ]}
                >
                  <Feather name="image" size={24} color={theme.textSecondary} />
                </View>
              )}

              {/* Info */}
              <View style={styles.cardInfo}>
                {item.title ? (
                  <ThemedText
                    type="body"
                    numberOfLines={2}
                    style={styles.productTitle}
                  >
                    {item.title}
                  </ThemedText>
                ) : (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("tap_to_see_offers")}
                  </ThemedText>
                )}

                <View style={[styles.metaRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                  {item.price && (
                    <View
                      style={[
                        styles.pricePill,
                        { backgroundColor: isDark ? "rgba(255,106,0,0.15)" : "rgba(255,106,0,0.08)" },
                      ]}
                    >
                      <ThemedText style={styles.priceText}>
                        {item.price}
                      </ThemedText>
                    </View>
                  )}
                  {item.discount && item.discount !== "0%" && (
                    <View style={[styles.discountPill, { backgroundColor: isDark ? "rgba(255,77,79,0.15)" : "rgba(255,77,79,0.08)" }]}>
                      <ThemedText style={styles.discountText}>
                        -{item.discount}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={[styles.searchesRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                  <Feather name="trending-up" size={12} color={AppColors.primary} />
                  <ThemedText
                    type="small"
                    style={{ color: AppColors.primary, fontWeight: "600" }}
                  >
                    {item.quantity} {t("searches")}
                  </ThemedText>
                </View>
              </View>

              {/* Loading overlay per card */}
              {fetchingOffersId === item.productId && (
                <View style={styles.cardOverlay}>
                  <ActivityIndicator size="small" color={AppColors.primary} />
                </View>
              )}

              {/* Arrow */}
              <Feather
                name={isRtl ? "chevron-left" : "chevron-right"}
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
          ))}

          {/* Pagination */}
          {(hasPrev || hasNext) && (
            <View
              style={[
                styles.pagination,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.pageBtn,
                  !hasPrev && styles.pageBtnDisabled,
                  pressed && { opacity: 0.7 },
                  {
                    backgroundColor: hasPrev
                      ? isDark
                        ? "rgba(255,106,0,0.12)"
                        : "rgba(255,106,0,0.06)"
                      : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: hasPrev
                      ? `${AppColors.primary}40`
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
                onPress={handlePrev}
                disabled={!hasPrev}
              >
                <Feather
                  name={isRtl ? "chevron-right" : "chevron-left"}
                  size={16}
                  color={hasPrev ? AppColors.primary : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: hasPrev ? AppColors.primary : theme.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  {isRtl ? "السابق" : "Prev"}
                </ThemedText>
              </Pressable>

              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, alignSelf: "center" }}
              >
                {page + 1} / {Math.ceil(total / PAGE_SIZE) || 1}
              </ThemedText>

              <Pressable
                style={({ pressed }) => [
                  styles.pageBtn,
                  !hasNext && styles.pageBtnDisabled,
                  pressed && { opacity: 0.7 },
                  {
                    backgroundColor: hasNext
                      ? isDark
                        ? "rgba(255,106,0,0.12)"
                        : "rgba(255,106,0,0.06)"
                      : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: hasNext
                      ? `${AppColors.primary}40`
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
                onPress={handleNext}
                disabled={!hasNext}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: hasNext ? AppColors.primary : theme.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  {isRtl ? "التالي" : "Next"}
                </ThemedText>
                <Feather
                  name={isRtl ? "chevron-left" : "chevron-right"}
                  size={16}
                  color={hasNext ? AppColors.primary : theme.textSecondary}
                />
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* Info Modal */}
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowInfo(false)}
        >
          <Pressable
            style={[
              styles.infoModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={["rgba(255,106,0,0.12)", "transparent"]}
              style={styles.infoModalGradient}
            />
            <View style={styles.infoModalHeader}>
              <ThemedText style={styles.fireEmoji}>🔥</ThemedText>
              <ThemedText type="h4" style={{ color: AppColors.primary }}>
                {t("trending_now_info_title")}
              </ThemedText>
            </View>
            <ThemedText
              type="body"
              style={[styles.infoBody, { color: theme.textSecondary }]}
            >
              {t("trending_now_info_body")}
            </ThemedText>
            <Pressable
              style={({ pressed }) => [
                styles.infoCloseBtn,
                { backgroundColor: AppColors.primary },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => setShowInfo(false)}
            >
              <ThemedText style={styles.infoBtnText}>{t("confirm")}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fireBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  fireEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    flexShrink: 0,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  pricePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.primary,
  },
  discountPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.error,
  },
  searchesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  infoModal: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: "100%",
    overflow: "hidden",
    gap: Spacing.md,
  },
  infoModalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  infoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoBody: {
    lineHeight: 22,
  },
  infoCloseBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  infoBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
