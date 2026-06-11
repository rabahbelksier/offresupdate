import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import LoginScreen from "@/screens/auth/LoginScreen";
import RegisterScreen from "@/screens/auth/RegisterScreen";
import AboutAppScreen from "@/screens/AboutAppScreen";
import AppGuideScreen from "@/screens/AppGuideScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import DisclaimerScreen from "@/screens/DisclaimerScreen";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing } from "@/constants/theme";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  AuthAboutApp: undefined;
  AuthAppGuide: undefined;
  AuthPrivacyPolicy: undefined;
  AuthDisclaimer: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="AuthAboutApp"
        component={AboutAppScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: t("about_app"),
          headerStyle: { backgroundColor: theme.backgroundRoot },
          headerTintColor: theme.text,
          headerTitleAlign: "center" as const,
          headerLeft: () => (
            <Pressable
              style={{ padding: Spacing.sm }}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="AuthAppGuide"
        component={AppGuideScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: t("app_guide"),
          headerStyle: { backgroundColor: theme.backgroundRoot },
          headerTintColor: theme.text,
          headerTitleAlign: "center" as const,
          headerLeft: () => (
            <Pressable
              style={{ padding: Spacing.sm }}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="AuthPrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: t("privacy_policy"),
          headerStyle: { backgroundColor: theme.backgroundRoot },
          headerTintColor: theme.text,
          headerTitleAlign: "center" as const,
          headerLeft: () => (
            <Pressable
              style={{ padding: Spacing.sm }}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="AuthDisclaimer"
        component={DisclaimerScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: t("disclaimer"),
          headerStyle: { backgroundColor: theme.backgroundRoot },
          headerTintColor: theme.text,
          headerTitleAlign: "center" as const,
          headerLeft: () => (
            <Pressable
              style={{ padding: Spacing.sm }}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
