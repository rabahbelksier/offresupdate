import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  Image,
  Platform,
  Dimensions,
  Alert,
  Modal,
  AppState,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp, StackActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BestSellersView } from "@/components/BestSellersView";
import { SearchView } from "@/components/SearchView";
import { TrendingOffersView } from "@/components/TrendingOffersView";
import { TrendingNowView } from "@/components/TrendingNowView";
import { SocialLinks } from "@/components/SocialLinks";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Toast } from "@/components/Toast";
import { PromoPopup } from "@/components/PromoPopup";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  saveProduct,
  getSettings,
  ProductItem,
  saveItem,
  SavedItem,
} from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const LAST_SHARED_URL_KEY = "offers365_last_shared_url";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SaleItem = { id: number; linkImg: string | null; link: string | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ Home: { resetTab?: number } }, "Home">>();
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<"home" | "search" | "best" | "trending">("home");

  useEffect(() => {
    if (route.params?.resetTab) {
      setActiveTab("home");
    }
  }, [route.params?.resetTab]);

  const [linkInput, setLinkInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t("searching_offers"));
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });
  const [showWidgetModal, setShowWidgetModal] = useState(false);

  const [saleIndex, setSaleIndex] = useState(0);
  const [displayedSaleItems, setDisplayedSaleItems] = useState<SaleItem[]>([]);
  const saleListRef = useRef<FlatList>(null);
  const getOffersRef        = useRef<(urlOverride?: string) => Promise<void>>(null);
  const pendingProductRef   = useRef<ProductItem | null>(null);
  const lastProcessedUrlRef = useRef<string | null>(null);

  const saleViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onSaleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setSaleIndex(viewableItems[0].index);
      }
    }
  );

  const { data: freshSaleData = [], refetch: refetchSale } = useQuery<SaleItem[]>({
    queryKey: ["/api/sale"],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const settings = await getSettings();
      const country = settings.country || "DZ";
      const res = await fetch(new URL(`/api/sale?country=${encodeURIComponent(country)}`, apiUrl).href);
      if (!res.ok) throw new Error("Failed to fetch sale");
      return res.json();
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (freshSaleData.length === 0) return;

    setDisplayedSaleItems((prev) => {
      if (prev.length === 0) return freshSaleData;

      const freshById = new Map(freshSaleData.map((item) => [item.id, item]));
      const prevById = new Map(prev.map((item) => [item.id, item]));

      const structureChanged =
        freshSaleData.length !== prev.length ||
        !freshSaleData.every((item) => prevById.has(item.id));
      if (structureChanged) return freshSaleData;

      let hasChanges = false;
      const merged = prev.map((prevItem) => {
        const freshItem = freshById.get(prevItem.id);
        if (
          freshItem &&
          (prevItem.linkImg !== freshItem.linkImg || prevItem.link !== freshItem.link)
        ) {
          hasChanges = true;
          return freshItem;
        }
        return prevItem;
      });

      return hasChanges ? merged : prev;
    });
  }, [freshSaleData]);

  useFocusEffect(
    useCallback(() => {
      refetchSale();
      // If a widget search completed while ProductDetails was open, navigate now that Home is focused.
      if (pendingProductRef.current) {
        const product = pendingProductRef.current;
        pendingProductRef.current = null;
        navigation.navigate("ProductDetails", { product });
      }
    }, [refetchSale, navigation])
  );

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const getOffers = async (urlOverride?: string) => {
    const targetUrl = typeof urlOverride === 'string' ? urlOverride : linkInput.trim();
    if (!targetUrl) {
      showToast(t("provide_url"), "error");
      return;
    }

    const aliexpressRegex = /(https?:\/\/[^\s]*aliexpress\.[^\s]+|https?:\/\/alix\.live\/[^\s]+|https?:\/\/s\.click\.aliexpress\.com\/[^\s]+)/i;
    if (!aliexpressRegex.test(targetUrl)) {
      showToast(t("invalid_url"), "error");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(t("extracting_info"));

    try {
      const settings = await getSettings();
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          country: settings.country,
          currency: settings.currency,
          language: settings.productLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("error"));
      }

      setLoadingMessage(t("generating_links"));
      const product: ProductItem = await response.json();

      product.originalUrl = targetUrl;

      await saveProduct(product);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setLinkInput("");

      // HomeScreen lives inside DrawerNavigator → navigation.getParent() is the Root Stack.
      // We must check the Root Stack state to know if ProductDetails is already open,
      // because navigation.getState() only returns the Drawer's own state.
      const rootNav   = navigation.getParent();
      const rootState = rootNav?.getState();
      const productDetailsOpen = rootState?.routes?.some(r => r.name === "ProductDetails");

      if (productDetailsOpen) {
        // Store product, pop Root Stack back to "Main" (DrawerNavigator),
        // then useFocusEffect will navigate to ProductDetails once HomeScreen is focused.
        pendingProductRef.current = product;
        rootNav?.dispatch(StackActions.popToTop());
      } else {
        navigation.navigate("ProductDetails", { product });
      }
    } catch (error) {
      console.error("Failed to get offers:", error);
      let errorMsg = t("error");
      if (error instanceof Error) {
        if (error.message === "Network request failed") {
          errorMsg = t("network_request_failed");
        } else if (error.message === "Could not extract product ID from URL") {
          errorMsg = t("could_not_extract_product_id");
        } else {
          errorMsg = error.message;
        }
      }
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // @ts-ignore - ref update
    getOffersRef.current = (urlOverride?: string) => getOffers(urlOverride);
  }, [linkInput, language]);

  // Regex that matches all known AliExpress URL formats
  const aliexpressUrlRegex = /(https?:\/\/[^\s]*aliexpress\.[^\s]+|https?:\/\/alix\.live\/[^\s]+|https?:\/\/s\.click\.aliexpress\.com\/[^\s]+)/i;

  // On mount: restore the last processed URL from AsyncStorage into the in-memory ref
  // so that clipboard checks after a restart skip already-processed URLs.
  useEffect(() => {
    AsyncStorage.getItem(LAST_SHARED_URL_KEY)
      .then((stored) => { if (stored) lastProcessedUrlRef.current = stored; })
      .catch(() => {});
  }, []);

  // On app open or foreground return: paste a fresh AliExpress URL from the clipboard
  // into the input field (share-intent flow). The user still presses the button manually.
  const checkClipboardAndPaste = useCallback(async () => {
    try {
      const clipText = await Clipboard.getStringAsync();
      if (!clipText) return;
      const match = clipText.match(aliexpressUrlRegex);
      if (!match?.[0]) return;
      const foundUrl = match[0];
      // Skip if this URL was already pasted/processed (avoids re-pasting on every app open)
      if (foundUrl === lastProcessedUrlRef.current) return;
      lastProcessedUrlRef.current = foundUrl;
      // Persist so the next cold-start also skips this same URL
      AsyncStorage.setItem(LAST_SHARED_URL_KEY, foundUrl).catch(() => {});
      setLinkInput(foundUrl);
    } catch { /* clipboard read failed — ignore */ }
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;

      // Handle widget / custom-scheme deep links: offers365://widget?url=<encoded-url>
      try {
        const parsed = new URL(url);
        if (
          parsed.protocol === "offers365:" &&
          (parsed.hostname === "widget" || parsed.hostname === "search") &&
          parsed.searchParams.has("url")
        ) {
          const extractedUrl = parsed.searchParams.get("url");
          if (extractedUrl) {
            lastProcessedUrlRef.current = extractedUrl;
            setLinkInput(extractedUrl);
            if (getOffersRef.current) getOffersRef.current(extractedUrl);
            return;
          }
        }
      } catch { /* not a parseable URL, fall through */ }

      // Fallback: scan raw string for an AliExpress URL (handles direct deep links)
      const match = url.match(aliexpressUrlRegex);
      if (match?.[0]) {
        const foundUrl = match[0].replace(/[ \n\t\r].*$/, "");
        lastProcessedUrlRef.current = foundUrl;
        setLinkInput(foundUrl);
        if (getOffersRef.current) getOffersRef.current(foundUrl);
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  // Cold start via share intent: clipboard is set by Android before our JS runs,
  // so a short delay ensures the component is fully mounted before pasting.
  useEffect(() => {
    const timer = setTimeout(checkClipboardAndPaste, 400);
    return () => clearTimeout(timer);
  }, []);

  // Warm start (app brought to foreground): paste shared URL into the input field.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") checkClipboardAndPaste();
    });
    return () => subscription.remove();
  }, [checkClipboardAndPaste]);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setLinkInput(text);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      showToast(t("info"), "info");
    } else {
      showToast(t("error"), "error");
    }
  };

  const handleSaveToList = async () => {
    if (!linkInput.trim()) {
      showToast(t("provide_url"), "error");
      return;
    }

    const aliexpressRegex = /(https?:\/\/[^\s]*aliexpress\.[^\s]+|https?:\/\/alix\.live\/[^\s]+|https?:\/\/s\.click\.aliexpress\.com\/[^\s]+)/i;
    if (!aliexpressRegex.test(linkInput.trim())) {
      showToast(t("invalid_url"), "error");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(t("loading"));

    try {
      const settings = await getSettings();
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: linkInput.trim(),
          country: settings.country,
          currency: settings.currency,
          language: settings.productLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("error"));
      }

      const product: ProductItem = await response.json();
      product.originalUrl = linkInput.trim();

      await saveProduct(product);

      const savedId = `product_${product.productId}`;
      const savedItem: SavedItem = {
        savedId,
        type: "product",
        title: product.title,
        imageUrl: product.imageUrl,
        savedAt: new Date().toISOString(),
        productData: product,
      };
      await saveItem(savedItem);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setLinkInput("");
      showToast(t("saved_to_bookmarks"), "success");
    } catch (error) {
      console.error("Failed to save product:", error);
      let errorMsg = t("error");
      if (error instanceof Error) {
        if (error.message === "Network request failed") {
          errorMsg = t("network_request_failed");
        } else if (error.message === "Could not extract product ID from URL") {
          errorMsg = t("could_not_extract_product_id");
        } else {
          errorMsg = error.message;
        }
      }
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinWidget = useCallback(async () => {
    setShowWidgetModal(false);
    if (Platform.OS !== "android") {
      showToast(t("widget_pin_not_supported"), "info");
      return;
    }
    try {
      await Linking.openURL("offers365pin://");
    } catch {
      showToast(t("widget_pin_not_supported"), "info");
    }
  }, [t]);

  const tabs: { key: "search" | "home" | "best" | "trending"; label: string; icon?: string }[] = [
    { key: "search", label: t("tab_search"), icon: "search" },
    { key: "home", label: t("tab_home") },
    { key: "best", label: t("tab_best_sellers") },
    { key: "trending", label: t("tab_trending") },
  ];

  const orderedTabs = language === "ar" ? [...tabs].reverse() : tabs;

  return (
    <ThemedView style={styles.container}>
      <PromoPopup />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <LoadingOverlay visible={isLoading} message={loadingMessage} />

      {/* Widget Modal */}
      <Modal
        visible={showWidgetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWidgetModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowWidgetModal(false)}>
          <Pressable style={[styles.widgetModalCard, { backgroundColor: theme.backgroundDefault, borderColor: isDark ? "rgba(255,106,0,0.3)" : theme.border }]}>
            <View style={styles.widgetModalHeader}>
              <View style={[styles.widgetModalIcon, { backgroundColor: "rgba(255,106,0,0.12)" }]}>
                <MaterialIcons name="widgets" size={28} color={AppColors.primary} />
              </View>
              <ThemedText type="h4" style={[styles.widgetModalTitle, { textAlign: "center" }]}>
                {t("widget_title")}
              </ThemedText>
            </View>
            <ThemedText type="body" style={[styles.widgetModalBody, { color: theme.textSecondary, textAlign: language === "ar" ? "right" : "left" }]}>
              {t("widget_body")}
            </ThemedText>
            <View style={[styles.widgetModalBtnRow, { flexDirection: language === "ar" ? "row-reverse" : "row" }]}>
              <Pressable
                style={[styles.widgetModalBtnSecondary, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}
                onPress={() => setShowWidgetModal(false)}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {t("widget_later_btn")}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.widgetModalBtnPrimary, { backgroundColor: AppColors.primary }]}
                onPress={handlePinWidget}
              >
                <MaterialIcons name="add-to-home-screen" size={16} color="#fff" style={{ marginEnd: 6 }} />
                <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                  {t("widget_add_btn")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tab Bar */}
      <View style={[styles.tabsBarWrapper, { backgroundColor: theme.backgroundDefault, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tabsBarContent,
            { flexDirection: language === "ar" ? "row-reverse" : "row" },
          ]}
        >
          {orderedTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [
                  styles.tabItem,
                  isActive && [styles.tabItemActive, { backgroundColor: isDark ? "rgba(255,106,0,0.15)" : "rgba(255,106,0,0.08)", borderColor: AppColors.primary }],
                  !isActive && { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setActiveTab(tab.key)}
                testID={`tab-${tab.key}`}
              >
                {tab.icon ? (
                  <View style={[styles.tabRow, { flexDirection: language === "ar" ? "row-reverse" : "row" }]}>
                    <Feather
                      name={tab.icon as any}
                      size={13}
                      color={isActive ? AppColors.primary : theme.textSecondary}
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={[styles.tabLabel, { color: isActive ? AppColors.primary : theme.textSecondary, fontWeight: isActive ? "700" : "500" }]}
                    >
                      {tab.label}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={[styles.tabLabel, { color: isActive ? AppColors.primary : theme.textSecondary, fontWeight: isActive ? "700" : "500" }]}
                  >
                    {tab.label}
                  </ThemedText>
                )}
                {isActive && <View style={styles.tabIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === "search" ? (
        <View style={{ flex: 1 }}>
          <SearchView />
        </View>
      ) : activeTab === "best" ? (
        <View style={{ flex: 1 }}>
          <BestSellersView />
        </View>
      ) : activeTab === "trending" ? (
        <View style={{ flex: 1 }}>
          <TrendingOffersView />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={isDark
                ? ["rgba(255,106,0,0.15)", "rgba(255,106,0,0.03)", "transparent"]
                : ["rgba(255,106,0,0.08)", "rgba(255,215,0,0.04)", "transparent"]}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={[
              styles.inputCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: isDark ? "rgba(255,106,0,0.2)" : theme.border,
              },
            ]}>
              <View style={[styles.inputHeader, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.inputIconBadge,
                    { backgroundColor: isDark ? "rgba(255,106,0,0.15)" : "rgba(255,106,0,0.08)" },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setShowWidgetModal(true)}
                  testID="button-widget-info"
                >
                  <MaterialIcons name="widgets" size={18} color={AppColors.primary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.pasteChip,
                    { backgroundColor: isDark ? "rgba(255,106,0,0.12)" : "rgba(255,106,0,0.06)" },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handlePaste}
                  testID="button-paste-link"
                >
                  <Feather name="clipboard" size={14} color={AppColors.primary} />
                  <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: '700' }}>
                    {t("paste")}
                  </ThemedText>
                </Pressable>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    textAlign: language === 'ar' ? 'right' : 'left',
                  },
                ]}
                placeholder={t("paste_link")}
                placeholderTextColor={theme.textSecondary}
                value={linkInput}
                onChangeText={setLinkInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-link"
              />

              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => getOffers()}
                  testID="button-get-offers"
                >
                  <LinearGradient
                    colors={[AppColors.primary, "#E85D00"]}
                    style={styles.searchButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Feather name="search" size={18} color="#FFFFFF" />
                    <ThemedText type="body" style={styles.searchButtonText}>
                      {t("get_offers")}
                    </ThemedText>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    { borderColor: AppColors.primary },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSaveToList}
                  testID="button-save-to-list"
                >
                  <Feather name="save" size={18} color={AppColors.primary} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Sale Carousel */}
          {displayedSaleItems.length > 0 ? (
            <View style={styles.saleCarouselContainer}>
              <FlatList
                ref={saleListRef}
                data={displayedSaleItems}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                viewabilityConfig={saleViewabilityConfig.current}
                onViewableItemsChanged={onSaleViewableItemsChanged.current}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.saleSlide}
                    onPress={() => {
                      if (item.link) Linking.openURL(item.link);
                    }}
                  >
                    {item.linkImg ? (
                      <Image
                        source={{ uri: item.linkImg }}
                        style={styles.saleImage}
                        resizeMode="contain"
                      />
                    ) : null}
                  </Pressable>
                )}
              />
              <View style={styles.saleDots}>
                {displayedSaleItems.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.saleDot,
                      i === saleIndex
                        ? { backgroundColor: AppColors.primary, borderColor: AppColors.primary }
                        : { backgroundColor: "transparent", borderColor: AppColors.primary },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Trending Now Section */}
          <TrendingNowView />
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
        <SocialLinks />
      </View>
    </ThemedView>
  );
}

const SALE_SLIDE_WIDTH = Dimensions.get("window").width - Spacing.xl * 2;
const SALE_SLIDE_HEIGHT = Math.round(SALE_SLIDE_WIDTH * 315 / 600);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Tab Bar ── */
  tabsBarWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabsBarContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 68,
  },
  tabItemActive: {
    borderWidth: 1.5,
  },
  tabRow: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
  },
  tabIndicator: {
    height: 2,
    width: "50%",
    backgroundColor: AppColors.primary,
    marginTop: 3,
    borderRadius: 2,
  },

  /* ── Lists / Content ── */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },

  /* ── Hero ── */
  heroSection: {
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  heroGradient: {
    position: "absolute",
    top: -Spacing.lg,
    left: -Spacing.lg,
    right: -Spacing.lg,
    height: 280,
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },

  /* ── Input Card ── */
  inputCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  inputIconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pasteChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  searchButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  searchButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  saveButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Sale Carousel ── */
  saleCarouselContainer: {
    marginBottom: Spacing.xl,
  },
  saleSlide: {
    width: SALE_SLIDE_WIDTH,
    height: SALE_SLIDE_HEIGHT,
    marginHorizontal: 0,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  saleImage: {
    width: "100%",
    height: "100%",
  },
  saleDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.sm,
    gap: 5,
  },
  saleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
  },

  /* ── Footer ── */
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  /* ── Widget Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  widgetModalCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  widgetModalHeader: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  widgetModalIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetModalTitle: {
    fontWeight: "700",
  },
  widgetModalBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  widgetModalBtnRow: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  widgetModalBtnSecondary: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  widgetModalBtnPrimary: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
