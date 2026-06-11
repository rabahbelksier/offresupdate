import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { actualTheme } = useThemeContext();
  const isDark = actualTheme === "dark";
  const theme = Colors[actualTheme];

  return {
    theme,
    isDark,
  };
}
