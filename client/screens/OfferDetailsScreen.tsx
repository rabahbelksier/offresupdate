import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
  Linking,
  Dimensions,
  Modal,
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
import { SocialLinks } from "@/components/SocialLinks";
import { Toast } from "@/components/Toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { formatProductMessage, getShareTemplate, getSettings, ProductItem, getTrendingOffers, saveTrendingOffers, getTrendingOfferDetails, saveTrendingOfferDetails, saveItem, isItemSaved, SavedItem } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type OfferDetailsRouteProp = RouteProp<RootStackParamList, "OfferDetails">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OfferDetailsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<OfferDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { offer, country: paramCountry } = route.params;

  const [productDetails, setProductDetails] = useState<ProductItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [currentCountry, setCurrentCountry] = useState(paramCountry || "DZ");
  const [isSaved, setIsSaved] = useState(false);

  const savedId = `offer_${offer.id}`;

  const handleSaveItem = async () => {
    if (!productDetails) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const item: SavedItem = {
      savedId,
      type: "offer",
      title: productDetails.title || offer.title,
      imageUrl: productDetails.imageUrl || offer.imageUrl || null,
      savedAt: new Date().toISOString(),
      productData: productDetails,
      offerMeta: {
        id: offer.id,
        productUrl: offer.productUrl,
        price: offer.price,
        sellerCoupon: offer.sellerCoupon,
        country: currentCountry,
      },
    };
    const result = await saveItem(item);
    if (result === "saved") {
      setIsSaved(true);
      showToast(t("item_saved"));
    } else {
      showToast(t("item_already_saved"), "error");
    }
  };

  useEffect(() => {
    isItemSaved(savedId).then(setIsSaved);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: t("offer_details"),
      headerRight: () => (
        <Pressable onPress={handleSaveItem} hitSlop={10} style={{ padding: 8 }}>
          <Feather name={isSaved ? "bookmark" : "bookmark"} size={22} color={isSaved ? AppColors.primary : theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, t, isSaved, productDetails, theme]);

  useEffect(() => {
    initAndFetch();
  }, []);

  const initAndFetch = async () => {
    const settings = await getSettings();
    const cc = paramCountry || settings.country || "DZ";
    setCurrentCountry(cc);
    // If no productUrl, try to load the offer from server by ID first
    if (!offer.productUrl && offer.id) {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(new URL(`/api/offres/single/${offer.id}?country=${cc}`, apiUrl).href);
        if (res.ok) {
          const fullOffer = await res.json();
          Object.assign(offer, fullOffer);
        }
      } catch {}
    }
    fetchFullDetails(false, cc);
  };

  const downloadImage = async () => {
    const imageUrl = productDetails?.imageUrl || offer.imageUrl;
    if (!imageUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      let url = imageUrl;
      if (url.startsWith("//")) url = `https:${url}`;
      url = url.replace(/\d+x\d+/, "1536x1536");

      if (Platform.OS === "web") {
        await Linking.openURL(url);
        return;
      }

      let hasPermission = false;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        hasPermission = status === "granted";
      } catch {
        showToast(t("error"), "error");
        return;
      }

      if (!hasPermission) {
        showToast(t("error"), "error");
        return;
      }

      const fileUri = FileSystem.documentDirectory + `offer_${offer.id}_${Date.now()}.jpg`;
      const isAliExpress = url.includes("alicdn.com") || url.includes("aliexpress.com");
      const downloadUrl = isAliExpress ? url : `${getApiUrl()}/api/proxy/image?url=${encodeURIComponent(url)}`;
      const { uri, status } = await FileSystem.downloadAsync(downloadUrl, fileUri);
      if (status !== 200) { showToast(t("error"), "error"); return; }

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || (info.size !== undefined && info.size < 1024)) {
        showToast(t("error"), "error");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t("success"), "success");
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDownloading(false);
    }
  };

  // Build a minimal ProductItem from the offer card data as a silent fallback
  // when the AliExpress API is unreachable or the product is no longer available.
  const buildFallbackDetails = (): ProductItem => ({
    id: String(offer.id),
    productId: String(offer.id),
    title: offer.title || "",
    imageUrl: offer.imageUrl || null,
    price: offer.currentPrice || offer.price || "N/A",
    originalPrice: offer.price || "N/A",
    discount: "",
    storeName: "",
    evaluateRate: "",
    shopUrl: "",
    categoryName: "",
    commissionRate: "",
    orders: "",
    shipping_fees: "",
    searchedAt: new Date().toISOString(),
    offers: [],
    coupons_summary: "",
    cod_1: (offer as any).cod_1 || "",
    cod_2: (offer as any).cod_2 || "",
    cod_3: (offer as any).cod_3 || "",
    couponValue: (offer as any).promoValue || "",
    promoCouponValue: (offer as any).promoValue || "",
    sellerCoupon: offer.sellerCoupon || "",
    dbPrice: offer.price_trending || offer.price || "",
    info: offer.info || "",
  });

  const fetchFullDetails = async (forceRefresh = false, cc?: string) => {
    setIsLoading(true);
    const effectiveCountry = cc || currentCountry;
    const cacheKey = `${offer.id}_${effectiveCountry}`;

    const cached = await getTrendingOfferDetails(cacheKey);
    if (cached) {
      setProductDetails(cached);
      if (!forceRefresh) {
        setIsLoading(false);
        return;
      }
    }

    // No productUrl means we cannot call the API — show offer card data directly
    if (!offer.productUrl) {
      if (!cached) setProductDetails(buildFallbackDetails());
      setIsLoading(false);
      return;
    }

    try {
      const settings = await getSettings();
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: offer.productUrl,
          country: effectiveCountry,
          currency: settings.currency,
          language: settings.productLanguage,
          currentPrice: offer.currentPrice || undefined,
        }),
      });

      if (!response.ok) throw new Error(t("error"));
      const data: ProductItem = await response.json();
      
      const enhancedData = {
        ...data,
        title: offer.title || data.title,
        imageUrl: offer.imageUrl || data.imageUrl,
        price: offer.currentPrice || data.price || offer.price,
        dbPrice: offer.price_trending || offer.price || "",
        info: offer.info || "",
        sellerCoupon: offer.sellerCoupon || "",
        couponValue: (offer as any).promoValue || data.couponValue || "",
        promoCouponValue: (offer as any).promoValue || data.couponValue || "",
        cod_1: (offer as any).cod_1 || data.cod_1 || "",
        cod_2: (offer as any).cod_2 || data.cod_2 || "",
        cod_3: (offer as any).cod_3 || data.cod_3 || "",
      };
      
      setProductDetails(enhancedData);
      await saveTrendingOfferDetails(cacheKey, enhancedData);
      
      const trendingOffers = await getTrendingOffers(effectiveCountry);
      const offerIndex = trendingOffers.findIndex((o: any) => o.id === offer.id);
      if (offerIndex !== -1) {
        trendingOffers[offerIndex] = {
          ...trendingOffers[offerIndex],
          ...enhancedData,
          cod_1: enhancedData.cod_1,
          cod_2: enhancedData.cod_2,
          cod_3: enhancedData.cod_3,
        };
        await saveTrendingOffers(trendingOffers, effectiveCountry);
      }
    } catch (error) {
      console.error("Failed to fetch product details:", error);
      if (cached) {
        // Keep showing cached data — no toast needed
      } else {
        // Silently degrade to offer card data so the screen is never blank
        setProductDetails(buildFallbackDetails());
        // Only show error toast when user explicitly triggered a refresh
        if (forceRefresh) showToast(t("error"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
  };

  const formatOfferMessage = (product: ProductItem, template: string) => {
    let formatted = formatProductMessage(product, template);
    formatted = formatted.replace(/{trending}/g, offer.productUrl);
    return formatted;
  };

  const copyTrendingLink = async () => {
    if (!productDetails) return;
    try {
      const template = await getShareTemplate("trending", language);
      const text = formatOfferMessage(productDetails, template);
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("copied_to_clipboard"), "success");
    } catch (error) {
      showToast(t("error"), "error");
    }
  };

  const shareTrendingOffer = async () => {
    if (!productDetails) return;
    try {
      const template = await getShareTemplate("trending", language);
      const text = formatOfferMessage(productDetails, template);
      await Share.share({ message: text });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  if (isLoading) return <LoadingOverlay visible message={t("loading")} />;

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.imageContainer}>
          <Pressable onPress={() => setIsImageModalVisible(true)} style={StyleSheet.absoluteFillObject}>
            <Image
              source={{ uri: productDetails?.imageUrl || offer.imageUrl || "https://via.placeholder.com/300" }}
              style={styles.productImage}
              contentFit="cover"
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.downloadButton,
              { backgroundColor: theme.backgroundDefault },
              (pressed || isDownloading) && { opacity: 0.7 },
            ]}
            onPress={downloadImage}
            disabled={isDownloading}
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
            {productDetails?.title}
          </ThemedText>

          <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <View style={[styles.infoRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <ThemedText type="body" style={{ fontWeight: '700' }}>{t("current_price")}: </ThemedText>
              <ThemedText type="h3" style={{ color: AppColors.primary }}>{productDetails?.price}</ThemedText>
            </View>

            {productDetails?.dbPrice ? (
              <View style={[styles.infoRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', marginTop: Spacing.sm }]}>
                <ThemedText type="body" style={{ fontWeight: '700' }}>{t("final_price")}: </ThemedText>
                <ThemedText type="h3" style={{ color: AppColors.success }}>{productDetails.dbPrice}</ThemedText>
              </View>
            ) : null}

            {productDetails?.sellerCoupon ? (
              <View style={[styles.infoRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', marginTop: Spacing.sm }]}>
                <ThemedText type="body" style={{ fontWeight: '700' }}>{t("seller_coupon")}: </ThemedText>
                <ThemedText type="body" style={{ color: theme.text }}>{productDetails.sellerCoupon}</ThemedText>
              </View>
            ) : null}

            {offer.date ? (
              <View style={[styles.infoRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', marginTop: Spacing.sm }]}>
                <Feather name="calendar" size={14} color={theme.textSecondary} style={{ [language === 'ar' ? 'marginLeft' : 'marginRight']: Spacing.xs }} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("offered_at")}: {offer.date}
                </ThemedText>
              </View>
            ) : null}

            {productDetails?.info ? (
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: language === 'ar' ? 'right' : 'left' }}>
                {productDetails.info}
              </ThemedText>
            ) : null}

            {(productDetails?.cod_1 || productDetails?.cod_2 || productDetails?.cod_3) ? (
              <View style={[styles.promoSection, { marginTop: Spacing.md }]}>
                <View style={[styles.promoHeaderRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <ThemedText type="small" style={{ fontWeight: '600', textAlign: language === 'ar' ? 'right' : 'left' }}>{t("best_promo_codes")}:</ThemedText>
                  {productDetails?.promoCouponValue ? (
                    <ThemedText type="small" style={{ fontWeight: '700', color: AppColors.success, [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.sm }}>
                      {productDetails.promoCouponValue}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={[styles.promoRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  {[productDetails?.cod_1, productDetails?.cod_2, productDetails?.cod_3].filter(Boolean).map((code, idx) => (
                    <Pressable key={idx} onPress={async () => { 
                      await Clipboard.setStringAsync(code!); 
                      showToast(`${code} ${t("copied_to_clipboard")}`, "success"); 
                    }} style={[styles.promoBadge, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText type="small" style={{ fontWeight: '700' }}>{code}</ThemedText>
                      <Feather name="copy" size={12} color={theme.textSecondary} style={{ [language === 'ar' ? 'marginRight' : 'marginLeft']: 4 }} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.infoGrid, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Feather name="tag" size={16} color={AppColors.secondary} />
                <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                  {t("discount")}: {productDetails?.discount}
                </ThemedText>
              </View>
              <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Feather name="shopping-bag" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                  {productDetails?.storeName}
                </ThemedText>
              </View>
              {productDetails?.evaluateRate && productDetails?.evaluateRate !== "N/A" ? (
                <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <FontAwesome name="star" size={16} color="#FFD700" />
                  <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                    {productDetails?.evaluateRate} {t("store_rating")}
                  </ThemedText>
                </View>
              ) : null}
              {productDetails?.orders && productDetails?.orders !== "N/A" ? (
                <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <Feather name="trending-up" size={16} color={AppColors.primary} />
                  <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                    {productDetails?.orders} {t("orders")}
                  </ThemedText>
                </View>
              ) : null}
              {productDetails?.categoryName ? (
                <View style={[styles.infoItem, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <Feather name="list" size={16} color={theme.textSecondary} />
                  <ThemedText type="small" style={[styles.infoText, { [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }]}>
                    {productDetails?.categoryName}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {productDetails?.shopUrl && productDetails?.shopUrl !== "N/A" ? (
              <Pressable 
                onPress={() => Linking.openURL((productDetails as any).affiliateStoreUrl || productDetails.shopUrl!)}
                style={[styles.shopButton, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              >
                <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: '600' }}>
                  {t("visit_store")}
                </ThemedText>
                <Feather name="external-link" size={14} color={AppColors.primary} style={{ [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.xs }} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.trendingOfferSection}>
            <View style={[styles.trendingRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <View style={[styles.trendingActions, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Pressable 
                  onPress={copyTrendingLink} 
                  style={({ pressed }) => [styles.trendingActionBtn, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }, pressed && styles.pressed]}
                >
                  <Feather name="copy" size={18} color={AppColors.primary} />
                </Pressable>
                <Pressable 
                  onPress={shareTrendingOffer} 
                  style={({ pressed }) => [styles.trendingActionBtn, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }, pressed && styles.pressed]}
                >
                  <Feather name="share-2" size={18} color={AppColors.primary} />
                </Pressable>
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.trendingOfferButton, 
                  { backgroundColor: AppColors.primary }, 
                  pressed && styles.pressed
                ]} 
                onPress={() => Linking.openURL(offer.productUrl)}
              >
                <View style={[styles.buttonMain, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                  <Feather name="trending-up" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.buttonText}>{t("offer_request_buy_now")}</ThemedText>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        <SocialLinks />
      </ScrollView>

      <Modal visible={isImageModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setIsImageModalVisible(false)}>
          <Image source={{ uri: productDetails?.imageUrl || offer.imageUrl || "" }} style={styles.fullImage} contentFit="contain" />
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  imageContainer: { width: "100%", aspectRatio: 1, borderRadius: BorderRadius.lg, overflow: "hidden", marginBottom: Spacing.lg },
  productImage: { width: "100%", height: "100%" },
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
  content: { flex: 1 },
  title: { marginBottom: Spacing.lg },
  detailsCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  infoRow: { alignItems: "center", gap: Spacing.xs },
  promoSection: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: Spacing.sm },
  promoHeaderRow: { alignItems: "center", marginBottom: Spacing.xs },
  promoRow: { flexWrap: "wrap", gap: Spacing.xs },
  promoBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
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
  infoText: {},
  shopButton: {
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  trendingOfferSection: { marginTop: Spacing.xl },
  trendingRow: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  trendingActions: {
    gap: Spacing.sm,
  },
  trendingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trendingOfferButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  buttonMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pressed: { opacity: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: Dimensions.get("window").width * 0.9, height: Dimensions.get("window").height * 0.7 },
});
