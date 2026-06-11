import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SHIPPING_COUNTRIES } from "@/constants/countries";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import {
  getShareTemplate,
  saveShareTemplate,
  getDetailsTemplate,
  saveDetailsTemplate,
  getCopyAllTemplate,
  saveCopyAllTemplate,
  getBestSellerTemplate,
  saveBestSellerTemplate,
  getCartTemplate,
  saveCartTemplate,
  getCartNoteTemplate,
  saveCartNoteTemplate,
  fetchAndCacheTemplatesFromServer,
  getDefaultTemplateForLang,
  DEFAULT_NOTIF_TEMPLATES,
} from "@/lib/storage";

type TemplateType =
  | "share"
  | "cart"
  | "details"
  | "copyAll"
  | "coin_link"
  | "direct_link"
  | "super_link"
  | "big_save_link"
  | "limited_link"
  | "potential_link"
  | "bundle_direct_link"
  | "bundle_page_link"
  | "best_seller"
  | "trending"
  | "notifications";

type AppLang = "ar" | "en" | "fr" | "pt";

interface KeywordDef {
  key: string;
  descKey: string;
}

const KEYWORDS_PRODUCT_BASE: KeywordDef[] = [
  { key: "{title}", descKey: "kw_title" },
  { key: "{price}", descKey: "kw_price" },
  { key: "{originalPrice}", descKey: "kw_originalPrice" },
  { key: "{finalPrice}", descKey: "kw_finalPrice" },
  { key: "{couponValue}", descKey: "kw_couponValue" },
  { key: "{discount}", descKey: "kw_discount" },
  { key: "{storeName}", descKey: "kw_storeName" },
  { key: "{evaluateRate}", descKey: "kw_evaluateRate" },
  { key: "{shopUrl}", descKey: "kw_shopUrl" },
  { key: "{orders}", descKey: "kw_orders" },
  { key: "{commission_rate}", descKey: "kw_commission_rate" },
  { key: "{first_level_category_name}", descKey: "kw_first_level_category_name" },
  { key: "{shipping_fees}", descKey: "kw_shipping_fees" },
];

const KEYWORDS_COUPONS: KeywordDef[] = [
  { key: "{coupons_summary}", descKey: "kw_coupons_summary" },
  { key: "{seller_coupon}", descKey: "kw_seller_coupon" },
  { key: "{cod_1}", descKey: "kw_cod_1" },
  { key: "{cod_2}", descKey: "kw_cod_2" },
  { key: "{cod_3}", descKey: "kw_cod_3" },
];

const KEYWORDS_ALL_LINKS: KeywordDef[] = [
  { key: "{offers}", descKey: "kw_offers" },
  { key: "{coin_link}", descKey: "kw_coin_link" },
  { key: "{direct_link}", descKey: "kw_direct_link" },
  { key: "{super_link}", descKey: "kw_super_link" },
  { key: "{big_save_link}", descKey: "kw_big_save_link" },
  { key: "{limited_link}", descKey: "kw_limited_link" },
  { key: "{potential_link}", descKey: "kw_potential_link" },
  { key: "{bundle_direct_link}", descKey: "kw_bundle_direct_link" },
  { key: "{bundle_page_link}", descKey: "kw_bundle_page_link" },
];

const KW_TRENDING: KeywordDef = { key: "{trending}", descKey: "kw_trending" };

const EXCLUDED_FROM_SIMPLE_OFFERS: string[] = [
  "{coupons_summary}", "{cod_1}", "{cod_2}", "{cod_3}",
  "{commission_rate}", "{offers}", "{discount}", "{originalPrice}", "{trending}",
];

function getKeywordsForTemplate(templateType: TemplateType): KeywordDef[] {
  switch (templateType) {
    case "share":
    case "copyAll":
      return [...KEYWORDS_PRODUCT_BASE, ...KEYWORDS_COUPONS, ...KEYWORDS_ALL_LINKS, KW_TRENDING];
    case "details":
      return [
        { key: "{title}", descKey: "kw_title" },
        { key: "{price}", descKey: "kw_price" },
        { key: "{originalPrice}", descKey: "kw_originalPrice" },
        { key: "{finalPrice}", descKey: "kw_finalPrice" },
        { key: "{couponValue}", descKey: "kw_couponValue" },
        { key: "{discount}", descKey: "kw_discount" },
        { key: "{storeName}", descKey: "kw_storeName" },
        { key: "{evaluateRate}", descKey: "kw_evaluateRate" },
        { key: "{shopUrl}", descKey: "kw_shopUrl" },
        { key: "{orders}", descKey: "kw_orders" },
        { key: "{commission_rate}", descKey: "kw_commission_rate" },
        { key: "{first_level_category_name}", descKey: "kw_first_level_category_name" },
        { key: "{shipping_fees}", descKey: "kw_shipping_fees" },
      ];
    case "coin_link":
      return [...KEYWORDS_PRODUCT_BASE, ...KEYWORDS_COUPONS, { key: "{coin_link}", descKey: "kw_coin_link" }];
    case "direct_link":
      return [...KEYWORDS_PRODUCT_BASE, ...KEYWORDS_COUPONS, { key: "{direct_link}", descKey: "kw_direct_link" }];
    case "trending":
      return [
        ...KEYWORDS_PRODUCT_BASE,
        { key: "{finalPricetrend}", descKey: "kw_finalPricetrend" },
        ...KEYWORDS_COUPONS,
        { key: "{direct_link}", descKey: "kw_direct_link" },
        KW_TRENDING,
      ];
    case "best_seller":
      return [
        { key: "{title}", descKey: "kw_title" },
        { key: "{price}", descKey: "kw_price" },
        { key: "{originalPrice}", descKey: "kw_originalPrice" },
        { key: "{discount}", descKey: "kw_discount" },
        { key: "{storeName}", descKey: "kw_storeName" },
        { key: "{evaluateRate}", descKey: "kw_evaluateRate" },
        { key: "{shopUrl}", descKey: "kw_shopUrl" },
        { key: "{orders}", descKey: "kw_orders" },
        { key: "{first_level_category_name}", descKey: "kw_first_level_category_name" },
        { key: "{commission_rate}", descKey: "kw_commission_rate" },
        { key: "{direct_link}", descKey: "kw_direct_link" },
      ];
    case "super_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{super_link}", descKey: "kw_super_link" }];
    }
    case "big_save_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{big_save_link}", descKey: "kw_big_save_link" }];
    }
    case "limited_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{limited_link}", descKey: "kw_limited_link" }];
    }
    case "potential_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{potential_link}", descKey: "kw_potential_link" }];
    }
    case "bundle_direct_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{bundle_direct_link}", descKey: "kw_bundle_direct_link" }];
    }
    case "bundle_page_link": {
      const base = KEYWORDS_PRODUCT_BASE.filter(k => !EXCLUDED_FROM_SIMPLE_OFFERS.includes(k.key));
      return [...base, { key: "{bundle_page_link}", descKey: "kw_bundle_page_link" }];
    }
    case "cart":
      return [
        { key: "{titel}", descKey: "kw_titel" },
        { key: "{pricecart}", descKey: "kw_pricecart" },
        { key: "{couponVendeur}", descKey: "kw_couponVendeur" },
        { key: "{discVendeur}", descKey: "kw_discVendeur" },
        { key: "{couponcartValue}", descKey: "kw_couponcartValue" },
        { key: "{cod_1}", descKey: "kw_couponValue" },
        { key: "{cod_2}", descKey: "kw_couponValue" },
        { key: "{cod_3}", descKey: "kw_couponValue" },
        { key: "{coin_link}", descKey: "kw_coin_link" },
        { key: "{cart_link1_count}", descKey: "kw_cart_link1_count" },
        { key: "{cart_link1}", descKey: "kw_cart_link" },
        { key: "{cart_link2}", descKey: "kw_cart_link" },
        { key: "{cart_link3}", descKey: "kw_cart_link" },
        { key: "{cart_link4}", descKey: "kw_cart_link" },
        { key: "{cart_link5}", descKey: "kw_cart_link" },
        { key: "{cart_link6}", descKey: "kw_cart_link" },
        { key: "{cart_link7}", descKey: "kw_cart_link" },
        { key: "{cart_link8}", descKey: "kw_cart_link" },
        { key: "{cart_link9}", descKey: "kw_cart_link" },
        { key: "{cart_link10}", descKey: "kw_cart_link" },
      ];
    default:
      return KEYWORDS_PRODUCT_BASE;
  }
}

export default function MessageDesignScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const isRTL = language === "ar";

  const TEMPLATE_TABS: { key: TemplateType; label: string; icon: string }[] = [
    { key: "share", label: t("share"), icon: "share-2" },
    { key: "details", label: t("details"), icon: "file-text" },
    { key: "copyAll", label: t("copy_all"), icon: "copy" },
    { key: "best_seller", label: t("best_seller_template"), icon: "award" },
    { key: "coin_link", label: t("coin_link"), icon: "trending-up" },
    { key: "direct_link", label: t("direct_link"), icon: "link" },
    { key: "super_link", label: t("super_link"), icon: "zap" },
    { key: "big_save_link", label: t("big_save_link"), icon: "dollar-sign" },
    { key: "limited_link", label: t("limited_link"), icon: "clock" },
    { key: "potential_link", label: t("potential_link"), icon: "percent" },
    { key: "bundle_direct_link", label: t("bundle_direct_link"), icon: "package" },
    { key: "bundle_page_link", label: t("bundle_page_link"), icon: "layers" },
    { key: "trending", label: t("trending_offer"), icon: "trending-up" },
    { key: "cart", label: t("cart_template"), icon: "shopping-cart" },
    ...(isAdmin ? [{ key: "notifications" as TemplateType, label: t("notification_tab"), icon: "bell" }] : []),
  ];

  const LANG_OPTIONS: { value: AppLang; label: string }[] = [
    { value: "ar", label: t("lang_ar") },
    { value: "en", label: t("lang_en") },
    { value: "fr", label: t("lang_fr") },
    { value: "pt", label: t("lang_pt") },
  ];

  const NOTIF_KEYS = [
    { key: "notif_coupon",     labelKey: "notif_coupon_label",     placeholder: t("notif_placeholders_simple") },
    { key: "notif_offre",      labelKey: "notif_offre_label",      placeholder: t("notif_placeholders") },
    { key: "notif_sale",       labelKey: "notif_sale_label",       placeholder: t("notif_placeholders_simple") },
    { key: "notif_calendrier", labelKey: "notif_calendrier_label", placeholder: t("notif_placeholders_simple") },
    { key: "notif_update",     labelKey: "notif_update_label",     placeholder: t("notif_placeholders_simple") },
    { key: "notif_cart",       labelKey: "notif_cart_label",       placeholder: t("notif_placeholders_simple") },
    { key: "notif_welcome",    labelKey: "notif_welcome_label",    placeholder: t("notif_placeholders_simple") },
  ];

  const [activeTab, setActiveTab] = useState<TemplateType>("share");
  const [selectedLang, setSelectedLang] = useState<AppLang>(language as AppLang);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [cartNoteTemplate, setCartNoteTemplate] = useState<string>("");
  const [notifTemplates, setNotifTemplates] = useState<Record<string, string>>({});
  const [selectedNotifCountry, setSelectedNotifCountry] = useState<string>("all");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });

  // Reload templates whenever selected language changes
  useEffect(() => {
    loadTemplates(selectedLang);
  }, [selectedLang]);

  useEffect(() => {
    if (!isAdmin) return;
    loadNotifTemplatesForCountry(selectedNotifCountry);
  }, [selectedNotifCountry, isAdmin]);

  const loadTemplates = async (lang: AppLang = "ar") => {
    try {
      await fetchAndCacheTemplatesFromServer(getApiUrl());
    } catch {}

    const keys: TemplateType[] = [
      "share", "details", "copyAll", "best_seller", "coin_link", "direct_link", "super_link",
      "big_save_link", "limited_link", "potential_link", "bundle_direct_link", "bundle_page_link", "trending", "cart"
    ];
    const loaded: Record<string, string> = {};
    await Promise.all(keys.map(async (key) => {
      if (key === "details")          loaded[key] = await getDetailsTemplate(lang);
      else if (key === "copyAll")     loaded[key] = await getCopyAllTemplate(lang);
      else if (key === "best_seller") loaded[key] = await getBestSellerTemplate(lang);
      else if (key === "cart")        loaded[key] = await getCartTemplate(lang);
      else if (key === "trending")    loaded[key] = await getShareTemplate("trending", lang);
      else                            loaded[key] = await getShareTemplate(key, lang);
    }));
    setTemplates(loaded);
    setCartNoteTemplate(await getCartNoteTemplate(lang));
  };

  const buildNotifKey = (baseKey: string, country: string): string =>
    country === "all" ? baseKey : `${baseKey}_${country.toLowerCase()}`;

  const loadNotifTemplatesForCountry = async (country: string) => {
    const countryKey = country === "all" ? "all" : country.toLowerCase();
    const defaults = DEFAULT_NOTIF_TEMPLATES[countryKey] ?? DEFAULT_NOTIF_TEMPLATES["all"];
    const notifLoaded: Record<string, string> = {};

    try {
      const apiUrl = getApiUrl();
      await Promise.all(NOTIF_KEYS.map(async ({ key: baseKey }) => {
        const fullKey = buildNotifKey(baseKey, country);
        const res = await fetch(new URL(`/api/admin/templates/${fullKey}`, apiUrl).href);
        if (res.ok) {
          const data = await res.json();
          notifLoaded[baseKey] = data.content || defaults[baseKey] || "";
        } else {
          notifLoaded[baseKey] = defaults[baseKey] || "";
        }
      }));
    } catch {
      NOTIF_KEYS.forEach(({ key: baseKey }) => {
        notifLoaded[baseKey] = defaults[baseKey] || "";
      });
    }

    setNotifTemplates(notifLoaded);
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };
  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const getCurrentTemplate = () => templates[activeTab] || "";
  const setCurrentTemplate = (value: string) => setTemplates(prev => ({ ...prev, [activeTab]: value }));

  const handleSave = async () => {
    try {
      if (activeTab === "notifications") {
        const apiUrl = getApiUrl();
        const results = await Promise.all(
          Object.entries(notifTemplates).map(([k, v]) =>
            fetch(new URL(`/api/admin/templates/${buildNotifKey(k, selectedNotifCountry)}`, apiUrl).href, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: v }),
            })
          )
        );
        const anyFailed = results.some(r => !r.ok);
        if (anyFailed) throw new Error("some failed");
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(t("template_synced"), "success");
        return;
      }

      const template = getCurrentTemplate();
      if (activeTab === "details")          await saveDetailsTemplate(template, selectedLang);
      else if (activeTab === "copyAll")     await saveCopyAllTemplate(template, selectedLang);
      else if (activeTab === "best_seller") await saveBestSellerTemplate(template, selectedLang);
      else if (activeTab === "cart") {
        await saveCartTemplate(template, selectedLang);
        await saveCartNoteTemplate(cartNoteTemplate, selectedLang);
      }
      else if (activeTab === "trending")    await saveShareTemplate(template, "trending", selectedLang);
      else                                  await saveShareTemplate(template, activeTab, selectedLang);

      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t("template_saved"), "success");
    } catch {
      showToast(t("error"), "error");
    }
  };

  const handleReset = () => {
    if (activeTab === "notifications") {
      const countryKey = selectedNotifCountry === "all" ? "all" : selectedNotifCountry.toLowerCase();
      const defaults = DEFAULT_NOTIF_TEMPLATES[countryKey] ?? DEFAULT_NOTIF_TEMPLATES["all"];
      const resetTemplates: Record<string, string> = {};
      NOTIF_KEYS.forEach(({ key: baseKey }) => {
        resetTemplates[baseKey] = defaults[baseKey] || "";
      });
      setNotifTemplates(resetTemplates);
      showToast(t("template_reset"), "info");
      return;
    }
    const defaultTpl = getDefaultTemplateForLang(activeTab, selectedLang)
      || getDefaultTemplateForLang(activeTab, "ar");
    setCurrentTemplate(defaultTpl);
    if (activeTab === "cart") {
      setCartNoteTemplate(
        getDefaultTemplateForLang("cart_note", selectedLang) || getDefaultTemplateForLang("cart_note", "ar")
      );
    }
    showToast(t("template_reset"), "info");
  };

  const handleSyncToDb = async () => {
    try {
      const template = getCurrentTemplate();
      const apiUrl = getApiUrl();
      // Arabic uses base key (backward compat), other langs use key_lang suffix
      const dbKey = selectedLang === "ar" ? activeTab : `${activeTab}_${selectedLang}`;
      const res = await fetch(new URL(`/api/admin/templates/${dbKey}`, apiUrl).href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: template }),
      });
      if (!res.ok) throw new Error();

      if (activeTab === "cart") {
        const cartNoteDbKey = selectedLang === "ar" ? "cart_note" : `cart_note_${selectedLang}`;
        const noteRes = await fetch(new URL(`/api/admin/templates/${cartNoteDbKey}`, apiUrl).href, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: cartNoteTemplate }),
        });
        if (!noteRes.ok) throw new Error();
      }

      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t("template_synced"), "success");
    } catch {
      showToast(t("sync_error"), "error");
    }
  };

  const insertKeyword = async (keyword: string) => {
    const currentText = getCurrentTemplate();
    const newText =
      currentText.substring(0, selection.start) +
      keyword +
      currentText.substring(selection.end);
    setCurrentTemplate(newText);
    try {
      await Clipboard.setStringAsync(keyword);
      if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`${keyword} ${t("copied_to_clipboard")}`, "success");
    } catch {}
  };

  const getPreview = () => {
    const isAr = selectedLang === "ar";
    return getCurrentTemplate()
      .replace(/{title}/g, isAr ? "عنوان المنتج كمثال" : "Sample Product Title")
      .replace(/{price}/g, "$19.99")
      .replace(/{originalPrice}/g, "$39.99")
      .replace(/{finalPrice}/g, "$14.99")
      .replace(/{finalPricetrend}/g, "$17.99")
      .replace(/{couponValue}/g, "5.00 USD")
      .replace(/{discount}/g, "50%")
      .replace(/{storeName}/g, isAr ? "اسم المتجر" : "Best Store")
      .replace(/{coin_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{direct_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{super_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{big_save_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{limited_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{potential_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{bundle_direct_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{bundle_page_link}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{trending}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{commission_rate}/g, "10%")
      .replace(/{first_level_category_name}/g, isAr ? "الإلكترونيات" : "Electronics")
      .replace(/{shopUrl}/g, "https://s.click.aliexpress.com/e/_example")
      .replace(/{coupons_summary}/g, "6/40$ => SAVE6")
      .replace(/{seller_coupon}/g, "5.00 USD")
      .replace(/{cod_1}/g, "SAVE6")
      .replace(/{cod_2}/g, "PROMO6")
      .replace(/{cod_3}/g, "DISCOUNT6")
      .replace(/{evaluateRate}/g, "4.8")
      .replace(/{orders}/g, "1500")
      .replace(/{shipping_fees}/g, t("free_shipping"))
      .replace(/{offers}/g, isAr ? "عروض متعددة متاحة..." : "Multiple Offers Available...");
  };

  const activeKeywords = getKeywordsForTemplate(activeTab);

  // ─── Reusable section header (RTL-aware) ─────────────────────────────────
  const SectionHeader = ({ icon, title, onReset }: { icon: string; title: string; onReset?: () => void }) => (
    <View style={[styles.sectionHeader, isRTL && { flexDirection: "row-reverse" }]}>
      <Feather name={icon as any} size={18} color={AppColors.primary} />
      <ThemedText type="h4" style={[styles.sectionTitle, isRTL && { marginLeft: 0, marginRight: Spacing.sm }]}>
        {title}
      </ThemedText>
      {onReset && (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.inlineResetBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Feather name="refresh-cw" size={13} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Template tabs ── */}
          <View style={styles.section}>
            <SectionHeader icon="layers" title={t("select_template")} />
            <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("choose_customization")}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrapper}>
              <View style={styles.tabsContainer}>
                {TEMPLATE_TABS.map((tab) => (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.tab,
                      { backgroundColor: activeTab === tab.key ? AppColors.primary : theme.backgroundSecondary },
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Feather name={tab.icon as any} size={16} color={activeTab === tab.key ? "#FFFFFF" : theme.text} />
                    <ThemedText type="small" style={{ color: activeTab === tab.key ? "#FFFFFF" : theme.text, fontWeight: activeTab === tab.key ? "600" : "400" }}>
                      {tab.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── Language selector (all tabs except notifications) ── */}
          {activeTab !== "notifications" && (
            <View style={styles.section}>
              <SectionHeader icon="globe" title={t("template_lang_section")} />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("template_lang_section_desc")}
              </ThemedText>
              <View style={[styles.langSelectorRow, isRTL && { flexDirection: "row-reverse" }]}>
                {LANG_OPTIONS.map((opt) => {
                  const isSelected = selectedLang === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSelectedLang(opt.value)}
                      style={[
                        styles.langChip,
                        {
                          borderColor: isSelected ? AppColors.primary : theme.border,
                          backgroundColor: isSelected ? AppColors.primary : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{ color: isSelected ? "#fff" : theme.text, fontWeight: isSelected ? "700" : "400" }}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Main template editor (all tabs except notifications) ── */}
          {activeTab !== "notifications" && (
            <View style={styles.section}>
              <SectionHeader
                icon="edit-3"
                title={t("template_editor")}
                onReset={activeTab === "cart" ? () => {
                  setCurrentTemplate(
                    getDefaultTemplateForLang("cart", selectedLang) || getDefaultTemplateForLang("cart", "ar")
                  );
                  showToast(t("template_reset"), "info");
                } : undefined}
              />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("customize_format")}
              </ThemedText>
              <View style={[styles.editorContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.editor, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
                  value={getCurrentTemplate()}
                  onChangeText={setCurrentTemplate}
                  onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                  multiline
                  textAlignVertical="top"
                  placeholder={t("paste_link")}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-template"
                  scrollEnabled
                />
              </View>
            </View>
          )}

          {/* ── Cart note editor (cart tab only) ── */}
          {activeTab === "cart" && (
            <View style={styles.section}>
              <SectionHeader
                icon="message-square"
                title={t("cart_note_editor")}
                onReset={() => {
                  setCartNoteTemplate(
                    getDefaultTemplateForLang("cart_note", selectedLang) || getDefaultTemplateForLang("cart_note", "ar")
                  );
                  showToast(t("template_reset"), "info");
                }}
              />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("cart_note_editor_desc")}
              </ThemedText>
              <View style={[styles.editorContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, minHeight: 100 }]}>
                <TextInput
                  style={[styles.editor, { color: theme.text, textAlign: isRTL ? "right" : "left", minHeight: 80 }]}
                  value={cartNoteTemplate}
                  onChangeText={setCartNoteTemplate}
                  multiline
                  textAlignVertical="top"
                  placeholder={getDefaultTemplateForLang("cart_note", selectedLang)}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-cart-note-template"
                  scrollEnabled
                />
              </View>
            </View>
          )}

          {/* ── Notifications tab ── */}
          {activeTab === "notifications" && (
            <View style={styles.section}>
              <SectionHeader icon="bell" title={t("notification_tab")} />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("notif_placeholders")}
              </ThemedText>

              {/* Country selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.md }}
              >
                {[{ value: "all" as const, labelKey: "filter_all" as const }, ...SHIPPING_COUNTRIES].map((c) => {
                  const isSelected = selectedNotifCountry === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setSelectedNotifCountry(c.value)}
                      style={[
                        styles.countryChip,
                        { borderColor: isSelected ? AppColors.primary : theme.border },
                        isSelected && { backgroundColor: AppColors.primary },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{ color: isSelected ? "#fff" : theme.text, fontWeight: isSelected ? "700" : "400" }}
                      >
                        {t(c.labelKey as any)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {NOTIF_KEYS.map((item) => (
                <View key={item.key} style={{ marginBottom: Spacing.md }}>
                  <View style={[styles.notifLabelRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <ThemedText type="small" style={{ fontWeight: "600", textAlign: isRTL ? "right" : "left", flex: 1 }}>
                      {t(item.labelKey as any)}
                    </ThemedText>
                    <Pressable
                      onPress={() => {
                        setNotifTemplates(prev => ({ ...prev, [item.key]: "" }));
                        showToast(t("template_reset"), "info");
                      }}
                      style={({ pressed }) => [styles.inlineResetBtn, { opacity: pressed ? 0.6 : 1 }]}
                      hitSlop={8}
                    >
                      <Feather name="refresh-cw" size={13} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={[styles.notifEditorContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.notifEditor, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
                      value={notifTemplates[item.key] ?? ""}
                      onChangeText={(v) => setNotifTemplates(prev => ({ ...prev, [item.key]: v }))}
                      multiline
                      textAlignVertical="top"
                      placeholder={item.placeholder}
                      placeholderTextColor={theme.textSecondary}
                      scrollEnabled={false}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Keywords ── */}
          {activeTab !== "notifications" && (
            <View style={styles.section}>
              <SectionHeader icon="hash" title={t("available_keywords")} />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("tap_keyword")}
              </ThemedText>
              <View style={styles.keywordsContainer}>
                {activeKeywords.map((item) => (
                  <Pressable
                    key={item.key}
                    style={({ pressed }) => [styles.keywordChip, { backgroundColor: theme.backgroundSecondary }, pressed && styles.pressed]}
                    onPress={() => insertKeyword(item.key)}
                  >
                    <ThemedText type="small" style={{ color: AppColors.primary }}>{item.key}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ── Preview ── */}
          {activeTab !== "notifications" && (
            <View style={styles.section}>
              <SectionHeader icon="eye" title={t("preview")} />
              <View style={[styles.previewContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <ThemedText type="small" style={[styles.previewText, { textAlign: selectedLang === "ar" ? "right" : "left" }]}>
                  {getPreview()}
                </ThemedText>
              </View>
            </View>
          )}

          {/* ── Action buttons ── */}
          <View style={[styles.buttonRow, isRTL && { flexDirection: "row-reverse" }]}>
            <Pressable
              style={({ pressed }) => [styles.resetButton, { borderColor: theme.border }, pressed && styles.pressed]}
              onPress={handleReset}
              testID="button-reset-template"
            >
              <Feather name="refresh-cw" size={18} color={theme.text} />
              <ThemedText type="body">{t("reset")}</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              onPress={handleSave}
              testID="button-save-template"
            >
              <Feather name="save" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={styles.saveButtonText}>{t("save_template")}</ThemedText>
            </Pressable>
          </View>

          {isAdmin && (
            <Pressable
              style={({ pressed }) => [styles.syncDbButton, pressed && styles.pressed]}
              onPress={handleSyncToDb}
              testID="button-sync-to-db"
            >
              <Feather name="database" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={styles.saveButtonText}>{t("sync_to_db")}</ThemedText>
            </Pressable>
          )}

          {/* ── Keyword reference ── */}
          {activeTab !== "notifications" && (
            <View style={styles.section}>
              <SectionHeader icon="book-open" title={t("keyword_reference")} />
              <ThemedText type="small" style={[styles.sectionDescription, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("keyword_reference_desc")}
              </ThemedText>
              <View style={[styles.referenceContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                {activeKeywords.map((item, index) => (
                  <View
                    key={item.key}
                    style={[
                      styles.referenceRow,
                      isRTL && { flexDirection: "row-reverse" },
                      index < activeKeywords.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    ]}
                  >
                    <ThemedText type="small" style={[styles.referenceKey, { color: AppColors.primary }]}>
                      {item.key}
                    </ThemedText>
                    <ThemedText type="small" style={[styles.referenceDesc, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                      {t(item.descKey as any)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <SocialLinks />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: { marginLeft: Spacing.sm, flex: 1 },
  sectionDescription: { marginBottom: Spacing.md },
  tabsWrapper: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tab: {
    minWidth: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  langSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  langChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: "center",
  },
  editorContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 200,
  },
  editor: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    lineHeight: 20,
    minHeight: 180,
  },
  notifEditorContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  notifEditor: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    lineHeight: 20,
    minHeight: 60,
  },
  countryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  notifLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: Spacing.sm,
  },
  inlineResetBtn: {
    padding: 3,
    borderRadius: 4,
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  keywordChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  previewText: { lineHeight: 22 },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "600" },
  syncDbButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  referenceContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  referenceKey: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
    minWidth: 120,
    fontWeight: "600",
  },
  referenceDesc: { flex: 1, fontSize: 13 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
