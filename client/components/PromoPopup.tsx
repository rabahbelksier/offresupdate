import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
  Platform,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { getSettings } from "@/lib/storage";

// ─── Dismissed Ads Storage ────────────────────────────────────────────────────

const DISMISSED_PUB1_KEY = "@pub1_dismissed_ids";
const DISMISSED_PUB2_KEY = "@pub2_dismissed_ids";

async function getDismissedIds(key: string): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function markAsDismissed(key: string, id: number): Promise<void> {
  try {
    const current = await getDismissedIds(key);
    if (!current.includes(id)) {
      await AsyncStorage.setItem(key, JSON.stringify([...current, id]));
    }
  } catch {
    // silently fail
  }
}

const getDismissedPub1Ids = () => getDismissedIds(DISMISSED_PUB1_KEY);
const markPub1AsDismissed = (id: number) => markAsDismissed(DISMISSED_PUB1_KEY, id);
const getDismissedPub2Ids = () => getDismissedIds(DISMISSED_PUB2_KEY);
const markPub2AsDismissed = (id: number) => markAsDismissed(DISMISSED_PUB2_KEY, id);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PubData {
  id: number;
  productName: string;
  price: string;
  link: string;
  promoCode: string;
  codeValue?: string;
  image?: string | null;
  sellerCoupon?: string | null;
  sellerCouponValue?: string | null;
  note?: string | null;
  active?: string | null;
}

interface Pub2Data {
  id: number;
  image: string | null;
  note: string | null;
  buttonLabel: string | null;
  buttonLink: string | null;
  country: string | null;
  active: string | null;
}

// ─── Offer Ad Popup (pub) ────────────────────────────────────────────────────

interface OfferPopupProps {
  data: PubData;
  language: string;
  theme: any;
  t: (k: any) => string;
  onClose: () => void;
}

function OfferPopup({ data, language, theme, t, onClose }: OfferPopupProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSeller, setCopiedSeller] = useState(false);
  const [imgRatio, setImgRatio] = useState<number>(1);

  const handleCopyCode = async () => {
    if (!data.promoCode) return;
    await Clipboard.setStringAsync(data.promoCode);
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySellerCoupon = async () => {
    if (!data.sellerCoupon) return;
    await Clipboard.setStringAsync(data.sellerCoupon);
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedSeller(true);
    setTimeout(() => setCopiedSeller(false), 2000);
  };

  const isRTL = language === "ar";

  return (
    <View style={[styles.popup, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Feather name="x" size={22} color={theme.textSecondary} />
      </Pressable>

      {/* Image */}
      {data.image ? (
        <Pressable onPress={() => { Linking.openURL(data.link); onClose(); }} style={styles.imageContainer}>
          <Image
            source={{ uri: data.image }}
            style={[styles.productImage, { aspectRatio: imgRatio }]}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) setImgRatio(width / height);
            }}
          />
        </Pressable>
      ) : (
        <Feather name="gift" size={40} color={AppColors.secondary} style={styles.icon} />
      )}

      <ThemedText type="h3" style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {t("promo_title")}
      </ThemedText>

      <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>{t("product_name")}: </ThemedText>
        <ThemedText type="body" style={{ flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={2}>
          {data.productName}
        </ThemedText>
      </View>

      <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>{t("price")}: </ThemedText>
        <ThemedText type="h4" style={{ color: AppColors.primary }}>{data.price}</ThemedText>
      </View>

      {/* Seller Coupon */}
      {data.sellerCoupon ? (
        <View style={styles.promoCodeSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? "right" : "left" }}>
            {t("field_seller_coupon")}
            {data.sellerCouponValue ? ` (${data.sellerCouponValue})` : ""}:
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.promoCodeBadge,
              { backgroundColor: `${AppColors.secondary}15`, borderColor: AppColors.secondary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleCopySellerCoupon}
          >
            <ThemedText type="h4" style={{ color: AppColors.secondary, fontWeight: "700" }}>
              {data.sellerCoupon}
            </ThemedText>
            <Feather name={copiedSeller ? "check" : "copy"} size={18} color={AppColors.secondary} />
          </Pressable>
        </View>
      ) : null}

      {/* Promo Code */}
      {data.promoCode ? (
        <View style={styles.promoCodeSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, textAlign: isRTL ? "right" : "left" }}>
            {t("promo_code_label")} ({data.codeValue || t("tap_to_copy")}):
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.promoCodeBadge,
              { backgroundColor: `${AppColors.primary}15`, borderColor: AppColors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleCopyCode}
          >
            <ThemedText type="h4" style={{ color: AppColors.primary, fontWeight: "700" }}>
              {data.promoCode}
            </ThemedText>
            <Feather name={copied ? "check" : "copy"} size={18} color={AppColors.primary} />
          </Pressable>
        </View>
      ) : null}

      {/* Note */}
      {data.note ? (
        <ThemedText type="small" style={[styles.noteText, { color: theme.textSecondary, textAlign: "center" }]}>
          {data.note}
        </ThemedText>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.buyButton, pressed && { opacity: 0.8 }]}
        onPress={() => { Linking.openURL(data.link); onClose(); }}
      >
        <Feather name="shopping-cart" size={18} color="#FFFFFF" />
        <ThemedText type="body" style={styles.buyButtonText}>{t("promo_buy")}</ThemedText>
      </Pressable>
    </View>
  );
}

// ─── General Ad Popup (pub2) ──────────────────────────────────────────────────

interface GeneralPopupProps {
  data: Pub2Data;
  language: string;
  theme: any;
  t: (k: any) => string;
  onClose: () => void;
}

function GeneralPopup({ data, language, theme, onClose }: GeneralPopupProps) {
  const isRTL = language === "ar";
  const [imgRatio, setImgRatio] = useState<number>(1);

  const handleImagePress = () => {
    if (data.buttonLink) Linking.openURL(data.buttonLink);
    onClose();
  };

  const handleButtonPress = () => {
    if (data.buttonLink) Linking.openURL(data.buttonLink);
    onClose();
  };

  return (
    <View style={[styles.popup, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Feather name="x" size={22} color={theme.textSecondary} />
      </Pressable>

      {/* Image */}
      {data.image ? (
        <Pressable onPress={handleImagePress} style={styles.imageContainer}>
          <Image
            source={{ uri: data.image }}
            style={[styles.productImage, { aspectRatio: imgRatio }]}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) setImgRatio(width / height);
            }}
          />
        </Pressable>
      ) : null}

      {/* Note */}
      {data.note ? (
        <ThemedText type="small" style={[styles.noteText, { color: theme.textSecondary, textAlign: "center" }]}>
          {data.note}
        </ThemedText>
      ) : null}

      {/* Optional button */}
      {data.buttonLabel ? (
        <Pressable
          style={({ pressed }) => [styles.buyButton, { marginTop: Spacing.md }, pressed && { opacity: 0.8 }]}
          onPress={handleButtonPress}
        >
          <ThemedText type="body" style={styles.buyButtonText}>{data.buttonLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PromoPopup() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  // pub1 state — queue of offer ads to show sequentially
  const [pub1Visible, setPub1Visible] = useState(false);
  const [pub1Data, setPub1Data] = useState<PubData | null>(null);
  const [pub1Queue, setPub1Queue] = useState<PubData[]>([]);

  // pub2 state — queue of general ads to show sequentially
  const [pub2Visible, setPub2Visible] = useState(false);
  const [pub2Data, setPub2Data] = useState<Pub2Data | null>(null);
  const [pub2Queue, setPub2Queue] = useState<Pub2Data[]>([]);

  // Whether pub2 queue is pending (waiting for pub1 queue to finish first)
  const [pub2Pending, setPub2Pending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPromos();
    }, [])
  );

  const fetchPromos = async () => {
    try {
      const settings = await getSettings();
      const country = settings.country || "DZ";
      const apiUrl = getApiUrl();

      const [res1, res2] = await Promise.all([
        fetch(new URL(`/api/pub?country=${country}`, apiUrl).href),
        fetch(new URL(`/api/pub2?country=${country}`, apiUrl).href),
      ]);

      // ── pub1 ──────────────────────────────────────────────────────────────
      let hasPub1 = false;
      if (res1.ok) {
        const allOffers: PubData[] = await res1.json();
        if (Array.isArray(allOffers) && allOffers.length > 0) {
          const dismissed1 = await getDismissedPub1Ids();
          const queue1 = allOffers.filter((ad) => {
            if (ad.active === "off" && dismissed1.includes(ad.id)) return false;
            return true;
          });

          if (queue1.length > 0) {
            setPub1Queue(queue1);
            setPub1Data(queue1[0]);
            hasPub1 = true;
          }
        }
      }

      // ── pub2 ──────────────────────────────────────────────────────────────
      if (res2.ok) {
        const allAds: Pub2Data[] = await res2.json();
        if (Array.isArray(allAds) && allAds.length > 0) {
          // Filter out dismissed ads (those with active === "off" that user already closed)
          const dismissed = await getDismissedPub2Ids();
          const queue = allAds.filter((ad) => {
            if (ad.active === "off" && dismissed.includes(ad.id)) return false;
            return true;
          });

          if (queue.length > 0) {
            setPub2Queue(queue);
            setPub2Data(queue[0]);
            if (hasPub1) {
              setPub2Pending(true);
            } else {
              setPub2Visible(true);
            }
          }
        }
      }

      if (hasPub1) setPub1Visible(true);
    } catch {
      // silently fail
    }
  };

  const handlePub1Close = () => {
    const current = pub1Data;

    // If active === "off", mark this offer ad as dismissed
    if (current && current.active === "off") {
      markPub1AsDismissed(current.id);
    }

    // Advance to next offer ad in the queue
    setPub1Queue((prevQueue) => {
      const remaining = prevQueue.slice(1);
      if (remaining.length > 0) {
        setPub1Data(remaining[0]);
        // Keep visible to show next offer ad immediately
      } else {
        setPub1Visible(false);
        setPub1Data(null);
        // pub1 queue exhausted — show pub2 queue if it was waiting
        if (pub2Pending) {
          setPub2Pending(false);
          setPub2Visible(true);
        }
      }
      return remaining;
    });
  };

  const handlePub2Close = () => {
    const current = pub2Data;

    // If active === "off", mark this ad as dismissed so it never shows again
    if (current && current.active === "off") {
      markPub2AsDismissed(current.id);
    }

    // Advance to next ad in the queue
    setPub2Queue((prevQueue) => {
      const remaining = prevQueue.slice(1);
      if (remaining.length > 0) {
        setPub2Data(remaining[0]);
        // Keep visible to show next ad immediately
      } else {
        setPub2Visible(false);
        setPub2Data(null);
      }
      return remaining;
    });
  };

  return (
    <>
      {/* Offer Ad Modal */}
      <Modal visible={pub1Visible && !!pub1Data} transparent animationType="fade">
        <View style={styles.overlay}>
          {pub1Data && (
            <OfferPopup
              data={pub1Data}
              language={language}
              theme={theme}
              t={t}
              onClose={handlePub1Close}
            />
          )}
        </View>
      </Modal>

      {/* General Ad Modal */}
      <Modal visible={pub2Visible && !!pub2Data} transparent animationType="fade">
        <View style={styles.overlay}>
          {pub2Data && (
            <GeneralPopup
              data={pub2Data}
              language={language}
              theme={theme}
              t={t}
              onClose={handlePub2Close}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  popup: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  icon: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  imageContainer: {
    width: "100%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  productImage: {
    width: "100%",
    borderRadius: BorderRadius.md,
  },
  title: {
    marginBottom: Spacing.md,
    width: "100%",
  },
  infoRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  promoCodeSection: {
    width: "100%",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  promoCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  noteText: {
    width: "100%",
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    width: "100%",
  },
  buyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
