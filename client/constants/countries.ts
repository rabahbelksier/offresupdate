import type { ProductLanguage } from "@/lib/storage";

export interface ShippingCountry {
  value: string;
  currency: string;
  labelKey: string;
  labelEn: string;
  labelAr: string;
}

export const SHIPPING_COUNTRIES: ShippingCountry[] = [
  { value: "DZ", currency: "USD", labelKey: "algeria",       labelEn: "Algeria",        labelAr: "الجزائر" },
  { value: "FR", currency: "EUR", labelKey: "france",        labelEn: "France",         labelAr: "فرنسا" },
  { value: "ES", currency: "EUR", labelKey: "spain",         labelEn: "Spain",          labelAr: "إسبانيا" },
  { value: "SA", currency: "SAR", labelKey: "saudi_arabia",  labelEn: "Saudi Arabia",   labelAr: "السعودية" },
  { value: "BR", currency: "BRL", labelKey: "brazil",        labelEn: "Brazil",         labelAr: "البرازيل" },
  { value: "US", currency: "USD", labelKey: "usa",           labelEn: "USA",            labelAr: "الولايات المتحدة" },
  { value: "CA", currency: "CAD", labelKey: "canada",        labelEn: "Canada",         labelAr: "كندا" },
  { value: "DE", currency: "EUR", labelKey: "germany",       labelEn: "Germany",        labelAr: "ألمانيا" },
  { value: "IT", currency: "EUR", labelKey: "italy",         labelEn: "Italy",          labelAr: "إيطاليا" },
  { value: "AE", currency: "AED", labelKey: "uae",           labelEn: "United Arab Emirates", labelAr: "الإمارات العربية المتحدة" },
  { value: "KR", currency: "KRW", labelKey: "korea",         labelEn: "South Korea",    labelAr: "كوريا الجنوبية" },
];

export const SHIPPING_COUNTRY_CODES_LOWER: string[] =
  SHIPPING_COUNTRIES.map((c) => c.value.toLowerCase());

export interface ProductLanguageOption {
  value: ProductLanguage;
  labelKey: string;
  labelEn: string;
  labelAr: string;
}

export const PRODUCT_LANGUAGES: ProductLanguageOption[] = [
  { value: "AR", labelKey: "lang_ar", labelEn: "Arabic",     labelAr: "العربية" },
  { value: "EN", labelKey: "lang_en", labelEn: "English",    labelAr: "الإنجليزية" },
  { value: "FR", labelKey: "lang_fr", labelEn: "French",     labelAr: "الفرنسية" },
  { value: "PT", labelKey: "lang_pt", labelEn: "Portuguese", labelAr: "البرتغالية" },
  { value: "ES", labelKey: "lang_es", labelEn: "Spanish",    labelAr: "الإسبانية" },
  { value: "KO", labelKey: "lang_ko", labelEn: "Korean",     labelAr: "الكورية" },
  { value: "DE", labelKey: "lang_de", labelEn: "German",     labelAr: "الألمانية" },
  { value: "IT", labelKey: "lang_it", labelEn: "Italian",    labelAr: "الإيطالية" },
];
