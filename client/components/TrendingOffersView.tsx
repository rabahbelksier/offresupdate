import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import {
  getAllOffres, saveAllOffres, getOffresVersion, saveOffresVersion,
  getTrendingOfferDetails, saveTrendingOfferDetails, deleteTrendingOfferDetails,
  getSettings, clearAllTrendingOffersCache,
} from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AdminToolbar } from "@/components/AdminToolbar";
import { useAuth } from "@/contexts/AuthContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 10;

interface Offre {
  id: number;
  title: string;
  price: string;
  price_trending?: string;
  sellerCoupon?: string;
  productUrl: string;
  imageUrl?: string;
  info?: string;
  cod_1?: string;
  cod_2?: string;
  cod_3?: string;
  promoValue?: string;
  date?: string | null;
  currentPrice?: string | null;
}

export function TrendingOffersView() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();

  const [allOffers, setAllOffers] = useState<Offre[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Offre[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [country, setCountry] = useState("DZ");
  const [editMode, setEditMode] = useState(false);

  const countryRef = useRef("DZ");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const totalPages = Math.ceil(allOffers.length / PAGE_SIZE);
  const displayedOffers = searchResults !== null
    ? searchResults
    : allOffers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const showToastFn = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const loadAllImages = useCallback(async (offersList: Offre[], cc: string) => {
    const needsImages = offersList.some(o => !o.imageUrl);
    if (!needsImages) return;
    const apiUrl = getApiUrl();
    try {
      const response = await fetch(new URL(`/api/offres/images?country=${cc}`, apiUrl).href);
      if (response.ok) {
        const imageMap: Record<number, string | null> = await response.json();
        setAllOffers(prev => {
          const updated = prev.map(o =>
            !o.imageUrl && imageMap[o.id] ? { ...o, imageUrl: imageMap[o.id]! } : o
          );
          saveAllOffres(updated, cc);
          return updated;
        });
      }
    } catch {}
  }, []);

  const prefetchPageDetails = useCallback(async (pageOffers: Offre[], cc: string) => {
    const settings = await getSettings();
    const apiUrl = getApiUrl();
    for (const offer of pageOffers) {
      if (!offer.productUrl) continue;
      const cacheKey = `${offer.id}_${cc}`;
      const cached = await getTrendingOfferDetails(cacheKey);
      if (cached) continue;
      fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: offer.productUrl,
          country: cc,
          currency: settings.currency,
          language: settings.productLanguage,
          currentPrice: offer.currentPrice || undefined,
          skipTrending: true,
        }),
      }).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const enhanced = {
          ...data,
          title: offer.title || data.title,
          imageUrl: offer.imageUrl || data.imageUrl,
          price: offer.currentPrice || data.price || offer.price,
          dbPrice: offer.price_trending || offer.price || "",
          info: offer.info || "",
          sellerCoupon: offer.sellerCoupon || "",
          couponValue: offer.promoValue || data.couponValue || "",
          promoCouponValue: offer.promoValue || data.couponValue || "",
          cod_1: offer.cod_1 || data.cod_1 || "",
          cod_2: offer.cod_2 || data.cod_2 || "",
          cod_3: offer.cod_3 || data.cod_3 || "",
        };
        await saveTrendingOfferDetails(cacheKey, enhanced);
      }).catch(() => {});
    }
  }, []);

  const checkAndSync = useCallback(async (cc: string, currentOffers: Offre[]) => {
    try {
      const apiUrl = getApiUrl();
      const vRes = await fetch(new URL(`/api/offres/version?country=${cc}`, apiUrl).href);
      if (!vRes.ok) return;
      const { version } = await vRes.json();
      const localVersion = await getOffresVersion(cc);
      if (version <= localVersion && currentOffers.length > 0) return;

      const allIds = currentOffers.map(o => o.id);
      const syncRes = await fetch(new URL("/api/offres/sync", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: cc, ids: allIds, localVersion }),
      });
      if (!syncRes.ok) return;
      const { added, updated } = await syncRes.json();

      let hasChanges = false;
      setAllOffers(prev => {
        let merged = [...prev];
        if (updated && updated.length > 0) {
          const updatedMap = new Map<number, Offre>(updated.map((o: Offre) => [o.id, o]));
          merged = merged.map(o => updatedMap.has(o.id) ? updatedMap.get(o.id)! : o);
          hasChanges = true;
        }
        if (added && added.length > 0) {
          const existingIds = new Set(merged.map(o => o.id));
          const newOnes = added.filter((o: Offre) => !existingIds.has(o.id));
          if (newOnes.length > 0) {
            merged = [...newOnes, ...merged];
            hasChanges = true;
          }
        }
        if (hasChanges) {
          saveAllOffres(merged, cc);
          loadAllImages(merged, cc);
        }
        return merged;
      });

      await saveOffresVersion(version, cc);

      // For updated offers: clear their stale details cache then re-prefetch fresh data
      if (updated && updated.length > 0) {
        await Promise.all(
          (updated as Offre[]).map(o => deleteTrendingOfferDetails(`${o.id}_${cc}`))
        );
        prefetchPageDetails(updated as Offre[], cc);
      }

      if (added && added.length > 0) {
        setCurrentPage(1);
        prefetchPageDetails((added as Offre[]).slice(0, PAGE_SIZE), cc);
      }
    } catch {}
  }, [loadAllImages, prefetchPageDetails]);

  const fetchAllFromServer = useCallback(async (cc: string) => {
    setIsLoading(true);
    try {
      const apiUrl = getApiUrl();
      let allFetched: Offre[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(new URL(`/api/offres?country=${cc}&page=${page}`, apiUrl).href);
        if (!res.ok) break;
        const data = await res.json();
        const offers: Offre[] = data.offers || (Array.isArray(data) ? data : []);
        allFetched = [...allFetched, ...offers];
        if (!data.totalPages || page >= data.totalPages) break;
        page++;
      }
      setAllOffers(allFetched);
      setCurrentPage(1);
      await saveAllOffres(allFetched, cc);
      try {
        const vRes = await fetch(new URL(`/api/offres/version?country=${cc}`, apiUrl).href);
        if (vRes.ok) {
          const { version } = await vRes.json();
          await saveOffresVersion(version, cc);
        }
      } catch {}
      loadAllImages(allFetched, cc);
      prefetchPageDetails(allFetched.slice(0, PAGE_SIZE), cc);
    } catch {
      showToastFn(t("error"), "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t, loadAllImages, prefetchPageDetails]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const init = async () => {
        const settings = await getSettings();
        if (!isMounted) return;
        const cc = settings.country || "DZ";
        const countryChanged = cc !== countryRef.current;
        countryRef.current = cc;
        setCountry(cc);

        if (countryChanged) {
          await clearAllTrendingOffersCache();
          setAllOffers([]);
          setCurrentPage(1);
          setSearchQuery("");
          setSearchResults(null);
          await fetchAllFromServer(cc);
          return;
        }

        const cached = await getAllOffres(cc);
        if (cached && cached.length > 0) {
          setAllOffers(cached as Offre[]);
          checkAndSync(cc, cached as Offre[]);
          prefetchPageDetails((cached as Offre[]).slice(0, PAGE_SIZE), cc);
        } else {
          await fetchAllFromServer(cc);
        }
      };
      init();
      return () => { isMounted = false; };
    }, [fetchAllFromServer, checkAndSync, prefetchPageDetails])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await clearAllTrendingOffersCache();
    setAllOffers([]);
    setCurrentPage(1);
    setSearchQuery("");
    setSearchResults(null);
    await fetchAllFromServer(countryRef.current);
  };

  const handleOfferPress = (offer: Offre) => {
    if (editMode) return;
    navigation.navigate("OfferDetails", { offer, country: countryRef.current });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    const pageOffers = allOffers.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
    prefetchPageDetails(pageOffers, countryRef.current);
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(
          new URL(`/api/offres/search?country=${countryRef.current}&q=${encodeURIComponent(query.trim())}`, apiUrl).href
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.offers || []);
        }
      } catch {}
      setIsSearching(false);
    }, 350);
  }, []);

  const handleDeleteOffre = async (id: number) => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/offres/${id}`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAllOffers(prev => prev.filter(o => o.id !== id));
      if (searchResults !== null) setSearchResults(prev => prev!.filter(o => o.id !== id));
      await saveAllOffres(allOffers.filter(o => o.id !== id), countryRef.current);
      showToastFn(t("entry_deleted"));
    } catch {
      showToastFn(t("error"), "error");
    }
  };

  const handleCleanOffres = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/offres/all", apiUrl).href, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryRef.current }),
      });
      if (!res.ok) throw new Error();
      setAllOffers([]);
      setSearchResults(null);
      await clearAllTrendingOffersCache();
      showToastFn(t("table_cleaned"));
    } catch {
      showToastFn(t("error"), "error");
    }
  };

  const renderOffer = ({ item }: { item: Offre }) => (
    <Pressable
      style={({ pressed }) => [
        styles.offerCard,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        pressed && !editMode && styles.pressed,
      ]}
      onPress={() => handleOfferPress(item)}
    >
      {editMode && isAdmin ? (
        <View style={styles.adminActions}>
          <Pressable
            style={[styles.adminBtn, { backgroundColor: AppColors.primary }]}
            onPress={() => navigation.navigate("AdminEditOffre", {
              id: item.id,
              title: item.title,
              price: item.price,
              sellerCoupon: item.sellerCoupon || "",
              productUrl: item.productUrl,
              info: item.info || "",
              country: country,
              currentPrice: item.currentPrice || "",
              imageUrl: item.imageUrl || "",
            })}
          >
            <Feather name="edit-2" size={14} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.adminBtn, { backgroundColor: "#ef4444" }]}
            onPress={() => handleDeleteOffre(item.id)}
          >
            <Feather name="trash-2" size={14} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.offerRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => item.imageUrl ? setSelectedImage(item.imageUrl) : null}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} contentFit="cover" />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          )}
        </Pressable>

        <View style={styles.offerContent}>
          <ThemedText
            type="body"
            numberOfLines={2}
            style={[styles.offerTitle, { textAlign: language === 'ar' ? 'right' : 'left' }]}
          >
            {item.title}
          </ThemedText>

          <View style={[styles.priceRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center' }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, [language === 'ar' ? 'marginLeft' : 'marginRight']: Spacing.xs }}>
              {t("final_price")}:
            </ThemedText>
            <ThemedText type="h4" style={{ color: AppColors.primary }}>
              {item.price_trending || item.price}
            </ThemedText>
          </View>

          {item.sellerCoupon ? (
            <ThemedText
              type="small"
              style={{ textAlign: language === 'ar' ? 'right' : 'left' }}
            >
              <ThemedText type="small" style={{ color: theme.text }}>{t("seller_coupon")}: </ThemedText>
              <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: '600' }}>{item.sellerCoupon}</ThemedText>
            </ThemedText>
          ) : null}

          {item.date ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2, textAlign: language === 'ar' ? 'right' : 'left' }}
            >
              {item.date}
            </ThemedText>
          ) : null}

          <View style={[styles.tapDetailsRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Feather
              name="info"
              size={12}
              color={AppColors.primary}
              style={{ [language === 'ar' ? 'marginLeft' : 'marginRight']: 4 }}
            />
            <ThemedText type="small" style={styles.tapDetailsText}>
              {t("tap_for_details")}
            </ThemedText>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]}
          onPress={() => Linking.openURL(item.productUrl)}
        >
          <ThemedText type="small" style={styles.buyButtonText}>
            {t("buy")}
          </ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );

  const ListHeader = (
    <View>
      {isAdmin ? (
        <AdminToolbar
          editMode={editMode}
          onToggleEdit={() => setEditMode(e => !e)}
          onAdd={() => navigation.navigate("AdminAddOffre")}
          onClean={handleCleanOffres}
        />
      ) : null}

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textSecondary} style={{ marginHorizontal: Spacing.sm }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={t("search_offers")}
          placeholderTextColor={theme.textSecondary}
          textAlign={language === 'ar' ? 'right' : 'left'}
          returnKeyType="search"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={AppColors.primary} style={{ marginHorizontal: Spacing.sm }} />
        ) : searchQuery.length > 0 ? (
          <Pressable
            onPress={() => { setSearchQuery(""); setSearchResults(null); }}
            style={{ padding: Spacing.sm }}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const PaginationFooter = searchResults === null && allOffers.length > PAGE_SIZE ? (
    <View style={[styles.pagination, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
      <Pressable
        style={[
          styles.pageBtn,
          {
            backgroundColor: currentPage > 1 ? AppColors.primary : theme.backgroundSecondary,
            opacity: currentPage > 1 ? 1 : 0.4,
          },
        ]}
        onPress={() => currentPage > 1 && handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <Feather
          name={language === 'ar' ? 'chevron-right' : 'chevron-left'}
          size={18}
          color={currentPage > 1 ? "#fff" : theme.textSecondary}
        />
        <ThemedText type="small" style={{ color: currentPage > 1 ? "#fff" : theme.textSecondary, fontWeight: "600" }}>
          {t("previous")}
        </ThemedText>
      </Pressable>

      <ThemedText type="caption" style={{ color: theme.textSecondary, alignSelf: "center" }}>
        {currentPage} / {totalPages || 1}
      </ThemedText>

      <Pressable
        style={[
          styles.pageBtn,
          {
            backgroundColor: currentPage < totalPages ? AppColors.primary : theme.backgroundSecondary,
            opacity: currentPage < totalPages ? 1 : 0.4,
          },
        ]}
        onPress={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <ThemedText type="small" style={{ color: currentPage < totalPages ? "#fff" : theme.textSecondary, fontWeight: "600" }}>
          {t("next")}
        </ThemedText>
        <Feather
          name={language === 'ar' ? 'chevron-left' : 'chevron-right'}
          size={18}
          color={currentPage < totalPages ? "#fff" : theme.textSecondary}
        />
      </Pressable>
    </View>
  ) : null;

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <LoadingOverlay visible={isLoading} message={t("fetching_offers")} />

      <FlatList
        ref={flatListRef}
        data={displayedOffers}
        renderItem={renderOffer}
        keyExtractor={(item) => `${country}_${item.id}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={PaginationFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {searchResults !== null ? t("no_search_results") : t("no_offers_found")}
              </ThemedText>
            </View>
          ) : null
        }
      />

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedImage(null)}>
          <Image
            source={{ uri: selectedImage || "" }}
            style={styles.fullImage}
            contentFit="contain"
          />
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.lg },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    height: 44,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.xs,
  },
  offerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  offerRow: { alignItems: "center" },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  offerContent: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  offerTitle: { fontWeight: "600" },
  priceRow: { marginTop: Spacing.xs },
  tapDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  tapDetailsText: {
    color: AppColors.primary,
    fontWeight: "600",
    fontSize: 11,
  },
  buyButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  buyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flex: 1,
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  emptyContainer: {
    alignItems: "center",
    marginTop: Spacing["4xl"],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: Dimensions.get("window").width * 0.9,
    height: Dimensions.get("window").height * 0.7,
  },
  adminActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  adminBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
