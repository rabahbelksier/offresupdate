import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "UserOfferResult">;

export default function UserOfferResultScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const route = useRoute<RouteProps>();
  const { request } = route.params;
  const apiUrl = getApiUrl();

  const [imageUrl, setImageUrl] = useState<string | null>(
    request.link_img || null
  );
  const [imageLoading, setImageLoading] = useState(!request.link_img);
  const [extractedTitle, setExtractedTitle] = useState<string | null>(
    request.title || null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!request.link_img && request.link) {
      extractProductImage(request.link);
    }
    if (!request.title && request.link) {
      extractProductTitle(request.link);
    }
    if (request.code_value && request.country) {
      fetchRealCoupons(request.country, request.code_value);
    }
  }, []);

  const fetchRealCoupons = async (country: string, codeValue: string) => {
    try {
      const url = new URL("/api/offer-request-coupons", apiUrl);
      url.searchParams.set("country", country);
      url.searchParams.set("codeValue", codeValue);
      const res = await fetch(url.href);
      if (res.ok) {
        const data: string[] = await res.json();
        setPromoCodes(data);
      }
    } catch {}
  };

  const extractProductImage = async (productUrl: string) => {
    setImageLoading(true);
    try {
      const res = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) setImageUrl(data.imageUrl);
        if (!request.title && data.title) setExtractedTitle(data.title);
      }
    } catch {}
    setImageLoading(false);
  };

  const extractProductTitle = async (productUrl: string) => {
    try {
      const res = await fetch(new URL("/api/product", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) setExtractedTitle(data.title);
      }
    } catch {}
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setTimeout(() => setCopiedCode(null), 2000);
  };


  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.imageCard, { backgroundColor: theme.backgroundDefault }]}
        >
          {imageLoading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={48} color={theme.textSecondary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
              >
                {t("offer_request_no_image")}
              </ThemedText>
            </View>
          )}
        </View>

        {(request.title || extractedTitle) ? (
          <ThemedText
            type="h3"
            style={[styles.productTitle, { color: theme.text }]}
          >
            {request.title || extractedTitle}
          </ThemedText>
        ) : null}

        <View
          style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}
        >
          {request.price ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Feather name="tag" size={16} color={AppColors.primary} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {t("offer_request_final_price")}
                </ThemedText>
                <ThemedText
                  type="h4"
                  style={{ color: AppColors.primary }}
                >
                  {request.price}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {request.coupon_vondor ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="percent" size={16} color="#FFD700" />
                </View>
                <View style={styles.infoContent}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("offer_request_seller_coupon")}
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.text, fontWeight: "700" }}>
                    {request.coupon_vondor}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}

          {request.code_value ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="gift" size={16} color={AppColors.secondary || AppColors.error} />
                </View>
                <View style={styles.infoContent}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {t("offer_request_promo_code_value")}
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.text, fontWeight: "700" }}>
                    {request.code_value}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {promoCodes.length > 0 && (
          <View
            style={[
              styles.promoSection,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="h4" style={styles.sectionTitle}>
              {t("offer_request_promo_codes")}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}
            >
              {t("offer_request_tap_copy")}
            </ThemedText>
            <View style={styles.codesGrid}>
              {promoCodes.map((code) => (
                <Pressable
                  key={code}
                  style={({ pressed }) => [
                    styles.codeChip,
                    {
                      backgroundColor:
                        copiedCode === code
                          ? "#22c55e"
                          : `${AppColors.primary}15`,
                      borderColor:
                        copiedCode === code
                          ? "#22c55e"
                          : AppColors.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => handleCopyCode(code)}
                >
                  <Feather
                    name={copiedCode === code ? "check" : "copy"}
                    size={13}
                    color={copiedCode === code ? "#fff" : AppColors.primary}
                  />
                  <ThemedText
                    type="body"
                    style={{
                      color: copiedCode === code ? "#fff" : AppColors.primary,
                      fontWeight: "700",
                      marginLeft: 4,
                      letterSpacing: 1,
                    }}
                  >
                    {copiedCode === code ? t("offer_request_copied") : code}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {request.details ? (
          <View
            style={[styles.adminNoteCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.sectionHeader}>
              <Feather name="message-square" size={16} color={AppColors.primary} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.xs }}>
                {t("offer_request_ai_note")}
              </ThemedText>
            </View>
            <ThemedText
              type="body"
              style={{ color: theme.text, lineHeight: 22, marginTop: Spacing.sm }}
            >
              {request.details}
            </ThemedText>
          </View>
        ) : null}

        {request.link ? (
          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              if (request.link) Linking.openURL(request.link).catch(() => {});
            }}
          >
            <Feather name="shopping-cart" size={20} color="#fff" />
            <ThemedText
              type="h4"
              style={{ color: "#fff", marginLeft: Spacing.sm }}
            >
              {t("offer_request_buy_now")}
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 60 },
  imageCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  productImage: {
    width: "100%",
    height: 280,
  },
  imagePlaceholder: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  productTitle: {
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${AppColors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  infoContent: { flex: 1 },
  divider: { height: 1, marginVertical: Spacing.xs },
  promoSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  codesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  codeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  adminNoteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
});
