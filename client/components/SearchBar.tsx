import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  testID?: string;
  showSubmitButton?: boolean;
  submitLabelKey?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  testID,
  showSubmitButton = false,
}: SearchBarProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
            borderColor: focused ? AppColors.primary : theme.border,
            shadowOpacity: focused ? 0.12 : 0.04,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isDark
                ? "rgba(255,106,0,0.15)"
                : "rgba(255,106,0,0.08)",
            },
          ]}
        >
          <Feather name="search" size={16} color={AppColors.primary} />
        </View>

        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              // No textAlign override → cursor naturally follows the typed
              // language direction (LTR cursor for English, RTL for Arabic),
              // independent of UI language.
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          underlineColorAndroid="transparent"
          testID={testID}
        />

        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText("")}
            hitSlop={10}
            style={styles.clearBtn}
            testID={testID ? `${testID}-clear` : undefined}
          >
            <Feather name="x" size={14} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showSubmitButton ? (
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onSubmit}
          testID={testID ? `${testID}-submit` : undefined}
        >
          <Feather name="search" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bar: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderRadius: BorderRadius.full ?? 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    minHeight: 24,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    shadowColor: AppColors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
});
