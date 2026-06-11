import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
} from "react-native";
import { SearchBar } from "@/components/SearchBar";
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
const PAGE_SIZE = 10;

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

export function SearchView() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const isRTL = language === "ar";

  const [keywordsInput, setKeywordsInput] = useState("");
  const [activeKeywords, setActiveKeywords] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  type SortOption = "" | "LAST_VOLUME_DESC" | "SALE_PRICE_ASC" | "SALE_PRICE_DESC";
  const [sort, setSort] = useState<SortOption>("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [products, setProducts] = useState<SmartProduct[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sortLabel = useMemo(() => {
    if (sort === "SALE_PRICE_ASC") return t("sort_price_asc");
    if (sort === "SALE_PRICE_DESC") return t("sort_price_desc");
    if (sort === "LAST_VOLUME_DESC") return t("sort_best_selling");
    return t("sort_by");
  }, [sort, t]);

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const fetchProducts = useCallback(
    async (
      kw: string,
      pageToLoad: number,
      minP: string,
      maxP: string,
      sortVal: SortOption,
    ) => {
      if (!kw.trim()) return;
      setIsLoading(true);
      setErrorMsg(null);
      // Clear previous results immediately so the user sees only the new search
      setProducts([]);
      try {
        const settings = await getSettings();
        const apiUrl = getApiUrl();
        const body: Record<string, any> = {
          page_no: pageToLoad,
          keywords: kw,
          currency: settings.currency || "USD",
          language: settings.productLanguage || (settings.language === "ar" ? "AR" : "EN"),
        };
        if (minP) body.min_price = minP;
        if (maxP) body.max_price = maxP;
        if (sortVal) body.sort = sortVal;

        const res = await fetch(new URL("/api/smart-match", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error((e as any).message || t("error"));
        }
        const data: SmartMatchResponse = await res.json();
        const list = (data.products || []).slice(0, PAGE_SIZE);
        setProducts(list);
        // Reliable indicator: if the API returned a full page, more pages likely exist.
        // (We do NOT rely on data.total_page_no — the upstream often defaults it to 1.)
        setHasMore(list.length >= PAGE_SIZE);
      } catch (err) {
        console.error("Search fetch failed:", err);
        setErrorMsg(t("no_products_found"));
        setProducts([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const runSearch = () => {
    const kw = keywordsInput.trim();
    if (!kw) return;
    const minP = minPriceInput.trim();
    const maxP = maxPriceInput.trim();
    setActiveKeywords(kw);
    setMinPrice(minP);
    setMaxPrice(maxP);
    setPageNo(1);
    setHasSearched(true);
    scrollToTop();
    fetchProducts(kw, 1, minP, maxP, sort);
  };

  const resetFilters = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setSort("");
    // If a search was already run, re-run it without the filters so the user sees the effect
    if (activeKeywords) {
      setMinPrice("");
      setMaxPrice("");
      setPageNo(1);
      scrollToTop();
      fetchProducts(activeKeywords, 1, "", "", "");
    }
  };

  const goPrev = () => {
    if (pageNo <= 1 || isLoading) return;
    const next = pageNo - 1;
    setPageNo(next);
    scrollToTop();
    fetchProducts(activeKeywords, next, minPrice, maxPrice, sort);
  };

  const goNext = () => {
    if (!hasMore || isLoading) return;
    const next = pageNo + 1;
    setPageNo(next);
    scrollToTop();
    fetchProducts(activeKeywords, next, minPrice, maxPrice, sort);
  };

  const buildProductItem = (hp: SmartProduct): ProductItem => {
    const currency = hp.target_sale_price_currency || hp.target_original_price_currency || "";
    const priceVal = hp.target_sale_price || "";
    const originalVal = hp.target_original_price || priceVal;
    const formattedPrice = priceVal ? `${priceVal} ${currency}`.trim() : "N/A";
    const formattedOriginal = originalVal ? `${originalVal} ${currency}`.trim() : formattedPrice;
    const discount = hp.discount ? String(hp.discount) : "0%";
    const productId = String(hp.product_id);

    return {
      id: `srch-${productId}-${Date.now()}`,
      productId,
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
          { width: CARD_WIDTH, backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => handleProductPress(item)}
        testID={`card-search-${item.product_id}`}
      >
        <View style={styles.imageWrap}>
          {item.product_main_image_url ? (
            <Image source={{ uri: item.product_main_image_url }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="image" size={28} color={theme.textSecondary} />
            </View>
          )}
          {hasDiscount ? (
            <View style={styles.discountBadge}>
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
              style={[styles.originalPrice, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
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

  const headerComponent = (
    <View>
      <SearchBar
        value={keywordsInput}
        onChangeText={setKeywordsInput}
        onSubmit={runSearch}
        placeholder={t("search_placeholder")}
        showSubmitButton
        testID="input-search-keywords"
      />

      <View style={[styles.filtersRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TextInput
          style={[
            styles.priceInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
          placeholder={t("min_price")}
          placeholderTextColor={theme.textSecondary}
          value={minPriceInput}
          onChangeText={setMinPriceInput}
          keyboardType="numeric"
          testID="input-search-min-price"
        />
        <TextInput
          style={[
            styles.priceInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
          placeholder={t("max_price")}
          placeholderTextColor={theme.textSecondary}
          value={maxPriceInput}
          onChangeText={setMaxPriceInput}
          keyboardType="numeric"
          testID="input-search-max-price"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sortChip,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setShowSortMenu(true)}
          testID="button-search-sort"
        >
          <Feather name="filter" size={14} color={AppColors.primary} />
          <ThemedText type="small" numberOfLines={1} style={styles.sortChipText}>
            {sortLabel}
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Pressable
          style={({ pressed }) => [styles.applyButton, pressed && { opacity: 0.85 }]}
          onPress={runSearch}
          testID="button-search-apply"
        >
          <ThemedText type="small" style={styles.applyButtonText}>
            {t("apply_filters")}
          </ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            { borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
          onPress={resetFilters}
          testID="button-search-reset"
        >
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {t("reset_filters")}
          </ThemedText>
        </Pressable>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={14} color={AppColors.error} />
          <ThemedText type="small" style={{ color: AppColors.error, flex: 1 }}>
            {errorMsg}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const footerComponent = products.length > 0 ? (
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
        testID="button-search-prev"
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
        testID="button-search-next"
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
        ListHeaderComponent={headerComponent}
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
            {footerComponent}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Feather name="search" size={36} color={theme.textSecondary} />
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}
              >
                {hasSearched ? t("no_products_found") : t("search_empty_hint")}
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showSortMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortMenu(false)}>
          <View
            style={[
              styles.sortMenu,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            {([
              { key: "LAST_VOLUME_DESC", label: t("sort_best_selling") },
              { key: "SALE_PRICE_ASC", label: t("sort_price_asc") },
              { key: "SALE_PRICE_DESC", label: t("sort_price_desc") },
            ] as { key: SortOption; label: string }[]).map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [styles.sortOption, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setSort(opt.key);
                  setShowSortMenu(false);
                }}
                testID={`sort-option-search-${opt.key}`}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: sort === opt.key ? AppColors.primary : theme.text,
                    fontWeight: sort === opt.key ? "700" : "400",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {opt.label}
                </ThemedText>
                {sort === opt.key ? (
                  <Feather name="check" size={16} color={AppColors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  searchBar: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filtersRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 13,
    minWidth: 0,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    maxWidth: 130,
  },
  sortChipText: {
    fontWeight: "600",
    fontSize: 11,
    flexShrink: 1,
  },
  actionsRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  applyButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: { color: "#FFFFFF", fontWeight: "700" },
  resetButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  sortMenu: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
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
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: "hidden" },
  imageWrap: { width: "100%", aspectRatio: 1, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  discountBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
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
  loadingBox: { paddingVertical: Spacing.lg, alignItems: "center", justifyContent: "center" },
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
