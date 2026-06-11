import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getSettings, saveSettings, AppSettings, DEFAULT_SETTINGS } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import * as Notifications from "expo-notifications";
import { openSettings } from "expo-linking";
import { SHIPPING_COUNTRIES, PRODUCT_LANGUAGES } from "@/constants/countries";
import type { DrawerParamList } from "@/navigation/DrawerNavigator";

type ModalType = "appearance" | "language" | "country" | "offers" | "productLanguage" | "notifications" | null;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setThemeMode } = useThemeContext();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

  const COUNTRIES = SHIPPING_COUNTRIES.map((c) => ({
    label: t(c.labelKey as any),
    value: c.value,
    currency: c.currency,
  }));

  const PRODUCT_LANGUAGE_OPTIONS = PRODUCT_LANGUAGES.map((l) => ({
    value: l.value,
    label: t(l.labelKey as any),
  }));

  const OFFER_TYPES = [
    { key: "coin_link", label: t("coin_link") },
    { key: "direct_link", label: t("direct_link") },
    { key: "super_link", label: t("super_link") },
    { key: "big_save_link", label: t("big_save_link") },
    { key: "limited_link", label: t("limited_link") },
    { key: "potential_link", label: t("potential_link") },
    { key: "bundle_direct_link", label: t("bundle_direct_link") },
    { key: "bundle_page_link", label: t("bundle_page_link") },
  ];

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await getSettings();
    setSettings(savedSettings);
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(settings);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("settings_saved"), "success");
      if (user?.id) {
        fetch(`${getApiUrl()}/api/auth/user/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: settings.country }),
        }).catch(() => {});
      }
    } catch {
      showToast(t("error"), "error");
    }
  };

  const updateNotifOffers = async (val: boolean) => {
    const next = { ...settings, notifyOffers: val };
    setSettings(next);
    await saveSettings(next);
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "6a569cd5-9b06-4750-95c1-8f65687e521b",
        });
        await fetch(`${getApiUrl()}/api/push-token/preferences`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenData.data, notifyOffers: val }),
        });
      }
    } catch {}
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "theme") setThemeMode(value as any).catch(console.error);
      if (key === "language") setLanguage(value as any).catch(console.error);
      return next;
    });
  };

  const toggleOffer = (key: string) => {
    setSettings((prev) => {
      const current = prev.enabledOffers || [];
      const updated = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, enabledOffers: updated };
    });
  };

  const isRtl = language === "ar";
  const rowDirection = isRtl ? "row-reverse" : "row";

  const selectedCountryLabel =
    COUNTRIES.find((c) => c.value === settings.country)?.label ?? "";

  const themeIcon: Record<string, keyof typeof Feather.glyphMap> = {
    light: "sun",
    dark: "moon",
    system: "smartphone",
  };

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.accountCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              flexDirection: rowDirection,
            },
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("AccountInfo")}
          testID="button-account-info"
        >
          <View style={[styles.accountAvatar, { backgroundColor: `${AppColors.primary}15` }]}>
            <ThemedText type="h4" style={{ color: AppColors.primary }}>
              {(user?.firstName?.[0] || "").toUpperCase()}
              {(user?.lastName?.[0] || "").toUpperCase()}
            </ThemedText>
          </View>
          <View style={[styles.accountDetails, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {user?.firstName} {user?.lastName}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {user?.email}
            </ThemedText>
          </View>
          <Feather
            name={isRtl ? "chevron-left" : "chevron-right"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        <SettingRow
          icon="sun"
          label={t("appearance")}
          value={t(settings.theme)}
          onPress={() => setActiveModal("appearance")}
          isRtl={isRtl}
          theme={theme}
        />

        <SettingRow
          icon="globe"
          label={t("language")}
          value={
            settings.language === "ar" ? t("arabic") :
            settings.language === "fr" ? t("french") :
            settings.language === "pt" ? t("portuguese") :
            t("english")
          }
          onPress={() => setActiveModal("language")}
          isRtl={isRtl}
          theme={theme}
        />

        <SettingRow
          icon="map-pin"
          label={t("shipping_country")}
          value={`${selectedCountryLabel} (${settings.currency})`}
          onPress={() => setActiveModal("country")}
          isRtl={isRtl}
          theme={theme}
        />

        <SettingRow
          icon="type"
          label={t("product_language")}
          value={
            PRODUCT_LANGUAGE_OPTIONS.find((l) => l.value === settings.productLanguage)?.label ??
            settings.productLanguage
          }
          onPress={() => setActiveModal("productLanguage")}
          isRtl={isRtl}
          theme={theme}
        />

        <SettingRow
          icon="list"
          label={t("enabled_offers")}
          value={`${settings.enabledOffers?.length ?? 0} / ${OFFER_TYPES.length}`}
          onPress={() => setActiveModal("offers")}
          isRtl={isRtl}
          theme={theme}
        />

        <SettingRow
          icon="bell"
          label={t("notifications")}
          value={settings.notificationsEnabled !== false ? t("notifications_enabled") : t("notifications_disabled")}
          onPress={() => setActiveModal("notifications")}
          isRtl={isRtl}
          theme={theme}
        />

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            { flexDirection: rowDirection },
          ]}
          onPress={handleSave}
          testID="button-save-settings"
        >
          <Feather name="save" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={styles.saveButtonText}>
            {t("save_settings")}
          </ThemedText>
        </Pressable>

        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
            <Feather name="info" size={18} color={AppColors.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              {t("about")}
            </ThemedText>
          </View>
          <View style={[styles.aboutCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <View style={[styles.aboutRow, { flexDirection: rowDirection }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("version")}
              </ThemedText>
              <ThemedText type="body">1.1.0</ThemedText>
            </View>
            <View style={[styles.aboutRow, { flexDirection: rowDirection }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("developer")}
              </ThemedText>
              <ThemedText type="body">Rabah Coupons</ThemedText>
            </View>
          </View>
        </View>

        <SocialLinks />
      </ScrollView>

      <SettingsModal
        visible={activeModal === "appearance"}
        title={t("appearance")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={[styles.themeContainer, { flexDirection: rowDirection }]}>
          {(["light", "dark", "system"] as const).map((val) => (
            <Pressable
              key={val}
              style={({ pressed }) => [
                styles.themeOption,
                {
                  backgroundColor:
                    settings.theme === val
                      ? `${AppColors.primary}15`
                      : theme.backgroundDefault,
                  borderColor: settings.theme === val ? AppColors.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => updateSetting("theme", val)}
            >
              <Feather
                name={themeIcon[val]}
                size={20}
                color={settings.theme === val ? AppColors.primary : theme.textSecondary}
              />
              <ThemedText
                type="small"
                style={[styles.themeLabel, settings.theme === val && { color: AppColors.primary }]}
              >
                {t(val)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === "language"}
        title={t("language")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={[styles.languageContainer, { flexDirection: rowDirection }]}>
          {(["en", "ar", "fr", "pt"] as const).map((val) => (
            <Pressable
              key={val}
              style={({ pressed }) => [
                styles.languageOption,
                {
                  backgroundColor:
                    settings.language === val
                      ? `${AppColors.primary}15`
                      : theme.backgroundDefault,
                  borderColor: settings.language === val ? AppColors.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => updateSetting("language", val)}
            >
              <ThemedText
                type="body"
                style={settings.language === val ? { color: AppColors.primary } : undefined}
              >
                {val === "ar" ? t("arabic") : val === "fr" ? t("french") : val === "pt" ? t("portuguese") : t("english")}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === "country"}
        title={t("shipping_country")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={styles.countryList}>
          {COUNTRIES.map((c) => (
            <Pressable
              key={c.value}
              style={({ pressed }) => [
                styles.countryOption,
                {
                  backgroundColor:
                    settings.country === c.value
                      ? `${AppColors.primary}15`
                      : theme.backgroundDefault,
                  borderColor:
                    settings.country === c.value ? AppColors.primary : theme.border,
                  flexDirection: rowDirection,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                updateSetting("country", c.value);
                updateSetting("currency", c.currency);
              }}
            >
              <ThemedText
                style={settings.country === c.value ? { color: AppColors.primary } : undefined}
              >
                {c.label} ({c.currency})
              </ThemedText>
              {settings.country === c.value && (
                <Feather name="check" size={18} color={AppColors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === "productLanguage"}
        title={t("product_language")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={styles.countryList}>
          {PRODUCT_LANGUAGE_OPTIONS.map((l) => (
            <Pressable
              key={l.value}
              style={({ pressed }) => [
                styles.countryOption,
                {
                  backgroundColor:
                    settings.productLanguage === l.value
                      ? `${AppColors.primary}15`
                      : theme.backgroundDefault,
                  borderColor:
                    settings.productLanguage === l.value ? AppColors.primary : theme.border,
                  flexDirection: rowDirection,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => updateSetting("productLanguage", l.value)}
              testID={`product-language-${l.value}`}
            >
              <ThemedText
                style={settings.productLanguage === l.value ? { color: AppColors.primary } : undefined}
              >
                {l.label} ({l.value})
              </ThemedText>
              {settings.productLanguage === l.value && (
                <Feather name="check" size={18} color={AppColors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === "offers"}
        title={t("enabled_offers")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={[styles.aboutCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          {OFFER_TYPES.map((offer) => (
            <View
              key={offer.key}
              style={[styles.aboutRow, { flexDirection: rowDirection }]}
            >
              <ThemedText type="body">{offer.label}</ThemedText>
              <Switch
                value={settings.enabledOffers?.includes(offer.key)}
                onValueChange={() => toggleOffer(offer.key)}
                trackColor={{ true: AppColors.primary }}
              />
            </View>
          ))}
        </View>
      </SettingsModal>

      <SettingsModal
        visible={activeModal === "notifications"}
        title={t("notifications")}
        onClose={() => setActiveModal(null)}
        theme={theme}
        isRtl={isRtl}
      >
        <View style={[styles.aboutCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={[styles.aboutRow, { flexDirection: rowDirection }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body">{t("notifications_enabled")}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {t("notifications_desc")}
              </ThemedText>
            </View>
            <Switch
              value={settings.notificationsEnabled !== false}
              onValueChange={async (val) => {
                const next = { ...settings, notificationsEnabled: val };
                setSettings(next);
                await saveSettings(next);
                try {
                  const { status } = await Notifications.getPermissionsAsync();
                  if (val && status === "granted") {
                    const tokenData = await Notifications.getExpoPushTokenAsync({
                      projectId: "6a569cd5-9b06-4750-95c1-8f65687e521b",
                    });
                    await fetch(`${getApiUrl()}/api/push-token`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token: tokenData.data }),
                    });
                  } else if (!val) {
                    if (status === "granted") {
                      const tokenData = await Notifications.getExpoPushTokenAsync({
                        projectId: "6a569cd5-9b06-4750-95c1-8f65687e521b",
                      });
                      await fetch(`${getApiUrl()}/api/push-token`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token: tokenData.data }),
                      });
                    } else {
                      openSettings();
                    }
                  }
                } catch {}
              }}
              trackColor={{ true: AppColors.primary }}
            />
          </View>
          {settings.notificationsEnabled !== false && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={[styles.aboutRow, { flexDirection: rowDirection }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body">{t("notify_offers")}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {t("notify_offers_desc")}
                  </ThemedText>
                </View>
                <Switch
                  value={settings.notifyOffers !== false}
                  onValueChange={updateNotifOffers}
                  trackColor={{ true: AppColors.primary }}
                />
              </View>
            </>
          )}
        </View>
      </SettingsModal>
    </ThemedView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  isRtl,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  isRtl: boolean;
  theme: any;
}) {
  const rowDirection = isRtl ? "row-reverse" : "row";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          flexDirection: rowDirection,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingRowLeft, { flexDirection: rowDirection }]}>
        <Feather name={icon} size={18} color={AppColors.primary} />
        <ThemedText type="body" style={styles.settingRowLabel}>
          {label}
        </ThemedText>
      </View>
      <View style={[styles.settingRowRight, { flexDirection: rowDirection }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {value}
        </ThemedText>
        <Feather
          name={isRtl ? "chevron-left" : "chevron-right"}
          size={16}
          color={theme.textSecondary}
        />
      </View>
    </Pressable>
  );
}

function SettingsModal({
  visible,
  title,
  onClose,
  theme,
  isRtl,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  theme: any;
  isRtl: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.modalHeader, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <ThemedText type="h4">{title}</ThemedText>
            <Pressable onPress={onClose} style={styles.modalClose} hitSlop={12}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginHorizontal: Spacing.sm,
  },
  settingRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  settingRowLeft: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingRowLabel: {
    fontWeight: "500",
  },
  settingRowRight: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  themeContainer: {
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  themeLabel: {
    fontWeight: "500",
  },
  languageContainer: {
    gap: Spacing.sm,
  },
  languageOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  countryList: {
    gap: Spacing.sm,
  },
  countryOption: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },
  aboutCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  aboutRow: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  accountCard: {
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  accountDetails: {
    flex: 1,
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
