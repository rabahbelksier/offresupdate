import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Platform, Linking } from "react-native";
import { NavigationContainer, NavigationState, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, getApiUrl } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdatePopup } from "@/components/UpdatePopup";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import { LanguageProvider } from "@/contexts/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchAndCacheTemplatesFromServer, getSettings } from "@/lib/storage";
import { initFacebook, logAppActivation, logScreenView } from "@/lib/facebook";

SplashScreen.preventAutoHideAsync();

// Register Android notification channel at module level (before any component mounts).
// We use a versioned channel ID ("offers365_v2") so Android creates a fresh channel
// with the correct sound setting — existing channels cannot have their sound changed.
if (Platform.OS === "android") {
  Notifications.deleteNotificationChannelAsync("default").catch(() => {});
  Notifications.setNotificationChannelAsync("offers365_v2", {
    name: "Offers 365",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF6A00",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
    sound: "notification",
  }).catch(() => {});
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state || !state.routes) return "";
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name || "";
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "6a569cd5-9b06-4750-95c1-8f65687e521b",
    });
    return tokenData.data;
  } catch {
    return null;
  }
}

async function saveTokenToServer(token: string, userId?: string | null): Promise<void> {
  try {
    const apiUrl = getApiUrl();
    await fetch(new URL("/api/push-token", apiUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: userId || null }),
    });
  } catch {}
}

async function deactivateTokenOnServer(token: string): Promise<void> {
  try {
    const apiUrl = getApiUrl();
    await fetch(new URL("/api/push-token", apiUrl).href, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {}
}


export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [navKey, setNavKey] = useState("");
  const navCounter = useRef(0);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const pushTokenRef = useRef<string | null>(null);

  const handleStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    navCounter.current += 1;
    setNavKey(`${routeName}-${navCounter.current}`);
    logScreenView(routeName);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    initFacebook().then(() => logAppActivation());
  }, []);

  useEffect(() => {
    fetchAndCacheTemplatesFromServer(getApiUrl()).catch(() => {});
  }, []);

  // Register push notifications and handle token
  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const settings = await getSettings();
      const token = await registerForPushNotifications();
      if (!isMounted || !token) return;

      pushTokenRef.current = token;

      let userId: string | null = null;
      try {
        const storedUser = await AsyncStorage.getItem("@offers365_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.id && !parsed?.isAdmin) userId = parsed.id;
        }
      } catch {}

      if (settings.notificationsEnabled !== false) {
        await saveTokenToServer(token, userId);
      } else {
        await deactivateTokenOnServer(token);
      }
    };

    setup().catch(() => {});

    return () => { isMounted = false; };
  }, []);

  // Handle notification tap → navigate to the relevant screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const screen = data?.screen;
      if (!screen || !navigationRef.current) return;

      setTimeout(() => {
        try {
          const nav = navigationRef.current;
          if (!nav) return;
          if (screen === "CouponCodes" || screen === "Calendrier" || screen === "Coin" || screen === "Home") {
            nav.navigate("Main" as never, { screen } as never);
          } else if (screen === "TrendingOffers") {
            nav.navigate("TrendingOffers" as never);
          } else if (screen === "OfferDetails" && data.offreId) {
            nav.navigate("OfferDetails" as never, { offer: { id: data.offreId } } as never);
          } else if (screen === "SupportChat") {
            nav.navigate("SupportChat" as never);
          } else if (screen === "UserOfferRequest") {
            nav.navigate("UserOfferRequest" as never);
          }
        } catch {}
      }, 500);
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
                      <RootStackNavigator />
                    </NavigationContainer>
                    <UpdatePopup navigationKey={navKey} />
                    <StatusBar style="auto" />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
