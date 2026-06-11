import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Share, Image, AppState } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "@/screens/HomeScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import MessageDesignScreen from "@/screens/MessageDesignScreen";
import CouponCodesScreen from "@/screens/CouponCodesScreen";
import CalendrierScreen from "@/screens/CalendrierScreen";
import CoinScreen from "@/screens/CoinScreen";
import AppGuideScreen from "@/screens/AppGuideScreen";
import AboutAppScreen from "@/screens/AboutAppScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import DisclaimerScreen from "@/screens/DisclaimerScreen";
import SavedItemsScreen from "@/screens/SavedItemsScreen";
import AccountInfoScreen from "@/screens/AccountInfoScreen";
import SubscribersScreen from "@/screens/SubscribersScreen";
import AdminOtherScreen from "@/screens/admin/AdminOtherScreen";
import AdminNotifyScreen from "@/screens/admin/AdminNotifyScreen";
import UserOfferRequestScreen from "@/screens/UserOfferRequestScreen";
import AdminOfferRequestsScreen from "@/screens/admin/AdminOfferRequestsScreen";
import { ThemedText } from "@/components/ThemedText";
import { SocialLinks } from "@/components/SocialLinks";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

import { useLanguage } from "@/contexts/LanguageContext";
import { getApiUrl } from "@/lib/query-client";
import { getCachedShareAppContent, fetchShareAppContentFromApi } from "@/lib/storage";

export type DrawerParamList = {
  Home: { resetTab?: number } | undefined;
  History: undefined;
  SavedItems: undefined;
  Settings: undefined;
  AccountInfo: undefined;
  MessageDesign: undefined;
  CouponCodes: undefined;
  Calendrier: undefined;
  Coin: undefined;
  AboutApp: undefined;
  AppGuide: undefined;
  PrivacyPolicy: undefined;
  Disclaimer: undefined;
  Subscribers: undefined;
  Other: undefined;
  NotifySubscribers: undefined;
  OfferRequest: undefined;
  AdminOfferRequestsDrawer: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

interface DrawerItemProps {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  isActive: boolean;
  onPress: () => void;
}

function DrawerItem({ label, icon, isActive, onPress }: DrawerItemProps) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.drawerItem,
        isActive && {
          backgroundColor: isDark ? "rgba(255,106,0,0.12)" : "rgba(255,106,0,0.08)",
        },
        pressed && styles.drawerItemPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.drawerIconWrap,
          isActive && { backgroundColor: isDark ? "rgba(255,106,0,0.2)" : "rgba(255,106,0,0.14)" },
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={isActive ? AppColors.primary : theme.textSecondary}
        />
      </View>
      <ThemedText
        type="small"
        style={[
          styles.drawerLabel,
          { color: isActive ? AppColors.primary : theme.text },
          isActive && { fontWeight: "700" },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const { logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;

  type MenuItem = { name: keyof DrawerParamList; label: string; icon: keyof typeof Feather.glyphMap };

  const topItems: MenuItem[] = [
    { name: "Home", label: t("home"), icon: "home" },
    { name: "Settings", label: t("settings"), icon: "settings" },
    { name: "CouponCodes", label: t("coupon_codes"), icon: "tag" },
    { name: "Calendrier", label: t("sales_calendar"), icon: "calendar" },
  ];

  const userOnlyItems: MenuItem[] = [
    { name: "OfferRequest", label: t("ai_offer_request"), icon: "cpu" },
  ];

  const bottomItems: MenuItem[] = [
    { name: "Coin", label: t("coin_collection"), icon: "circle" },
    { name: "SavedItems", label: t("saved_items"), icon: "bookmark" },
    { name: "History", label: t("history"), icon: "clock" },
    { name: "AboutApp", label: t("about_app"), icon: "info" },
  ];

  const adminMenuItems: MenuItem[] = [
    { name: "Subscribers", label: t("subscribers"), icon: "users" },
    { name: "MessageDesign", label: t("template_design"), icon: "edit-3" },
    { name: "Other", label: t("other"), icon: "grid" },
    { name: "NotifySubscribers", label: t("notify_subscribers"), icon: "bell" },
    { name: "AdminOfferRequestsDrawer", label: t("admin_offer_requests"), icon: "inbox" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        { backgroundColor: theme.backgroundRoot, flexGrow: 1 },
      ]}
    >
      <View style={[styles.drawerContent, { flex: 1 }]}>
        <LinearGradient
          colors={["rgba(255,106,0,0.14)", "rgba(255,106,0,0.04)", "transparent"]}
          style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require("../../assets/images/splash-icon.png")} 
              style={styles.drawerLogo}
              resizeMode="contain"
            />
          </View>
          <ThemedText type="h2" style={styles.appName}>
            Offers 365
          </ThemedText>
        </LinearGradient>

        <View style={styles.menuContainer}>
          {[...topItems, ...(isAdmin ? [] : userOnlyItems), ...bottomItems].map((item) => {
            const activeRouteName = state.routeNames[state.index];
            return (
              <DrawerItem
                key={item.name}
                label={item.label}
                icon={item.icon}
                isActive={activeRouteName === item.name}
                onPress={() => {
                  if (item.name === "Home") {
                    (navigation as any).navigate("Home", { resetTab: Date.now() });
                  } else {
                    navigation.navigate(item.name);
                  }
                }}
              />
            );
          })}
          {isAdmin && (
            <>
              <View style={[styles.adminDivider, { borderColor: theme.border }]}>
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "700", fontSize: 10 }}>
                  ADMIN
                </ThemedText>
              </View>
              {adminMenuItems.map((item) => {
                const activeRouteName = state.routeNames[state.index];
                return (
                  <DrawerItem
                    key={item.name}
                    label={item.label}
                    icon={item.icon}
                    isActive={activeRouteName === item.name}
                    onPress={() => navigation.navigate(item.name)}
                  />
                );
              })}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <SocialLinks />
          
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: theme.border },
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleLogout}
            testID="button-logout"
          >
            <Feather name="log-out" size={20} color={AppColors.error} />
            <ThemedText type="body" style={styles.logoutText}>
              {t("logout")}
            </ThemedText>
          </Pressable>

          <ThemedText
            type="caption"
            style={[styles.version, { color: theme.textSecondary }]}
          >
            {t("version")} 1.1.0
          </ThemedText>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [shareContent, setShareContent] = useState("");
  const lastFetchRef = useRef<number>(0);

  const lang = language === "ar" ? "ar" : "en";

  useEffect(() => {
    let mounted = true;
    const REFRESH_INTERVAL = 5 * 60 * 1000;

    const loadContent = async (forceApi = false) => {
      const cached = await getCachedShareAppContent(lang);
      if (mounted && cached) setShareContent(cached);

      const now = Date.now();
      if (!forceApi && now - lastFetchRef.current < REFRESH_INTERVAL) return;

      const apiUrl = getApiUrl();
      const fresh = await fetchShareAppContentFromApi(apiUrl, lang);
      if (mounted && fresh) {
        setShareContent(fresh);
        lastFetchRef.current = Date.now();
      }
    };

    loadContent(true);

    const interval = setInterval(() => loadContent(true), REFRESH_INTERVAL);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadContent();
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [lang]);

  const shareApp = async () => {
    const fallback = language === "ar"
      ? "🚀 اكتشف أفضل العروض والتخفيضات يومياً مع Offres 365 \n 🔥 وفر أكثر وتسوق بذكاء من AliExpress \n 📲 حمّل التطبيق الآن: \n https://offres365_page.up.railway.app"
      : "🚀 Discover the best daily deals with Offres 365 \n 🔥 Save more and shop smarter on AliExpress \n 📲 Download now: \n https://offres365page.up.railway.app";

    const message = shareContent || fallback;

    try {
      await Share.share({ message });
    } catch {}
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation: nav }) => ({
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        headerTintColor: theme.text,
        headerTitleAlign: "center",
        drawerStyle: {
          backgroundColor: theme.backgroundRoot,
          width: 280,
        },
        headerLeft: () => (
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              { marginLeft: Spacing.sm },
              pressed && styles.headerButtonPressed,
            ]}
            onPress={() => nav.toggleDrawer()}
            testID="button-hamburger"
          >
            <Feather name="menu" size={24} color={theme.text} />
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={shareApp}
          >
            <Feather name="share-2" size={22} color={AppColors.primary} />
          </Pressable>
        ),
      })}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Image 
                source={require("../../assets/images/splash-icon.png")} 
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <ThemedText type="h3" style={styles.headerTitle}>
                Offers 365
              </ThemedText>
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerTitle: t("history"),
        }}
      />
      <Drawer.Screen
        name="SavedItems"
        component={SavedItemsScreen}
        options={{
          headerTitle: t("saved_items"),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: t("settings"),
        }}
      />
      <Drawer.Screen
        name="MessageDesign"
        component={MessageDesignScreen}
        options={{
          headerTitle: t("message_design"),
        }}
      />
      <Drawer.Screen
        name="CouponCodes"
        component={CouponCodesScreen}
        options={{
          headerTitle: t("coupon_codes"),
        }}
      />
      <Drawer.Screen
        name="Calendrier"
        component={CalendrierScreen}
        options={{
          headerTitle: t("sales_calendar"),
        }}
      />
      <Drawer.Screen
        name="Coin"
        component={CoinScreen}
        options={{
          headerTitle: t("coin_collection"),
        }}
      />
      <Drawer.Screen
        name="AboutApp"
        component={AboutAppScreen}
        options={{
          headerTitle: t("about_app"),
        }}
      />
      <Drawer.Screen
        name="AppGuide"
        component={AppGuideScreen}
        options={({ navigation: nav }) => ({
          headerTitle: t("app_guide"),
          drawerItemStyle: { display: "none" },
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [styles.headerButton, { marginLeft: Spacing.md }, pressed && styles.headerButtonPressed]}
              onPress={() => nav.navigate("AboutApp")}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Drawer.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={({ navigation: nav }) => ({
          headerTitle: t("privacy_policy"),
          drawerItemStyle: { display: "none" },
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [styles.headerButton, { marginLeft: Spacing.md }, pressed && styles.headerButtonPressed]}
              onPress={() => nav.navigate("AboutApp")}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Drawer.Screen
        name="Disclaimer"
        component={DisclaimerScreen}
        options={({ navigation: nav }) => ({
          headerTitle: t("disclaimer"),
          drawerItemStyle: { display: "none" },
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [styles.headerButton, { marginLeft: Spacing.md }, pressed && styles.headerButtonPressed]}
              onPress={() => nav.navigate("AboutApp")}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Drawer.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{
          headerTitle: t("account_info"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Subscribers"
        component={SubscribersScreen}
        options={{
          headerTitle: t("subscribers"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="Other"
        component={AdminOtherScreen}
        options={{
          headerTitle: t("other"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="NotifySubscribers"
        component={AdminNotifyScreen}
        options={{
          headerTitle: t("notify_subscribers"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="OfferRequest"
        component={UserOfferRequestScreen}
        options={{
          headerTitle: t("ai_offer_request"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="AdminOfferRequestsDrawer"
        component={AdminOfferRequestsScreen}
        options={{
          headerTitle: t("admin_offer_requests"),
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["2xl"],
    alignItems: "center",
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: `${AppColors.primary}18`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    color: AppColors.primary,
    marginBottom: Spacing.xs,
    fontWeight: "800",
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: 2,
    gap: Spacing.md,
  },
  drawerItemPressed: {
    opacity: 0.65,
  },
  drawerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerLabel: {
    flex: 1,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    marginTop: Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  logoutButtonPressed: {
    opacity: 0.65,
  },
  logoutText: {
    color: AppColors.error,
    fontWeight: "500",
  },
  version: {
    textAlign: "center",
  },
  headerButton: {
    marginRight: Spacing.lg,
    padding: Spacing.sm,
  },
  headerButtonPressed: {
    opacity: 0.7,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    marginLeft: Spacing.sm,
    color: AppColors.primary,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  drawerLogo: {
    width: 64,
    height: 64,
  },
  adminDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
});
