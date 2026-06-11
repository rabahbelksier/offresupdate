import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSettings, saveSettings } from "@/lib/storage";
import { Language, translations } from "@/constants/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const settings = await getSettings();
    if (settings.language) {
      setLanguageState(settings.language);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    const settings = await getSettings();
    await saveSettings({ ...settings, language: lang });
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
