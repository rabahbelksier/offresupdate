import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { OfferButton } from "@/components/OfferButton";
import { SocialLinks } from "@/components/SocialLinks";
import { Toast } from "@/components/Toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import CartBundleSheet from "@/components/CartBundleSheet";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { translations } from "@/constants/translations";
import { formatProductMessage, getShareTemplate, getDetailsTemplate, getCopyAllTemplate, getBestSellerTemplate, saveProduct, getSettings, ProductItem, AppSettings, DEFAULT_SETTINGS, saveItem, isItemSaved, SavedItem, fetchAndCacheTemplatesFromServer } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ProductDetailsRouteProp = RouteProp<RootStackParamList, "ProductDetails">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<ProductDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { product: initialProduct, hideOffers, bestSeller } = route.params;

  const [product, setProduct] = useState<ProductItem>(initialProduct);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPriceFetching, setIsPriceFetching] = useState(false);
  const [showCartBundle, setShowCartBundle] = useState(false);

  const savedId = `product_${initialProduct.productId}`;

  React.useEffect(() => {
    if (!bestSeller || !initialProduct.originalUrl) return;
    let cancelled = false;
    // Treat "N/A" (any case) and empty strings as missing values so that the
    // 2-stage refresh never overwrites a good value with "N/A".
    const isValid = (v: unknown): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string") {
        const s = v.trim();
        return s.length > 0 && s.toUpperCase() !== "N/A";
      }
      return true;
    };
    const pick = <T,>(next: T, prev: T): T => (isValid(next) ? next : prev);
    const fetchRealPrice = async () => {
      setIsPriceFetching(true);
      try {
        const s = await getSettings();
        const apiUrl = getApiUrl();
        const response = await fetch(new URL("/api/product", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: initialProduct.originalUrl,
            country: s.country,
            currency: s.currency,
            language: s.productLanguage,
            skipTrending: true,
          }),
        });
        if (!response.ok) return;
        const fullProduct: ProductItem = await response.json();
        if (cancelled) return;
        setProduct((prev) => ({
          ...prev,
          price: pick(fullProduct.price, prev.price),
          originalPrice: pick(fullProduct.originalPrice, prev.originalPrice),
          discount: pick(fullProduct.discount, prev.discount),
          evaluateRate: pick(fullProduct.evaluateRate, prev.evaluateRate),
          storeName: pick(fullProduct.storeName, prev.storeName),
          orders: pick(fullProduct.orders, prev.orders),
          // Pull the same coupon / promo-code data that the home-URL flow shows,
          // so Best Sellers / Search / Similar Products details now display
          // coupon value, final price and the side-drawer promo codes.
          couponValue: pick(fullProduct.couponValue, prev.couponValue),
          finalPrice: pick(fullProduct.finalPrice, prev.finalPrice),
          promoCodes:
            fullProduct.promoCodes && fullProduct.promoCodes.length > 0
              ? fullProduct.promoCodes
              : prev.promoCodes,
          promoCouponValue: pick(fullProduct.promoCouponValue, prev.promoCouponValue),
          cod_1: pick(fullProduct.cod_1, prev.cod_1),
          cod_2: pick(fullProduct.cod_2, prev.cod_2),
          cod_3: pick(fullProduct.cod_3, prev.cod_3),
        }));
      } catch {
      } finally {
        if (!cancelled) setIsPriceFetching(false);
      }
    };
    fetchRealPrice();
    return () => { cancelled = true; };
  }, []);

  const handleSaveItem = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const item: SavedItem = {
      savedId,
      type: "product",
      title: product.title,
      imageUrl: product.imageUrl,
      savedAt: new Date().toISOString(),
      productData: product,
    };
    const result = await saveItem(item);
    if (result === "saved") {
      setIsSaved(true);
      showToast(t("item_saved"));
    } else {
      showToast(t("item_already_saved"), "error");
    }
  };

  React.useEffect(() => {
    isItemSaved(savedId).then(setIsSaved);
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("product_details"),
      headerRight: () => (
        <Pressable onPress={handleSaveItem} hitSlop={10} style={{ padding: 8 }}>
          <Feather name="bookmark" size={22} color={isSaved ? AppColors.primary : theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, t, isSaved, product, theme]);

  React.useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const triggerHaptic = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Best-effort refresh of templates from the DB so each copy/share action
  // picks up the latest admin edits without forcing the user to restart the
  // app. Failures (offline, server down) are silent — the cached copy is used.
  const refreshTemplatesFromServer = async () => {
    try {
      await fetchAndCacheTemplatesFromServer(getApiUrl());
    } catch {
      // Ignore: fall back to the locally cached templates.
    }
  };

  const copyAll = async () => {
    try {
      await refreshTemplatesFromServer();
      const template = bestSeller ? await getBestSellerTemplate(language) : await getCopyAllTemplate(language);
      const text = formatProductMessage(product, template);
      await Clipboard.setStringAsync(text);
      await triggerHaptic();
      showToast(t("copied_to_clipboard"), "success");
    } catch (error) {
      showToast(t("error"), "error");
    }
  };

  const copyDetails = async () => {
    try {
      await refreshTemplatesFromServer();
      const template = await getDetailsTemplate(language);
      const text = formatProductMessage(product, template);
      await Clipboard.setStringAsync(text);
      await triggerHaptic();
      showToast(t("copied_to_clipboard"), "success");
    } catch (error) {
      showToast(t("error"), "error");
    }
  };

  const copyTitle = async () => {
    try {
      await Clipboard.setStringAsync(product.title);
      await triggerHaptic();
      showToast(t("copied_to_clipboard"), "success");
    } catch (error) {
      showToast(t("error"), "error");
    }
  };

  const shareProduct = async () => {
    try {
      await refreshTemplatesFromServer();
      const template = bestSeller ? await getBestSellerTemplate(language) : await getShareTemplate("share", language);
      const text = formatProductMessage(product, template);
      await Share.share({ message: text });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleBuyBestSeller = async () => {
    const url =
      product.affiliateUrl ||
      (product.productId
        ? `https://www.aliexpress.com/item/${product.productId}.html`
        : product.originalUrl);
    if (!url) {
      showToast(t("error"), "error");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      showToast(t("error"), "error");
    }
  };

  const handleProductOffers = async () => {
    if (!product.originalUrl) {
      showToast(t("error"), "error");
      return;
    }
    setIsRefreshing(true);
    try {
      const s = await getSettings();
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: product.originalUrl,
          country: s.country,
          currency: s.currency,
          language: s.productLanguage,
          trendingScore: 3,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || t("error"));
      }
      const fullProduct: ProductItem = await response.json();
      fullProduct.originalUrl = product.originalUrl;
      await saveProduct(fullProduct);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.replace("ProductDetails", { product: fullProduct });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("error"), "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadImage = async () => {
    if (!product.imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      let imageUrl = product.imageUrl;
      if (imageUrl.startsWith("//")) {
        imageUrl = `https:${imageUrl}`;
      }
      imageUrl = imageUrl.replace(/\d+x\d+/, "1536x1536");

      if (Platform.OS === "web") {
        await Linking.openURL(imageUrl);
        return;
      }

      let hasPermission = false;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        hasPermission = status === "granted";
      } catch (permError) {
        console.error("Permission request failed:", permError);
        showToast(t("error"), "error");
        return;
      }

      if (!hasPermission) {
        showToast(t("error"), "error");
        return;
      }

      const fileUri =
        FileSystem.documentDirectory +
        `product_${product.productId}_${Date.now()}.jpg`;

      const isAliExpress = imageUrl.includes("alicdn.com") || imageUrl.includes("aliexpress.com");
      const downloadUrl = isAliExpress ? imageUrl : `${getApiUrl()}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
      const { uri, status } = await FileSystem.downloadAsync(downloadUrl, fileUri);

      if (status !== 200) {
        showToast(t("error"), "error");
        return;
      }

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || (info.size !== undefined && info.size < 1024)) {
        showToast(t("error"), "error");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      await triggerHaptic();
      showToast(t("success"), "success");
    } catch (error) {
      console.error("Failed to download image:", error);
      showToast(t("error"), "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const refreshOffer = async () => {
    setIsRefreshing(true);
    try {
      const settings = await getSettings();
      const productUrl = `https://www.aliexpress.com/item/${product.productId}.html`;
      // Reuse the original input URL if stored, so the scraping fallback (Microlink)
      // can use it to bypass AliExpress bot detection — same pipeline as "Get Offers"
      const urlToRefresh = product.originalUrl || productUrl;
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlToRefresh,
          country: settings.country,
          currency: settings.currency,
          language: settings.productLanguage,
          skipTrending: true,
          skipCache: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("error"));
      }

      const updatedProduct: ProductItem = await response.json();
      // Preserve the originalUrl across refreshes so future refreshes stay consistent
      updatedProduct.originalUrl = product.originalUrl || productUrl;
      await saveProduct(updatedProduct);
      setProduct(updatedProduct);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("success"), "success");
    } catch (error) {
      console.error("Failed to refresh offer:", error);
      showToast(
        error instanceof Error ? error.message : t("error"),
        "error"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <LoadingOverlay visible={isRefreshing} message={t("loading")} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl.replace(/\d+x\d+/, "1536x1536") }}
              style={styles.productImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="image" size={48} color={theme.textSecondary} />
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.downloadButton,
              { backgroundColor: theme.backgroundRoot },
              (pressed || isDownloading) && styles.pressed,
            ]}
            onPress={downloadImage}
            disabled={isDownloading}
            testID="button-download-image"
          >
            <Feather
              name={isDownloading ? "loader" : "download"}
              size={20}
              color={isDownloading ? theme.textSecondary : AppColors.primary}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ThemedText type="h3" style={[styles.title, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
            {product.title}
          </ThemedText>

          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.priceRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <View style={{ alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {t("current_price")}
                  </ThemedText>
                  {isPriceFetching ? (
                    <ActivityIndicator size="small" color={AppColors.primary} style={{ transform: [{ scale: 0.6 }] }} />
                  ) : null}
                </View>
                <ThemedText type="h2" style={{ color: AppColors.primary }}>
                  {product.price}
                </ThemedText>
              </View>
              <View style={[styles.priceRight, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xl, alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }]}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {t("original_price")}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={[styles.originalPrice, { color: theme.textSecondary }]}
                >
                  {product.originalPrice}
                </ThemedText>
              </View>
              {product.discount && product.discount !== "0%" && (
                <View style={[styles.discountBadge, { [language === 'ar' ? 'marginRight' : 'marginLeft']: "auto" }]}>
                  <ThemedText type="small" style={styles.discountText}>
                    -{product.discount}
                  </ThemedText>
                </View>
              )}
            </View>

            {product.finalPrice && (
              <View style={[styles.couponDetails, { backgroundColor: `${AppColors.success}10`, borderColor: AppColors.success }]}>
                <View style={[styles.couponInfo, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <View style={{ alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {t("coupon_value")}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: AppColors.success, fontWeight: '700' }}>
                      -{product.couponValue}
                    </ThemedText>
                  </View>
                  <View style={{ [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xl, alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {t("final_price")}
                    </ThemedText>
                    <ThemedText type="h3" style={{ color: AppColors.success, fontWeight: '800' }}>
                      {product.finalPrice}
                    </ThemedText>
                  </View>
                </View>
                
                {product.promoCodes && product.promoCodes.length > 0 && (
                  <View style={[styles.promoCodesSection, { alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }]}>
                    <ThemedText type="small" style={{ fontWeight: '600', marginBottom: Spacing.xs }}>
                      {t("best_promo_codes")}:
                    </ThemedText>
                    <View style={[styles.promoCodesRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                      {product.promoCodes.map((code, idx) => (
                        <Pressable 
                          key={idx}
                          onPress={() => {
                            Clipboard.setStringAsync(code);
                            showToast(`${code} ${t("copied_to_clipboard")}`, "success");
                            triggerHaptic();
                          }}
                          style={[styles.promoCodeBadge, { backgroundColor: theme.backgroundSecondary }]}
                        >
                          <ThemedText type="small" style={{ fontWeight: '700' }}>{code}</ThemedText>
                          <Feather name="copy" size={12} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                        </Pressable>
                      ))}
                    </View>
                    {product.couponTitle ? (
                      <ThemedText
                        type="small"
                        style={{ color: AppColors.success, marginTop: Spacing.xs, textAlign: language === 'ar' ? 'right' : 'left' }}
                      >
                        {product.couponTitle}
                      </ThemedText>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.infoGrid, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Feather name="shopping-bag" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                  {product.storeName}
                </ThemedText>
              </View>
              {product.evaluateRate && product.evaluateRate !== "N/A" && (() => {
                const rawRate = String(product.evaluateRate).replace(/[^0-9.]/g, "");
                const rateNum = parseFloat(rawRate);
                if (isNaN(rateNum)) return null;
                const ratingOf5 = String(product.evaluateRate).includes("%") || rateNum > 5
                  ? Math.min(5, parseFloat((rateNum / 100 * 5).toFixed(1)))
                  : Math.min(5, rateNum);
                const filledStars = Math.round(ratingOf5);
                return (
                  <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      {[1,2,3,4,5].map((i) => (
                        <FontAwesome key={i} name="star" size={14} color={i <= filledStars ? "#FFC107" : "#D9D9D9"} />
                      ))}
                    </View>
                    <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs, fontWeight: '600' }]}>
                      {ratingOf5.toFixed(1)}/5
                    </ThemedText>
                  </View>
                );
              })()}
              {product.orders && product.orders !== "N/A" && (
                <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <Feather name="trending-up" size={16} color={AppColors.primary} />
                  <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                    {product.orders} {t("orders")}
                  </ThemedText>
                </View>
              )}
              {product.categoryName && (
                <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <Feather name="list" size={16} color={theme.textSecondary} />
                  <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                    {product.categoryName}
                  </ThemedText>
                </View>
              )}
            </View>
            
            {product.shopUrl && product.shopUrl !== "N/A" && (
              <Pressable
                onPress={async () => {
                  const url = product.affiliateStoreUrl || product.shopUrl!;
                  await Linking.openURL(url);
                }}
                style={[styles.shopButton, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              >
                <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: '600' }}>
                  {t("visit_store")}
                </ThemedText>
                <Feather name="external-link" size={14} color={AppColors.primary} style={{ [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }} />
              </Pressable>
            )}
          </View>

          <View style={[styles.copyActions, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.copyButton,
                { backgroundColor: AppColors.primary },
                pressed && styles.pressed,
              ]}
              onPress={copyAll}
              testID="button-copy-all"
            >
              <Feather name="copy" size={14} color="#FFFFFF" />
              <ThemedText type="small" numberOfLines={1} adjustsFontSizeToFit style={styles.copyButtonText}>
                {t("copy_all")}
              </ThemedText>
            </Pressable>
            {bestSeller ? null : (
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  { borderColor: theme.border, borderWidth: 1 },
                  pressed && styles.pressed,
                ]}
                onPress={copyTitle}
                testID="button-copy-title"
              >
                <Feather name="type" size={14} color={theme.text} />
                <ThemedText type="small" numberOfLines={1} adjustsFontSizeToFit>{t("copy_title")}</ThemedText>
              </Pressable>
            )}
            {bestSeller ? null : (
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  { borderColor: theme.border, borderWidth: 1 },
                  pressed && styles.pressed,
                ]}
                onPress={copyDetails}
                testID="button-copy-details"
              >
                <Feather name="file-text" size={14} color={theme.text} />
                <ThemedText type="small" numberOfLines={1} adjustsFontSizeToFit>{t("details")}</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.copyButton,
                { backgroundColor: AppColors.secondary },
                pressed && styles.pressed,
              ]}
              onPress={shareProduct}
              testID="button-share-product"
            >
              <Feather name="share-2" size={14} color="#FFFFFF" />
              <ThemedText type="small" numberOfLines={1} adjustsFontSizeToFit style={styles.copyButtonText}>
                {t("share")}
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.similarProductsButton,
              { borderColor: AppColors.primary, flexDirection: language === 'ar' ? 'row-reverse' : 'row' },
              pressed && styles.pressed,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate("SimilarProducts", {
                productTitle: product.title,
                productId: product.productId,
              });
            }}
            testID="button-similar-products"
          >
            <Feather name="grid" size={18} color={AppColors.primary} />
            <ThemedText type="body" style={styles.similarProductsButtonText}>
              {t("similar_products")}
            </ThemedText>
          </Pressable>

          {!hideOffers && settings.country?.toUpperCase() === "DZ" ? (
            <Pressable
              style={({ pressed }) => [
                styles.similarProductsButton,
                { borderColor: "#FF8C00", flexDirection: language === 'ar' ? 'row-reverse' : 'row', marginTop: 10 },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowCartBundle(true);
              }}
              testID="button-cart-bundle"
            >
              <Feather name="shopping-cart" size={18} color="#FF8C00" />
              <ThemedText type="body" style={[styles.similarProductsButtonText, { color: "#FF8C00" }]}>
                {t("cart_bundle_offer")}
              </ThemedText>
            </Pressable>
          ) : null}

          <CartBundleSheet
            visible={showCartBundle}
            onClose={() => setShowCartBundle(false)}
            product={product}
          />

          {bestSeller ? (
            <View style={[styles.bestSellerActions, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.bestSellerActionButton,
                  { backgroundColor: AppColors.primary },
                  (pressed || isRefreshing) && styles.pressed,
                ]}
                onPress={handleBuyBestSeller}
                disabled={isRefreshing}
                testID="button-best-seller-buy"
              >
                <Feather name="shopping-cart" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.bestSellerActionText}>
                  {t("buy")}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.bestSellerActionButton,
                  { backgroundColor: AppColors.secondary },
                  pressed && styles.pressed,
                ]}
                onPress={handleProductOffers}
                testID="button-best-seller-offers"
              >
                <Feather name="tag" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.bestSellerActionText}>
                  {t("product_offers")}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {hideOffers ? null : (
            <View style={styles.offersSection}>
              <View style={[styles.sectionHeader, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Feather name="tag" size={18} color={AppColors.primary} />
                <ThemedText type="h4" style={styles.sectionTitle}>
                  {t("offers")}
                </ThemedText>
              </View>

              {product.offers
                .filter(offer => !offer.key || settings.enabledOffers.includes(offer.key))
                .map((offer, index) => (
                <OfferButton
                  key={index}
                  name={offer.key && (offer.key in translations[language]) ? t(offer.key as any) : offer.name}
                  link={offer.link}
                  success={offer.success}
                  offerKey={offer.key}
                  product={product}
                  onCopied={() => showToast(t("copied_to_clipboard"), "success")}
                />
              ))}

              <Pressable
                style={({ pressed }) => [
                  styles.refreshOfferButton,
                  pressed && styles.pressed,
                  { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }
                ]}
                onPress={refreshOffer}
                testID="button-refresh-offer"
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={styles.refreshOfferText}>
                  {t("refresh_offer")}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <SocialLinks />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  priceRow: {
    alignItems: "flex-start",
  },
  priceRight: {
    // handled by inline styles
  },
  originalPrice: {
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: AppColors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  couponDetails: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  couponInfo: {
    alignItems: "center",
  },
  promoCodesSection: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.xs,
  },
  promoCodesRow: {
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  promoCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  infoGrid: {
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  infoItem: {
    alignItems: "center",
    minWidth: "45%",
  },
  infoText: {
    // handled by inline styles
  },
  shopButton: {
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  copyActions: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
    alignItems: "stretch",
  },
  copyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: 4,
    minWidth: 0,
  },
  copyButtonText: {
    color: "#FFFFFF",
  },
  offersSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginHorizontal: Spacing.sm,
  },
  refreshOfferButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.secondary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  refreshOfferText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  similarProductsButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  similarProductsButtonText: {
    color: AppColors.primary,
    fontWeight: "700",
  },
  bestSellerActions: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  bestSellerActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bestSellerActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
