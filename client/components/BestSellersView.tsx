import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
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

type SortOption = "LAST_VOLUME_DESC" | "SALE_PRICE_ASC" | "SALE_PRICE_DESC";

interface Category {
  name: string;
  arName: string;
  id: string;
}

const CATEGORIES: Category[] = [
  { name: "Home Improvement", arName: "تحسين المنزل", id: "13" },
  { name: "Home & Garden", arName: "المنزل والحديقة", id: "15" },
  { name: "Sports & Entertainment", arName: "الرياضة والترفيه", id: "18" },
  { name: "Office & School Supplies", arName: "لوازم المكتب والمدرسة", id: "21" },
  { name: "Toys & Hobbies", arName: "الألعاب والهوايات", id: "26" },
  { name: "Security & Protection", arName: "الأمن والحماية", id: "30" },
  { name: "Automobiles", arName: "السيارات", id: "34" },
  { name: "Jewelry", arName: "المجوهرات", id: "36" },
  { name: "Lighting", arName: "الإضاءة", id: "39" },
  { name: "Consumer Electronics", arName: "الإلكترونيات الاستهلاكية", id: "44" },
  { name: "Beauty & Health", arName: "الجمال والصحة", id: "66" },
  { name: "Shoes", arName: "الأحذية", id: "322" },
  { name: "Weddings & Events", arName: "الأعراس والمناسبات", id: "320" },
  { name: "Electronic Components & Supplies", arName: "المكونات الإلكترونية", id: "502" },
  { name: "Phones", arName: "الهواتف", id: "509" },
  { name: "Tools", arName: "الأدوات", id: "1420" },
  { name: "Mother & Kids", arName: "الأم والطفل", id: "1501" },
  { name: "Furniture", arName: "الأثاث", id: "1503" },
  { name: "Watches", arName: "الساعات", id: "1511" },
  { name: "Luggage & Bags", arName: "الحقائب والشنط", id: "1524" },
  { name: "Women's Clothing", arName: "ملابس نسائية", id: "200000345" },
  { name: "Men's Clothing", arName: "ملابس رجالية", id: "200000343" },
  { name: "Apparel Accessories", arName: "إكسسوارات الملابس", id: "200000297" },
  { name: "Novelty & Special Use", arName: "منتجات مبتكرة", id: "200000532" },
  { name: "Special Category", arName: "فئة خاصة", id: "200001075" },
  { name: "Hair Extensions & Wigs", arName: "الشعر المستعار والوصلات", id: "200165144" },
  { name: "Underwear", arName: "الملابس الداخلية", id: "200574005" },
  { name: "Sports Shoes, Clothing & Accessories", arName: "ملابس وأحذية رياضية", id: "201768104" },
  { name: "Motorcycle Equipments & Parts", arName: "معدات الدراجات النارية", id: "201355758" },
  { name: "Second-Hand", arName: "مستعملة", id: "201520802" },
  { name: "Virtual Products", arName: "منتجات رقمية", id: "201169612" },
];

interface HotProduct {
  product_id: number | string;
  product_title: string;
  product_main_image_url?: string;
  target_sale_price?: string;
  target_sale_price_currency?: string;
  target_original_price?: string;
  target_original_price_currency?: string;
  sale_price?: string;
  original_price?: string;
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

interface HotProductsResponse {
  products: HotProduct[];
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

export function BestSellersView() {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const isRTL = language === "ar";

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [sort, setSort] = useState<SortOption>("LAST_VOLUME_DESC");
  const [pageNo, setPageNo] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const categoryScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isRTL) {
        categoryScrollRef.current?.scrollToEnd({ animated: false });
      } else {
        categoryScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isRTL]);

  const [products, setProducts] = useState<HotProduct[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const sortLabel = useMemo(() => {
    if (sort === "LAST_VOLUME_DESC") return t("sort_best_selling");
    if (sort === "SALE_PRICE_ASC") return t("sort_price_asc");
    return t("sort_price_desc");
  }, [sort, t]);

  const fetchProducts = useCallback(
    async (pageToLoad: number, kw: string, minP: string, maxP: string, srt: SortOption, catId: string) => {
      setIsLoading(true);
      setErrorMsg(null);
      // Clear previous results immediately so the user sees only the new page
      setProducts([]);
      try {
        const settings = await getSettings();
        const apiUrl = getApiUrl();
        const body: Record<string, string | number> = {
          page_no: pageToLoad,
          keywords: kw,
          min_price: minP,
          max_price: maxP,
          sort: srt,
          currency: settings.currency || "USD",
          language: settings.productLanguage || (settings.language === "ar" ? "AR" : "EN"),
        };
        if (catId) body.category_ids = catId;

        const res = await fetch(new URL("/api/hot-products", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error((e as any).message || "Failed to load");
        }
        const data: HotProductsResponse = await res.json();
        const list = data.products || [];
        setProducts(list);
        setHasMore(list.length >= PAGE_SIZE);
      } catch (err) {
        console.error("Hot products fetch failed:", err);
        setErrorMsg(err instanceof Error ? err.message : t("error"));
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    fetchProducts(pageNo, keywords, minPrice, maxPrice, sort, selectedCategoryId);
  }, [pageNo, keywords, minPrice, maxPrice, sort, selectedCategoryId, fetchProducts]);

  const applyFilters = () => {
    setKeywords(keywordsInput.trim());
    setMinPrice(minPriceInput.trim());
    setMaxPrice(maxPriceInput.trim());
    setPageNo(1);
  };

  const resetFilters = () => {
    setKeywordsInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setKeywords("");
    setMinPrice("");
    setMaxPrice("");
    setSort("LAST_VOLUME_DESC");
    setSelectedCategoryId("");
    setPageNo(1);
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    setPageNo(1);
  };

  const buildProductItem = (hp: HotProduct): ProductItem => {
    const currency = hp.target_sale_price_currency || hp.target_original_price_currency || "";
    const priceVal = hp.target_sale_price || "";
    const originalVal = hp.target_original_price || priceVal;
    const formattedPrice = priceVal ? `${priceVal} ${currency}`.trim() : "N/A";
    const formattedOriginal = originalVal ? `${originalVal} ${currency}`.trim() : formattedPrice;
    const discount = hp.discount ? String(hp.discount) : "0%";
    const productId = String(hp.product_id);

    return {
      id: `hot-${productId}-${Date.now()}`,
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

  const handleProductPress = (hp: HotProduct) => {
    const product = buildProductItem(hp);
    navigation.navigate("ProductDetails", { product, hideOffers: true, bestSeller: true });
  };

  const renderProduct = ({ item }: { item: HotProduct }) => {
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
        testID={`card-best-seller-${item.product_id}`}
      >
        <View style={styles.imageWrap}>
          {item.product_main_image_url ? (
            <Image
              source={{ uri: item.product_main_image_url }}
              style={styles.image}
              contentFit="cover"
            />
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

  const categoryBar = (
    <ScrollView
      ref={categoryScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.categoryBarContent,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
      style={styles.categoryBar}
    >
      <Pressable
        style={({ pressed }) => [
          styles.categoryChip,
          selectedCategoryId === "" && styles.categoryChipActive,
          selectedCategoryId === "" && { borderColor: AppColors.primary },
          { backgroundColor: selectedCategoryId === "" ? AppColors.primary : theme.backgroundDefault, borderColor: selectedCategoryId === "" ? AppColors.primary : theme.border },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => handleCategorySelect("")}
        testID="category-chip-all"
      >
        <ThemedText
          type="small"
          style={[
            styles.categoryChipText,
            { color: selectedCategoryId === "" ? "#FFFFFF" : theme.text },
          ]}
        >
          {t("all_categories")}
        </ThemedText>
      </Pressable>

      {CATEGORIES.map((cat) => {
        const isActive = selectedCategoryId === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor: isActive ? AppColors.primary : theme.backgroundDefault,
                borderColor: isActive ? AppColors.primary : theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handleCategorySelect(cat.id)}
            testID={`category-chip-${cat.id}`}
          >
            <ThemedText
              type="small"
              style={[styles.categoryChipText, { color: isActive ? "#FFFFFF" : theme.text }]}
            >
              {language === "ar" ? cat.arName : cat.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const headerComponent = (
    <View>
      {categoryBar}

      <SearchBar
        value={keywordsInput}
        onChangeText={setKeywordsInput}
        onSubmit={applyFilters}
        placeholder={t("search_keywords")}
        testID="input-best-sellers-search"
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
          testID="input-best-sellers-min-price"
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
          testID="input-best-sellers-max-price"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sortChip,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setShowSortMenu(true)}
          testID="button-best-sellers-sort"
        >
          <Feather name="filter" size={14} color={AppColors.primary} />
          <ThemedText type="small" numberOfLines={1} style={styles.sortChipText}>
            {sortLabel}
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Pressable
          style={({ pressed }) => [
            styles.applyButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={applyFilters}
          testID="button-best-sellers-apply"
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
          testID="button-best-sellers-reset"
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
        onPress={() => {
          scrollToTop();
          setPageNo((p) => Math.max(1, p - 1));
        }}
        testID="button-best-sellers-prev"
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
        onPress={() => {
          scrollToTop();
          setPageNo((p) => p + 1);
        }}
        testID="button-best-sellers-next"
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
              <Feather name="package" size={36} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {t("no_products_found")}
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
                style={({ pressed }) => [
                  styles.sortOption,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setSort(opt.key);
                  setPageNo(1);
                  setShowSortMenu(false);
                }}
                testID={`sort-option-${opt.key}`}
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
  },
  categoryBar: {
    marginBottom: Spacing.sm,
    marginHorizontal: -HORIZONTAL_PADDING,
  },
  categoryBarContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: Spacing.xs,
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full ?? 99,
    borderWidth: 1,
    marginRight: 2,
  },
  categoryChipActive: {},
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
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
  paginationRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  loadingBox: { alignItems: "center", padding: Spacing.lg },
  emptyBox: { alignItems: "center", padding: Spacing["3xl"] },
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
});
