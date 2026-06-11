import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { getSettings, ProductItem } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SmartProduct {
  product_id: number | string;
  product_title: string;
  product_main_image_url?: string;
  target_sale_price?: string;
  target_sale_price_currency?: string;
  target_original_price?: string;
  target_original_price_currency?: string;
  discount?: string;
  evaluate_rate?: string;
  lastest_volume?: number;
  shop_name?: string;
  shop_url?: string;
  first_level_category_name?: string;
  commission_rate?: string;
  product_detail_url?: string;
  affiliate_product_url?: string;
  affiliate_store_url?: string;
}

interface SmartMatchResponse {
  products: SmartProduct[];
  total_record_count: number;
  total_page_no: number;
  current_page_no: number;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = Spacing.md;
const HORIZONTAL_PADDING = Spacing.lg;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

function parseRating(evaluate_rate?: string): number | null {
  if (!evaluate_rate) return null;
  const raw = String(evaluate_rate).replace(/[^0-9.]/g, "");
  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  if (String(evaluate_rate).includes("%") || num > 5) {
    return Math.min(5, parseFloat((num / 100 * 5).toFixed(1)));
  }
  return Math.min(5, num);
}

function StarRating({ rating, size = 11 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    stars.push(
      <FontAwesome
        key={i}
        name="star"
        size={size}
        color={filled ? "#FFC107" : "#D9D9D9"}
        style={{ marginRight: 1 }}
      />
    );
  }
  return (
    <View style={starStyles.row}>
      {stars}
      <ThemedText type="small" style={starStyles.label}>
        {rating.toFixed(1)}
      </ThemedText>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  label: { fontSize: 10, color: "#888", marginLeft: 3 },
});

interface SmartMatchViewProps {
  productId?: string;
  keywords?: string;
  emptyMessageOverride?: string;
}

export function SmartMatchView({ productId, keywords, emptyMessageOverride }: SmartMatchViewProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const isRTL = language === "ar";

  const PAGE_SIZE = 10;
  const [products, setProducts] = useState<SmartProduct[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initialLoadedRef = useRef(false);
  const listRef = useRef<FlatList>(null);

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const settings = await getSettings();
        const apiUrl = getApiUrl();
        const body: Record<string, string | number> = {
          page_no: pageToLoad,
          currency: settings.currency || "USD",
          language: settings.productLanguage || (settings.language === "ar" ? "AR" : "EN"),
          country: settings.country || "",
        };
        if (productId) body.product_id = productId;
        if (keywords) body.keywords = keywords;

        const res = await fetch(new URL("/api/smart-match", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error((e as any).message || "Failed to load");
        }
        const data: SmartMatchResponse = await res.json();
        const list = (data.products || []).slice(0, PAGE_SIZE);
        setProducts(list);
        // Reliable indicator: if the API returned a full page, more pages likely exist.
        // (We do NOT rely on data.total_page_no — the upstream often defaults it to 1.)
        setHasMore(list.length >= PAGE_SIZE);
      } catch (err) {
        console.error("Smart match fetch failed:", err);
        setErrorMsg(t("no_products_found"));
        setProducts([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [productId, keywords, t]
  );

  useEffect(() => {
    if (initialLoadedRef.current) return;
    initialLoadedRef.current = true;
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPrev = () => {
    if (pageNo <= 1 || isLoading) return;
    const next = pageNo - 1;
    setPageNo(next);
    scrollToTop();
    fetchPage(next);
  };

  const goNext = () => {
    if (!hasMore || isLoading) return;
    const next = pageNo + 1;
    setPageNo(next);
    scrollToTop();
    fetchPage(next);
  };

  const buildProductItem = (hp: SmartProduct): ProductItem => {
    const currency = hp.target_sale_price_currency || hp.target_original_price_currency || "";
    const priceVal = hp.target_sale_price || "";
    const originalVal = hp.target_original_price || priceVal;
    const formattedPrice = priceVal ? `${priceVal} ${currency}`.trim() : "N/A";
    const formattedOriginal = originalVal ? `${originalVal} ${currency}`.trim() : formattedPrice;
    const discount = hp.discount ? String(hp.discount) : "0%";
    const productIdStr = String(hp.product_id);

    return {
      id: `smt-${productIdStr}-${Date.now()}`,
      productId: productIdStr,
      title: hp.product_title || "",
      imageUrl: hp.product_main_image_url || null,
      price: formattedPrice,
      originalPrice: formattedOriginal,
      discount: discount.endsWith("%") ? discount : `${discount}%`,
      storeName: hp.shop_name || "",
      evaluateRate: hp.evaluate_rate || "N/A",
      shopUrl: hp.shop_url || "N/A",
      categoryName: hp.first_level_category_name || "N/A",
      commissionRate: hp.commission_rate || "N/A",
      orders: hp.lastest_volume != null ? String(hp.lastest_volume) : "N/A",
      shipping_fees: t("free_shipping"),
      searchedAt: new Date().toISOString(),
      offers: [],
      originalUrl: hp.product_detail_url,
      affiliateUrl: hp.affiliate_product_url || undefined,
      affiliateStoreUrl: hp.affiliate_store_url || undefined,
    };
  };

  const handleProductPress = (hp: SmartProduct) => {
    const product = buildProductItem(hp);
    navigation.navigate("ProductDetails", { product, hideOffers: true, bestSeller: true });
  };

  const renderProduct = ({ item }: { item: SmartProduct }) => {
    const currency = item.target_sale_price_currency || item.target_original_price_currency || "";
    const price = item.target_sale_price;
    const original = item.target_original_price;
    const hasDiscount =
      item.discount &&
      String(item.discount).replace(/[^0-9.]/g, "") !== "" &&
      parseFloat(String(item.discount)) > 0;
    const rating = parseRating(item.evaluate_rate);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            width: CARD_WIDTH,
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => handleProductPress(item)}
        testID={`card-smart-match-${item.product_id}`}
      >
        <View style={styles.imageWrap}>
          {item.product_main_image_url ? (
            <Image
              source={{ uri: item.product_main_image_url }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
                styles.imagePlaceholder,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="image" size={28} color={theme.textSecondary} />
            </View>
          )}
          {hasDiscount ? (
            <View style={[styles.discountBadge, isRTL ? { right: Spacing.xs } : { left: Spacing.xs }]}>
              <ThemedText type="small" style={styles.discountText}>
                -{String(item.discount).replace("%", "")}%
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <ThemedText
            type="small"
            numberOfLines={2}
            style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}
          >
            {item.product_title}
          </ThemedText>

          <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <ThemedText type="body" style={styles.price}>
              {price ? `${price} ${currency}` : "—"}
            </ThemedText>
          </View>

          {original && original !== price ? (
            <ThemedText
              type="small"
              style={[
                styles.originalPrice,
                { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {`${original} ${currency}`}
            </ThemedText>
          ) : null}

          {rating !== null ? <StarRating rating={rating} size={11} /> : null}

          {item.lastest_volume != null ? (
            <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="shopping-bag" size={11} color={theme.textSecondary} />
              <ThemedText type="small" style={[styles.metaText, { color: theme.textSecondary }]}>
                {item.lastest_volume}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const paginationFooter = products.length > 0 ? (
    <View style={[styles.paginationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <Pressable
        style={({ pressed }) => [
          styles.pageButton,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          (pageNo <= 1 || isLoading) && { opacity: 0.4 },
          pressed && { opacity: 0.7 },
        ]}
        disabled={pageNo <= 1 || isLoading}
        onPress={goPrev}
        testID="button-similar-prev"
      >
        <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={16} color={theme.text} />
        <ThemedText type="small">{t("previous")}</ThemedText>
      </Pressable>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t("page")} {pageNo}
      </ThemedText>

      <Pressable
        style={({ pressed }) => [
          styles.pageButton,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          (!hasMore || isLoading) && { opacity: 0.4 },
          pressed && { opacity: 0.7 },
        ]}
        disabled={!hasMore || isLoading}
        onPress={goNext}
        testID="button-similar-next"
      >
        <ThemedText type="small">{t("next")}</ThemedText>
        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={theme.text} />
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item, idx) => `${item.product_id}-${idx}`}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          errorMsg ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={AppColors.error} />
              <ThemedText type="small" style={{ color: AppColors.error, flex: 1 }}>
                {errorMsg}
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {t("loading_products")}
                </ThemedText>
              </View>
            ) : null}
            {paginationFooter}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Feather name="package" size={36} color={theme.textSecondary} />
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}
              >
                {emptyMessageOverride || t("no_recommendations")}
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: Spacing["3xl"],
    gap: CARD_GAP,
    flexGrow: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,77,79,0.08)",
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: { width: "100%", aspectRatio: 1, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  discountBadge: {
    position: "absolute",
    top: Spacing.xs,
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  discountText: { color: "#FFFFFF", fontWeight: "700", fontSize: 10 },
  cardBody: { padding: Spacing.sm, gap: 4 },
  title: { fontWeight: "600", minHeight: 32 },
  priceRow: { alignItems: "center", gap: Spacing.xs },
  price: { color: AppColors.primary, fontWeight: "700" },
  originalPrice: { textDecorationLine: "line-through", fontSize: 11 },
  metaRow: { alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 11 },
  loadingBox: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  paginationRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
