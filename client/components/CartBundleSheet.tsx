import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { getCartTemplate, getCartNoteTemplate, getSettings } from "@/lib/storage";

interface CartItem {
  id: number;
  linkcart: string | null;
  pricecart: string | null;
}

interface CouponRow {
  value?: string;
  cod1?: string;
  cod2?: string;
  cod3?: string;
  [key: string]: any;
}

interface LinkInfo {
  id: number;
  link: string;
  count: number;
}

interface ProductInfo {
  title?: string;
  price: string;
  offers?: Array<{ key?: string; link: string; success?: boolean }>;
  cod_1?: string;
  cod_2?: string;
  cod_3?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  product: ProductInfo;
}

type Step =
  | "loading"
  | "enter_price"
  | "price_error"
  | "no_cart"
  | "no_coupons"
  | "no_country"
  | "shipping"
  | "autoDiscount"
  | "sellerCoupon"
  | "selectCoupon"
  | "preparing"
  | "result";

function parseNum(s: string | undefined | null): number {
  if (!s) return 0;
  return parseFloat(s.replace(",", ".")) || 0;
}

function isValidPrice(p: number): boolean {
  return !isNaN(p) && p > 0;
}

export default function CartBundleSheet({ visible, onClose, product }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const [step, setStep] = useState<Step>("loading");
  const [manualPrice, setManualPrice] = useState("");
  const [shipping, setShipping] = useState("0");
  const [autoDiscount, setAutoDiscount] = useState("0");
  const [sellerCoupon, setSellerCoupon] = useState("0");

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [finalPrice, setFinalPrice] = useState(0);
  const [resultLinks, setResultLinks] = useState<LinkInfo[]>([]);
  const [mainLink, setMainLink] = useState("");
  const [selectedCouponValue, setSelectedCouponValue] = useState("");
  const [partialCouponValue, setPartialCouponValue] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [showInfoPopup, setShowInfoPopup] = useState(true);
  const [cartNoteTemplate, setCartNoteTemplate] = useState("");
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawPrice = parseNum(product.price);
  const effectivePrice = isValidPrice(rawPrice) ? rawPrice : parseNum(manualPrice);

  useEffect(() => {
    if (!visible) return;

    setStep("loading");
    setManualPrice("");
    setShipping("0");
    setAutoDiscount("0");
    setSellerCoupon("0");
    setFinalPrice(0);
    setResultLinks([]);
    setMainLink("");
    setSelectedCouponValue("");
    setPartialCouponValue(0);
    setSelectedCodes([]);
    setToastVisible(false);
    setShowInfoPopup(true);

    if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    infoTimerRef.current = setTimeout(() => setShowInfoPopup(false), 60000);

    loadData();

    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    };
  }, [visible]);

  const loadData = async () => {
    try {
      const settings = await getSettings();
      const userCountry = (settings.country || "").toUpperCase();
      setCartNoteTemplate(await getCartNoteTemplate());

      // Highest-priority precondition: shipping country must be Algeria
      if (userCountry !== "DZ") {
        setStep("no_country");
        return;
      }

      const apiUrl = getApiUrl();
      const [cartRes, couponRes] = await Promise.all([
        fetch(new URL("/api/cart", apiUrl).href),
        fetch(new URL("/api/coupon-codes?country=dz", apiUrl).href),
      ]);
      const cartData = await cartRes.json();
      const couponData = await couponRes.json();
      const items: CartItem[] = Array.isArray(cartData) ? cartData : [];
      const couponRows: CouponRow[] = Array.isArray(couponData) ? couponData : [];
      setCartItems(items);
      setCoupons(couponRows);

      // Promo codes availability has priority over cart availability
      if (couponRows.length === 0) {
        setStep("no_coupons");
        return;
      }

      if (items.length === 0) {
        setStep("no_cart");
        return;
      }

      if (!isValidPrice(rawPrice)) {
        setStep("enter_price");
        return;
      }

      if (rawPrice < 50) {
        setStep("price_error");
        return;
      }

      setStep("shipping");
    } catch {
      setStep("no_cart");
    }
  };

  const handleManualPriceSave = () => {
    const p = parseNum(manualPrice);
    if (!isValidPrice(p)) return;
    if (p < 50) {
      setStep("price_error");
      return;
    }
    setStep("shipping");
  };

  const getFilteredCoupons = (): CouponRow[] => {
    const price = effectivePrice;
    return coupons.filter(row => {
      if (!row.value) return false;
      const parts = (row.value as string).split("/");
      if (parts.length !== 2) return false;
      const threshold = parseFloat(parts[1]);
      return !isNaN(threshold) && threshold > price;
    });
  };

  const buildCartLinks = (threshold: number): LinkInfo[] => {
    const price = effectivePrice;
    // Constraint: threshold <= price + sum(selected) <= threshold + 2
    const deficitMin = threshold - price;
    const deficitMax = threshold + 2 - price;

    const result: LinkInfo[] = [];
    const item1 = cartItems.find(c => c.id === 1);
    const otherItems = cartItems
      .filter(c => c.id !== 1 && c.linkcart)
      .sort((a, b) => a.id - b.id);

    let sum = 0;

    for (const item of otherItems) {
      if (sum >= deficitMin) break;
      const itemPrice = parseNum(item.pricecart);
      // Skip items that would push total above the upper bound
      if (sum + itemPrice > deficitMax) continue;
      result.push({ id: item.id, link: item.linkcart as string, count: 1 });
      sum += itemPrice;
    }

    // Use item id=1 to fill the remaining gap precisely
    // When used, place id=1 FIRST in the list so it becomes {cart_link1} in the message
    if (item1?.linkcart) {
      if (sum < deficitMin) {
        const price1 = parseNum(item1.pricecart) || 1;
        const remaining = deficitMin - sum;
        const count = Math.max(1, Math.ceil(remaining / price1));
        result.unshift({ id: 1, link: item1.linkcart, count });
      } else if (result.length === 0) {
        result.push({ id: 1, link: item1.linkcart, count: 1 });
      }
    }

    return result;
  };

  const handleCouponSelect = async (coupon: CouponRow) => {
    setStep("preparing");
    const parts = (coupon.value as string).split("/");
    const couponValue = parseFloat(parts[0]);
    const threshold = parseFloat(parts[1]);
    const price = effectivePrice;

    const shippingVal = parseNum(shipping);
    const autoDiscountVal = parseNum(autoDiscount);
    const sellerCouponVal = parseNum(sellerCoupon);
    const coinsDiscount = Math.min(price / 100, 3);
    const couponcartVal = (couponValue * price) / threshold;

    const totalDiscounts = autoDiscountVal + sellerCouponVal + couponcartVal + coinsDiscount;
    const finalP = price - totalDiscounts + shippingVal;

    const links = buildCartLinks(threshold);
    const coinLink = product.offers?.find(o => o.key === "coin_link" && o.success)?.link || "";

    const codes = [coupon.cod1, coupon.cod2, coupon.cod3]
      .map(c => (typeof c === "string" ? c.trim() : ""))
      .filter(c => c.length > 0);

    setFinalPrice(finalP);
    setResultLinks(links);
    setMainLink(coinLink);
    setSelectedCouponValue(coupon.value || "");
    setPartialCouponValue(couponcartVal);
    setSelectedCodes(codes);

    setTimeout(() => setStep("result"), 800);
  };

  const buildCartMessage = (template: string): string => {
    const cartLinks: string[] = resultLinks.map(info => info.link);
    const item1Info = resultLinks.find(info => info.id === 1);
    const item1Count = item1Info ? item1Info.count : 0;

    const partialStr = Number.isInteger(partialCouponValue)
      ? partialCouponValue.toString()
      : partialCouponValue.toFixed(2);

    let formatted = template
      .replace(/{titel}/g, product.title || "")
      .replace(/{pricecart}/g, finalPrice.toFixed(2))
      .replace(/{couponVendeur}/g, parseNum(sellerCoupon).toString())
      .replace(/{discVendeur}/g, parseNum(autoDiscount).toString())
      .replace(/{couponcartValue}/g, partialStr)
      .replace(/{cod_1}/g, selectedCodes[0] || "")
      .replace(/{cod_2}/g, selectedCodes[1] || "")
      .replace(/{cod_3}/g, selectedCodes[2] || "")
      .replace(/{coin_link}/g, mainLink || "")
      .replace(/{cart_link1_count}/g, item1Count.toString());

    // When the app used item id=1, automatically insert an explanatory note
    // on the line above {cart_link1} (which is now id=1's link). The note
    // text is taken from the editable "cart_note" template.
    for (let i = 1; i <= 10; i++) {
      const link = cartLinks[i - 1] || "";
      let replacement = link;
      if (i === 1 && item1Count > 0 && link) {
        const note = (cartNoteTemplate || "").replace(/{cart_link1_count}/g, item1Count.toString());
        if (note.trim()) {
          replacement = `${note}\n${link}`;
        }
      }
      formatted = formatted.replace(new RegExp(`{cart_link${i}}`, "g"), replacement);
    }

    return formatted;
  };

  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const handleCopyOffer = async () => {
    try {
      const template = await getCartTemplate(language);
      const text = buildCartMessage(template);
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showLocalToast(t("copied_to_clipboard"));
    } catch {
      showLocalToast(t("error"));
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync();
      }
      showLocalToast(`${code} ${t("copied_to_clipboard")}`);
    } catch {
      showLocalToast(t("error"));
    }
  };

  const handleShareOffer = async () => {
    try {
      const template = await getCartTemplate(language);
      const text = buildCartMessage(template);
      await Share.share({ message: text });
    } catch (error) {
      console.error("Failed to share cart offer:", error);
    }
  };

  const proceedFromSellerCoupon = () => {
    if (cartItems.length === 0) { setStep("no_cart"); return; }
    const filtered = getFilteredCoupons();
    if (filtered.length === 0) { setStep("no_coupons"); return; }
    setStep("selectCoupon");
  };

  const openLink = async (url: string) => {
    if (!url) return;
    try {
      if (Platform.OS !== "web") await Haptics.selectionAsync();
      await Linking.openURL(url);
    } catch {}
  };

  const sheetH = screenHeight * 0.7;
  const infoH = screenHeight * 0.3;
  const textAlign = isRTL ? "right" : "left";

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundSecondary,
      color: theme.text,
      borderColor: theme.border,
      textAlign: "left" as const,
      writingDirection: "ltr" as const,
    },
  ];

  const renderStep = () => {
    switch (step) {
      case "loading":
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
        );

      case "enter_price":
        return (
          <View>
            <ThemedText type="body" style={[styles.stepLabel, { color: theme.textSecondary, textAlign }]}>
              {t("cart_bundle_enter_price")}
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.textSecondary}
              placeholder="0"
              autoFocus
            />
            <Pressable
              style={({ pressed }) => [styles.nextBtn, { backgroundColor: AppColors.primary }, pressed && styles.pressed]}
              onPress={handleManualPriceSave}
            >
              <ThemedText type="body" style={styles.btnText}>{t("cart_bundle_save")}</ThemedText>
            </Pressable>
          </View>
        );

      case "price_error":
        return <ErrorState message={t("cart_bundle_min_price")} theme={theme} />;

      case "no_cart":
        return <ErrorState message={t("cart_bundle_no_cart")} theme={theme} />;

      case "no_coupons":
        return <ErrorState message={t("cart_bundle_no_coupons")} theme={theme} />;

      case "no_country":
        return <ErrorState message={t("cart_bundle_not_available_country")} theme={theme} />;

      case "shipping":
        return (
          <StepView
            label={t("cart_bundle_step_shipping")}
            value={shipping}
            onChangeText={setShipping}
            onNext={() => setStep("autoDiscount")}
            theme={theme}
            inputStyle={inputStyle}
            textAlign={textAlign}
            saveLabel={t("cart_bundle_save")}
          />
        );

      case "autoDiscount":
        return (
          <StepView
            label={t("cart_bundle_step_auto_discount")}
            value={autoDiscount}
            onChangeText={setAutoDiscount}
            onNext={() => setStep("sellerCoupon")}
            theme={theme}
            inputStyle={inputStyle}
            textAlign={textAlign}
            saveLabel={t("cart_bundle_save")}
          />
        );

      case "sellerCoupon":
        return (
          <StepView
            label={t("cart_bundle_step_seller_coupon")}
            value={sellerCoupon}
            onChangeText={setSellerCoupon}
            onNext={proceedFromSellerCoupon}
            theme={theme}
            inputStyle={inputStyle}
            textAlign={textAlign}
            saveLabel={t("cart_bundle_save")}
          />
        );

      case "selectCoupon": {
        const filtered = getFilteredCoupons();
        return (
          <View>
            <ThemedText type="body" style={[styles.stepLabel, { color: theme.textSecondary, textAlign }]}>
              {t("cart_bundle_step_select_coupon")}
            </ThemedText>
            {filtered.map((coupon, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.couponRow,
                  { backgroundColor: theme.backgroundSecondary, borderColor: AppColors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={() => handleCouponSelect(coupon)}
              >
                <Feather name="tag" size={16} color={AppColors.primary} />
                <ThemedText type="body" style={{ color: AppColors.primary, marginLeft: 8 }}>
                  {coupon.value}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        );
      }

      case "preparing":
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary, textAlign }}>
              {t("cart_bundle_preparing")}
            </ThemedText>
          </View>
        );

      case "result":
        return (
          <View>
            <View style={[styles.priceCard, { backgroundColor: AppColors.primary }]}>
              <ThemedText type="small" style={styles.priceLabelSmall}>
                {t("cart_bundle_your_price")}
              </ThemedText>
              <ThemedText type="h3" style={styles.priceValue}>
                {finalPrice.toFixed(2)} $
              </ThemedText>
            </View>

            <ThemedText type="small" style={[styles.instructions, { color: theme.textSecondary, textAlign }]}>
              {t("cart_bundle_instructions")}
            </ThemedText>

            {mainLink ? (
              <Pressable
                testID="button-cart-bundle-main"
                style={({ pressed }) => [
                  styles.linkBtn,
                  { backgroundColor: AppColors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={() => openLink(mainLink)}
              >
                <Feather name="shopping-cart" size={16} color="#fff" />
                <ThemedText type="body" style={styles.linkBtnText}>
                  {t("cart_bundle_your_link")}
                </ThemedText>
              </Pressable>
            ) : null}

            {selectedCodes.length > 0 ? (
              <View style={[styles.codesRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {selectedCodes.map((code, idx) => (
                  <Pressable
                    key={`code-${idx}`}
                    testID={`button-cart-code-${idx}`}
                    onPress={() => handleCopyCode(code)}
                    style={({ pressed }) => [
                      styles.codeChip,
                      { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="small" style={{ fontWeight: "700" }}>{code}</ThemedText>
                    <Feather name="copy" size={12} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {resultLinks.map((info, idx) => (
              <Pressable
                key={idx}
                testID={`button-cart-extra-${idx}`}
                style={({ pressed }) => [
                  styles.linkBtn,
                  { backgroundColor: theme.backgroundSecondary, borderColor: AppColors.secondary, borderWidth: 1 },
                  pressed && styles.pressed,
                ]}
                onPress={() => openLink(info.link)}
              >
                <Feather name="package" size={16} color={AppColors.secondary} />
                <ThemedText type="body" style={[styles.linkBtnTextAlt, { color: AppColors.secondary }]}>
                  {info.id === 1 && info.count > 1
                    ? `${t("cart_bundle_extra_link")} x${info.count}`
                    : t("cart_bundle_extra_link")}
                </ThemedText>
              </Pressable>
            ))}

            <View style={[styles.shareRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Pressable
                testID="button-cart-bundle-copy"
                style={({ pressed }) => [
                  styles.shareBtn,
                  { backgroundColor: AppColors.primary },
                  pressed && styles.pressed,
                ]}
                onPress={handleCopyOffer}
              >
                <Feather name="copy" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={styles.shareBtnText}>
                  {t("cart_bundle_copy")}
                </ThemedText>
              </Pressable>
              <Pressable
                testID="button-cart-bundle-share"
                style={({ pressed }) => [
                  styles.shareBtn,
                  { backgroundColor: AppColors.secondary },
                  pressed && styles.pressed,
                ]}
                onPress={handleShareOffer}
              >
                <Feather name="share-2" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={styles.shareBtnText}>
                  {t("cart_bundle_share")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {showInfoPopup ? (
          <Pressable
            style={[styles.infoPressable, { height: infoH }]}
            onPress={() => setShowInfoPopup(false)}
          >
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <View style={[styles.infoHeaderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <ThemedText type="h4">{t("cart_bundle_explain_title")}</ThemedText>
                <Feather name="x" size={18} color={theme.textSecondary} />
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 18, textAlign }}>
                {t("cart_bundle_explain_body")}
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        )}

        <View style={[styles.sheet, { height: sheetH, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <Pressable
            style={[styles.closeBtn, isRTL ? { right: undefined, left: 16 } : { right: 16 }]}
            onPress={onClose}
            testID="button-cart-bundle-close"
          >
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>

          {toastVisible ? (
            <View style={styles.toast} pointerEvents="none">
              <ThemedText type="small" style={styles.toastText}>{toastMessage}</ThemedText>
            </View>
          ) : null}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="shopping-cart" size={20} color={AppColors.primary} />
              <ThemedText type="h4" style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, color: AppColors.primary }}>
                {t("cart_bundle_offer")}
              </ThemedText>
            </View>

            {renderStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StepView({
  label, value, onChangeText, onNext, theme, inputStyle, textAlign, saveLabel,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onNext: () => void;
  theme: any;
  inputStyle: any;
  textAlign: "left" | "right";
  saveLabel: string;
}) {
  return (
    <View>
      <ThemedText type="body" style={[styles.stepLabel, { color: theme.textSecondary, textAlign }]}>
        {label}
      </ThemedText>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.textSecondary}
        placeholder="0"
      />
      <Pressable
        style={({ pressed }) => [styles.nextBtn, { backgroundColor: AppColors.primary }, pressed && styles.pressed]}
        onPress={onNext}
      >
        <ThemedText type="body" style={styles.btnText}>{saveLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

function ErrorState({ message, theme }: { message: string; theme: any }) {
  return (
    <View style={styles.centered}>
      <Feather name="alert-circle" size={40} color={AppColors.error} />
      <ThemedText type="body" style={{ marginTop: Spacing.md, textAlign: "center", color: theme.text, lineHeight: 22 }}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  infoPressable: {
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  infoHeaderRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    padding: 6,
    zIndex: 10,
  },
  sheetContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  titleRow: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  stepLabel: {
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  nextBtn: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  priceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  priceLabelSmall: {
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  priceValue: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  instructions: {
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  linkBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  linkBtnTextAlt: {
    fontWeight: "600",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
  codesRow: {
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  codeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  shareRow: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    zIndex: 20,
  },
  toastText: {
    color: "#FFFFFF",
  },
});
