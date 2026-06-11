import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  RECENT_PRODUCTS: "offers365_recent_products",
  TRENDING_NOW_PAGE: "offers365_trending_now_page_",
  TRENDING_NOW_VERSION: "offers365_trending_now_version",
  TRENDING_NOW_TOTAL: "offers365_trending_now_total_",
  SETTINGS: "offers365_settings",
  MESSAGE_TEMPLATE: "offers365_message_template",
  SHARE_TEMPLATE: "offers365_share_template",
  DETAILS_TEMPLATE: "offers365_details_template",
  COPY_ALL_TEMPLATE: "offers365_copy_all_template",
  TRENDING_SHARE_TEMPLATE: "offers365_trending_share_template",
  COIN_LINK_TEMPLATE: "offers365_coin_link_template",
  DIRECT_LINK_TEMPLATE: "offers365_direct_link_template",
  SUPER_LINK_TEMPLATE: "offers365_super_link_template",
  BIG_SAVE_LINK_TEMPLATE: "offers365_big_save_link_template",
  LIMITED_LINK_TEMPLATE: "offers365_limited_link_template",
  POTENTIAL_LINK_TEMPLATE: "offers365_potential_link_template",
  BUNDLE_DIRECT_LINK_TEMPLATE: "offers365_bundle_direct_link_template",
  BUNDLE_PAGE_LINK_TEMPLATE: "offers365_bundle_page_link_template",
  BEST_SELLER_TEMPLATE: "offers365_best_seller_template",
  CART_TEMPLATE: "offers365_cart_template",
  CART_NOTE_TEMPLATE: "offers365_cart_note_template",
  TRENDING_OFFERS_LIST: "offers365_trending_offers_list",
  TRENDING_OFFER_DETAILS: "offers365_trending_offer_details_",
  ALL_OFFRES: "offers365_all_offres_",
  OFFRES_VERSION: "offers365_offres_version_",
  SAVED_ITEMS: "offers365_saved_items",
  SOCIAL_LINKS: "offers365_social_links",
  SHARE_APP_CONTENT_EN: "offers365_share_app_en",
  SHARE_APP_CONTENT_AR: "offers365_share_app_ar",
  LAST_SHARED_URL: "offers365_last_shared_url",
};

export interface ProductItem {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  price: string;
  originalPrice: string;
  discount: string;
  storeName: string;
  evaluateRate?: string;
  shopUrl?: string;
  categoryName?: string;
  commissionRate?: string;
  orders?: string;
  shipping_fees?: string;
  searchedAt: string;
  offers: OfferItem[];
  coupons_summary?: string;
  finalPrice?: string;
  dbPrice?: string;
  couponValue?: string;
  promoCouponValue?: string;
  promoCodes?: string[];
  couponTitle?: string;
  cod_1?: string;
  cod_2?: string;
  cod_3?: string;
  sellerCoupon?: string;
  info?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  affiliateStoreUrl?: string;
}

export interface OfferItem {
  key?: string;
  name: string;
  link: string;
  success: boolean;
}

export type ProductLanguage = "AR" | "EN" | "FR" | "PT" | "ES" | "KO" | "DE" | "IT";

export interface AppSettings {
  language: "en" | "ar" | "fr" | "pt";
  theme: "light" | "dark" | "system";
  country: string;
  currency: string;
  productLanguage: ProductLanguage;
  enabledOffers: string[];
  notificationsEnabled: boolean;
  notifyOffers: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  theme: "system",
  country: "DZ",
  currency: "USD",
  productLanguage: "EN",
  enabledOffers: [
    "coin_link",
    "direct_link",
    "super_link",
    "big_save_link",
    "limited_link",
    "potential_link",
    "bundle_direct_link",
    "bundle_page_link"
  ],
  notificationsEnabled: true,
  notifyOffers: true,
};

const APP_LINK = "https://offres365page.up.railway.app/";
const BOT_LINK = "https://t.me/rabahcopons/7219";

export const DEFAULT_MESSAGE_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر قبل: [ {originalPrice} ] 
💶 السعر بعد: [ {price} ] 
💶 السعر النهائي: [ {finalPrice} ]
🎟️ كود كوبون : [ {couponValue} ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎استخدم البوت اذا وجدت سعر مغاير👇
${BOT_LINK} 
💥رابط الشراء:
{direct_link}

🔰عروض اخرى:

💥عرض المنتج في صفحة العملات:
{coin_link}

💥عرض Super Deals:
{super_link}

💥عرض تخفيض Big Save:
{big_save_link}

💥عرض التخفيض المحدود:
{limited_link}

💥عرض التخفيض المحتمل:
{potential_link}

💥عرض مباشر للباندل :
{bundle_direct_link}

💥عرض المنتج في صفحة الباندل:
{bundle_page_link}

🔰 تفاصيل اخرى للمنتج:
🔥 نسبة التخفيض: {discount}
📦 عدد الطلبات: {orders}
💼 عمولة المنتج: {commission_rate}
🏷️ اسم الفئة: {first_level_category_name}
🏪 اسم المتجر: {storeName}
⭐ تقييم المتجر: {evaluateRate}
🔗 رابط المتجر: {shopUrl}`;

export const DEFAULT_SHARE_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر قبل: [ {originalPrice} ] 
💶 السعر بعد: [ {price} ] 
💶 السعر النهائي: [ {finalPrice} ]
🎟️ كود كوبون : [ {couponValue} ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎استخدم البوت اذا وجدت سعر مغاير👇
${BOT_LINK} 
💥رابط الشراء:
{direct_link}

🔰عروض اخرى:

💥عرض المنتج في صفحة العملات:
{coin_link}

💥عرض Super Deals:
{super_link}

💥عرض تخفيض Big Save:
{big_save_link}

💥عرض التخفيض المحدود:
{limited_link}

💥عرض التخفيض المحتمل:
{potential_link}

💥عرض مباشر للباندل :
{bundle_direct_link}

💥عرض المنتج في صفحة الباندل:
{bundle_page_link}`;

export const DEFAULT_DETAILS_TEMPLATE = `🛍️ عنوان المنتج: {title}
💰 السعر قبل: {originalPrice}
💸 السعر بعد: {price}
🔥 نسبة التخفيض: {discount}
📦 عدد الطلبات: {orders}
🏷️ اسم الفئة: {first_level_category_name}
🏪 اسم المتجر: {storeName}
⭐ تقييم المتجر: {evaluateRate}
🔗 رابط المتجر: {shopUrl}`;

export const DEFAULT_COPY_ALL_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر قبل: [ {originalPrice} ] 
💶 السعر بعد: [ {price} ] 
💶 السعر النهائي: [ {finalPrice} ]
🎟️ كود كوبون : [ {couponValue} ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎استخدم البوت اذا وجدت سعر مغاير👇
${BOT_LINK} 
💥رابط الشراء:
{direct_link}

🔰عروض اخرى:

💥عرض المنتج في صفحة العملات:
{coin_link}

💥عرض Super Deals:
{super_link}

💥عرض تخفيض Big Save:
{big_save_link}

💥عرض التخفيض المحدود:
{limited_link}

💥عرض التخفيض المحتمل:
{potential_link}

💥عرض مباشر للباندل :
{bundle_direct_link}

💥عرض المنتج في صفحة الباندل:
{bundle_page_link}

🔰 تفاصيل اخرى للمنتج:
🔥 نسبة التخفيض: {discount}
📦 عدد الطلبات: {orders}
💼 عمولة المنتج: {commission_rate}
🏷️ اسم الفئة: {first_level_category_name}
🏪 اسم المتجر: {storeName}
⭐ تقييم المتجر: {evaluateRate}
🔗 رابط المتجر: {shopUrl}`;

export const DEFAULT_TRENDING_SHARE_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر: [ {finalPricetrend} ] ✈️باحتساب رسوم الشحن
🎟️قسيمة المتجر : [ {seller_coupon} ]  
🎟️كود كوبون : [ {couponValue} ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{trending}`;

// Default share templates for each individual offer button (one per key)
export const DEFAULT_COIN_LINK_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
🟡 تخفيض % بواسطة العملات (غير الدولة الى كندا) 
🎟️قسيمة المتجر : [ $ ] 
🎟️كود كوبون : [ {couponValue} ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{coin_link}`;

export const DEFAULT_DIRECT_LINK_TEMPLATE = `🔥 تخفيض على {title}
💶 السعر قبل: [ {originalPrice} ]
💶 السعر بعد: [ {price} ]
💲 السعر النهائي: [ {finalPrice} ]
🎟️ قيمة الكوبون: {couponValue}
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{direct_link}`;

export const DEFAULT_SUPER_LINK_TEMPLATE = `غـــيـــر الجديــــــــد عــرض الـســــوبــر😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{super_link}`;

export const DEFAULT_BIG_SAVE_LINK_TEMPLATE = `🔥 تخفيض على {title}
💰 السعر [ $ ] :
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{big_save_link}`;

export const DEFAULT_LIMITED_LINK_TEMPLATE = `غـــيـــر الجديــــــــد عــرض مــحـــــدود😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{limited_link}`;

export const DEFAULT_POTENTIAL_LINK_TEMPLATE = `غـــيـــر الجديــــــــد عــرض مــحـتـمـل😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{potential_link}`;

export const DEFAULT_BUNDLE_DIRECT_LINK_TEMPLATE = `غـــيـــر الجديــــــــد في عــروض البــانـدل 3 قطع😍
🔥 تخفيض على {title}
💶 سعر 3 قطع: [ $ ] 
💶 سعر القطعة: [ $ ] 
✈️شحن مجاني
🚩ضع اعدادات الموقع على دولة الجزائر🇩🇿 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{bundle_direct_link}`;

export const DEFAULT_BUNDLE_PAGE_LINK_TEMPLATE = `غـــيـــر الجديــــــــد في عــروض البــانـدل 3 قطع😍
🔥 تخفيض على {title}
💶 سعر 3 قطع: [ $ ] 
💶 سعر القطعة: [ $ ] 
✈️شحن مجاني
🚩ضع اعدادات الموقع على دولة الجزائر🇩🇿 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{bundle_page_link}`;

export const DEFAULT_CART_TEMPLATE = `غـيـر الـجـديـد مـع عـرض التـجـمـيـع فـي الـسـلـة😍
🔥 تخفيض على {titel}
💶 السعر: [ {pricecart}$ ] ✈️باحتساب رسوم الشحن
🟡 تخفيض 1% بواسطة العملات (غير الدولة الى كندا) 
🎟️قسيمة المتجر : [ {couponVendeur}$ ] 
🎟️تخفيض البائع : [ {discVendeur}$ ] 
🎟️قيمة التخفيض بالكوبون : [ {couponcartValue}$ ] 
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}

🛑 قم بوضع منتجك الرئيسي والمنتجات الاضافية مع بعض في السلة وادفع ببطاقة فارغة او مجمدة، بعدها قم بالرجوع الى الطلبات المعلقة وقم بدفع منتجك فقط, لاتنسى حجز كوبونات البائع للمنتجات الاضافية

📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{coin_link}
📎روابط المنتجات الاضافية👇
{cart_link1}
{cart_link2}
{cart_link3}
{cart_link4}
{cart_link5}
{cart_link6}
{cart_link7}
{cart_link8}
{cart_link9}
{cart_link10}`;

export const DEFAULT_CART_NOTE_TEMPLATE = `🔸ملاحظة: الرابط الاول ضع منه {cart_link1_count} قطع والروابط الاخرى قطعة من كل رابط`;

// ─── Default Notification Templates per Country ───────────────────────────────
// Key: lowercase country code (or "all"). Value: map of notif base key → default content.
// "all", "dz", "sa", "ae" → Arabic | "fr" → French | "es" → Spanish
// "br" → Portuguese | "us"/"ca" → English | "de" → German | "it" → Italian | "kr" → Korean
export const DEFAULT_NOTIF_TEMPLATES: Record<string, Record<string, string>> = {
  all: {
    notif_coupon:     "🎟️ كوبونات جديدة متوفرة الآن! افتح التطبيق للاستفادة منها.",
    notif_offre:      "🔥 عرض رائج جديد: {title} بسعر {price}$",
    notif_sale:       "🛍️ حدث جديد متوفر! افتح التطبيق للاطلاع عليه.",
    notif_calendrier: "📅 رزنامة أحداث جديدة! افتح التطبيق للاطلاع على المواعيد.",
    notif_update:     "🔄 تحديث جديد للتطبيق متوفر! قم بالتحديث الآن.",
    notif_cart:       "🛒 طريقة السلة AI متوفرة الآن! استفد من أفضل الأسعار.",
    notif_welcome:    "👋 مرحباً بك في Offers 365! اكتشف أفضل عروض علي اكسبراس يومياً.",
  },
  dz: {
    notif_coupon:     "🎟️ كوبونات جديدة متوفرة الآن! افتح التطبيق للاستفادة منها.",
    notif_offre:      "🔥 عرض رائج جديد: {title} بسعر {price}$",
    notif_sale:       "🛍️ حدث جديد متوفر! افتح التطبيق للاطلاع عليه.",
    notif_calendrier: "📅 رزنامة أحداث جديدة! افتح التطبيق للاطلاع على المواعيد.",
    notif_update:     "🔄 تحديث جديد للتطبيق متوفر! قم بالتحديث الآن.",
    notif_cart:       "🛒 طريقة السلة AI متوفرة الآن! استفد من أفضل الأسعار.",
    notif_welcome:    "👋 مرحباً بك في Offers 365! اكتشف أفضل عروض علي اكسبراس يومياً.",
  },
  sa: {
    notif_coupon:     "🎟️ كوبونات جديدة متوفرة الآن! افتح التطبيق للاستفادة منها.",
    notif_offre:      "🔥 عرض رائج جديد: {title} بسعر {price}$",
    notif_sale:       "🛍️ حدث جديد متوفر! افتح التطبيق للاطلاع عليه.",
    notif_calendrier: "📅 رزنامة أحداث جديدة! افتح التطبيق للاطلاع على المواعيد.",
    notif_update:     "🔄 تحديث جديد للتطبيق متوفر! قم بالتحديث الآن.",
    notif_cart:       "🛒 طريقة السلة AI متوفرة الآن! استفد من أفضل الأسعار.",
    notif_welcome:    "👋 مرحباً بك في Offers 365! اكتشف أفضل عروض علي اكسبراس يومياً.",
  },
  ae: {
    notif_coupon:     "🎟️ كوبونات جديدة متوفرة الآن! افتح التطبيق للاستفادة منها.",
    notif_offre:      "🔥 عرض رائج جديد: {title} بسعر {price}$",
    notif_sale:       "🛍️ حدث جديد متوفر! افتح التطبيق للاطلاع عليه.",
    notif_calendrier: "📅 رزنامة أحداث جديدة! افتح التطبيق للاطلاع على المواعيد.",
    notif_update:     "🔄 تحديث جديد للتطبيق متوفر! قم بالتحديث الآن.",
    notif_cart:       "🛒 طريقة السلة AI متوفرة الآن! استفد من أفضل الأسعار.",
    notif_welcome:    "👋 مرحباً بك في Offers 365! اكتشف أفضل عروض علي اكسبراس يومياً.",
  },
  fr: {
    notif_coupon:     "🎟️ De nouveaux coupons sont disponibles ! Ouvrez l'application pour en profiter.",
    notif_offre:      "🔥 Nouvelle offre tendance : {title} à {price}$",
    notif_sale:       "🛍️ Nouvel événement disponible ! Ouvrez l'application pour le découvrir.",
    notif_calendrier: "📅 Nouveau calendrier d'événements ! Ouvrez l'application pour voir les dates.",
    notif_update:     "🔄 Une nouvelle mise à jour est disponible ! Mettez à jour maintenant.",
    notif_cart:       "🛒 La méthode Panier IA est disponible ! Profitez des meilleurs prix.",
    notif_welcome:    "👋 Bienvenue sur Offers 365 ! Découvrez les meilleures offres AliExpress chaque jour.",
  },
  es: {
    notif_coupon:     "🎟️ ¡Nuevos cupones disponibles! Abre la app para aprovecharlos.",
    notif_offre:      "🔥 Nueva oferta tendencia: {title} a {price}$",
    notif_sale:       "🛍️ ¡Nuevo evento disponible! Abre la app para verlo.",
    notif_calendrier: "📅 ¡Nuevo calendario de eventos! Abre la app para ver las fechas.",
    notif_update:     "🔄 ¡Nueva actualización disponible! Actualiza ahora.",
    notif_cart:       "🛒 ¡El método Carrito IA está disponible! Aprovecha los mejores precios.",
    notif_welcome:    "👋 ¡Bienvenido a Offers 365! Descubre las mejores ofertas de AliExpress cada día.",
  },
  br: {
    notif_coupon:     "🎟️ Novos cupons disponíveis! Abra o app para aproveitá-los.",
    notif_offre:      "🔥 Nova oferta em tendência: {title} por {price}$",
    notif_sale:       "🛍️ Novo evento disponível! Abra o app para conferir.",
    notif_calendrier: "📅 Novo calendário de eventos! Abra o app para ver as datas.",
    notif_update:     "🔄 Nova atualização disponível! Atualize agora.",
    notif_cart:       "🛒 O método Carrinho IA está disponível! Aproveite os melhores preços.",
    notif_welcome:    "👋 Bem-vindo ao Offers 365! Descubra as melhores ofertas do AliExpress todos os dias.",
  },
  us: {
    notif_coupon:     "🎟️ New coupons are available! Open the app to take advantage.",
    notif_offre:      "🔥 New trending offer: {title} at {price}$",
    notif_sale:       "🛍️ New event available! Open the app to check it out.",
    notif_calendrier: "📅 New event calendar! Open the app to see the dates.",
    notif_update:     "🔄 New app update available! Update now.",
    notif_cart:       "🛒 The AI Cart method is now available! Get the best prices.",
    notif_welcome:    "👋 Welcome to Offers 365! Discover the best AliExpress deals every day.",
  },
  ca: {
    notif_coupon:     "🎟️ New coupons are available! Open the app to take advantage.",
    notif_offre:      "🔥 New trending offer: {title} at {price}$",
    notif_sale:       "🛍️ New event available! Open the app to check it out.",
    notif_calendrier: "📅 New event calendar! Open the app to see the dates.",
    notif_update:     "🔄 New app update available! Update now.",
    notif_cart:       "🛒 The AI Cart method is now available! Get the best prices.",
    notif_welcome:    "👋 Welcome to Offers 365! Discover the best AliExpress deals every day.",
  },
  de: {
    notif_coupon:     "🎟️ Neue Gutscheine verfügbar! Öffne die App, um sie zu nutzen.",
    notif_offre:      "🔥 Neues Trendangebot: {title} für {price}$",
    notif_sale:       "🛍️ Neues Event verfügbar! Öffne die App, um es zu sehen.",
    notif_calendrier: "📅 Neuer Veranstaltungskalender! Öffne die App, um die Termine zu sehen.",
    notif_update:     "🔄 Neues App-Update verfügbar! Jetzt aktualisieren.",
    notif_cart:       "🛒 Die KI-Warenkorb-Methode ist verfügbar! Nutze die besten Preise.",
    notif_welcome:    "👋 Willkommen bei Offers 365! Entdecke täglich die besten AliExpress-Angebote.",
  },
  it: {
    notif_coupon:     "🎟️ Nuovi coupon disponibili! Apri l'app per approfittarne.",
    notif_offre:      "🔥 Nuova offerta di tendenza: {title} a {price}$",
    notif_sale:       "🛍️ Nuovo evento disponibile! Apri l'app per scoprirlo.",
    notif_calendrier: "📅 Nuovo calendario eventi! Apri l'app per vedere le date.",
    notif_update:     "🔄 Nuovo aggiornamento disponibile! Aggiorna ora.",
    notif_cart:       "🛒 Il metodo Carrello IA è disponibile! Approfitta dei migliori prezzi.",
    notif_welcome:    "👋 Benvenuto su Offers 365! Scopri le migliori offerte AliExpress ogni giorno.",
  },
  kr: {
    notif_coupon:     "🎟️ 새 쿠폰이 제공됩니다! 앱을 열어 혜택을 받으세요.",
    notif_offre:      "🔥 새 인기 상품: {title} - {price}$",
    notif_sale:       "🛍️ 새 이벤트가 시작됩니다! 앱을 열어 확인하세요.",
    notif_calendrier: "📅 새 이벤트 일정! 앱을 열어 날짜를 확인하세요.",
    notif_update:     "🔄 새 앱 업데이트가 제공됩니다! 지금 업데이트하세요.",
    notif_cart:       "🛒 AI 장바구니 방법이 제공됩니다! 최고의 가격을 누리세요.",
    notif_welcome:    "👋 Offers 365에 오신 것을 환영합니다! 매일 최고의 AliExpress 딜을 발견하세요.",
  },
};

export const DEFAULT_BEST_SELLER_TEMPLATE = `غـــيـــر الجديــــــــد ما تراطيــــــش😍
🔥 تخفيض على {title}
💶 السعر قبل: [ {originalPrice} ]
💶 السعر بعد: [ {price} ]
🔥 نسبة التخفيض: {discount}
📦 عدد الطلبات: {orders}
🏷️ اسم الفئة: {first_level_category_name}
🏪 اسم المتجر: {storeName}
⭐ تقييم المتجر: {evaluateRate}
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎استخدم البوت اذا وجدت سعر مغاير👇
${BOT_LINK}
💥رابط الشراء:
{direct_link}
🔗 رابط المتجر:
 {shopUrl}`;

// Lookup map: offer key → its default share template (Arabic)
const OFFER_DEFAULT_TEMPLATES: Record<string, string> = {
  coin_link:          DEFAULT_COIN_LINK_TEMPLATE,
  direct_link:        DEFAULT_DIRECT_LINK_TEMPLATE,
  super_link:         DEFAULT_SUPER_LINK_TEMPLATE,
  big_save_link:      DEFAULT_BIG_SAVE_LINK_TEMPLATE,
  limited_link:       DEFAULT_LIMITED_LINK_TEMPLATE,
  potential_link:     DEFAULT_POTENTIAL_LINK_TEMPLATE,
  bundle_direct_link: DEFAULT_BUNDLE_DIRECT_LINK_TEMPLATE,
  bundle_page_link:   DEFAULT_BUNDLE_PAGE_LINK_TEMPLATE,
};

// ─── Multi-language default templates (EN / FR / PT) ─────────────────────────
// Arabic (ar) remains the existing constants above.

const _TEMPLATES_EN: Record<string, string> = {
  share: `🔥 Amazing deal on {title}!
💵 Original Price: [ {originalPrice} ]
💸 Sale Price: [ {price} ]
💰 Final Price: [ {finalPrice} ]
🎟️ Coupon Code: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Use the bot if you find a different price 👇
${BOT_LINK}
💥 Buy Now:
{direct_link}

🔗 More Offers:

💥 Coins Page Offer:
{coin_link}

💥 Super Deals:
{super_link}

💥 Big Save Offer:
{big_save_link}

💥 Limited-Time Offer:
{limited_link}

💥 Potential Discount:
{potential_link}

💥 Bundle Direct Offer:
{bundle_direct_link}

💥 Bundle Page Offer:
{bundle_page_link}`,

  message: `🔥 Amazing deal on {title}!
💵 Original Price: [ {originalPrice} ]
💸 Sale Price: [ {price} ]
💰 Final Price: [ {finalPrice} ]
🎟️ Coupon Code: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Use the bot if you find a different price 👇
${BOT_LINK}
💥 Buy Now:
{direct_link}

🔗 More Offers:

💥 Coins Page Offer:
{coin_link}

💥 Super Deals:
{super_link}

💥 Big Save Offer:
{big_save_link}

💥 Limited-Time Offer:
{limited_link}

💥 Potential Discount:
{potential_link}

💥 Bundle Direct Offer:
{bundle_direct_link}

💥 Bundle Page Offer:
{bundle_page_link}

🔰 Product Details:
🔥 Discount: {discount}
📦 Orders: {orders}
💼 Commission: {commission_rate}
🏷️ Category: {first_level_category_name}
🏪 Store: {storeName}
⭐ Store Rating: {evaluateRate}
🔗 Store Link: {shopUrl}`,

  details: `🛍️ Product: {title}
💰 Original Price: {originalPrice}
💸 Sale Price: {price}
🔥 Discount: {discount}
📦 Orders: {orders}
🏷️ Category: {first_level_category_name}
🏪 Store: {storeName}
⭐ Store Rating: {evaluateRate}
🔗 Store Link: {shopUrl}`,

  copyAll: `🔥 Amazing deal on {title}!
💵 Original Price: [ {originalPrice} ]
💸 Sale Price: [ {price} ]
💰 Final Price: [ {finalPrice} ]
🎟️ Coupon Code: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Use the bot if you find a different price 👇
${BOT_LINK}
💥 Buy Now:
{direct_link}

🔗 More Offers:

💥 Coins Page Offer:
{coin_link}

💥 Super Deals:
{super_link}

💥 Big Save Offer:
{big_save_link}

💥 Limited-Time Offer:
{limited_link}

💥 Potential Discount:
{potential_link}

💥 Bundle Direct Offer:
{bundle_direct_link}

💥 Bundle Page Offer:
{bundle_page_link}

🔰 Product Details:
🔥 Discount: {discount}
📦 Orders: {orders}
💼 Commission: {commission_rate}
🏷️ Category: {first_level_category_name}
🏪 Store: {storeName}
⭐ Store Rating: {evaluateRate}
🔗 Store Link: {shopUrl}`,

  trending: `🔥 Trending deal on {title}!
💵 Price: [ {finalPricetrend} ] ✈️ including shipping
🎟️ Seller Coupon: [ {seller_coupon} ]
🎟️ Coupon Code: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{trending}`,

  coin_link: `🔥 Deal on {title}!
💵 Price: [ $ ]
🟡 Extra % discount via Coins Page (change region to Canada)
🎟️ Seller Coupon: [ $ ]
🎟️ Coupon Code: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{coin_link}`,

  direct_link: `🔥 Deal on {title}!
💵 Original Price: [ {originalPrice} ]
💸 Sale Price: [ {price} ]
💲 Final Price: [ {finalPrice} ]
🎟️ Coupon Value: {couponValue}
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{direct_link}`,

  super_link: `🔥 Super Deals on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{super_link}`,

  big_save_link: `🔥 Big Save Deal on {title}!
💰 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{big_save_link}`,

  limited_link: `🔥 Limited-Time Deal on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{limited_link}`,

  potential_link: `🔥 Potential Discount on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{potential_link}`,

  bundle_direct_link: `🔥 Bundle Deal – 3 pcs of {title}!
💵 Price for 3: [ $ ]
💵 Price per piece: [ $ ]
✈️ Free shipping
🌐 Set site region to Algeria 🇩🇿
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{bundle_direct_link}`,

  bundle_page_link: `🔥 Bundle Deal – 3 pcs of {title}!
💵 Price for 3: [ $ ]
💵 Price per piece: [ $ ]
✈️ Free shipping
🌐 Set site region to Algeria 🇩🇿
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{bundle_page_link}`,

  best_seller: `🔥 Hot Deal on {title}!
💵 Original Price: [ {originalPrice} ]
💸 Sale Price: [ {price} ]
🔥 Discount: {discount}
📦 Orders: {orders}
🏷️ Category: {first_level_category_name}
🏪 Store: {storeName}
⭐ Store Rating: {evaluateRate}
📱 Offres365 App 👇
${APP_LINK}
🤖 Use the bot if you find a different price 👇
${BOT_LINK}
💥 Buy Now:
{direct_link}
🔗 Store Link:
 {shopUrl}`,

  cart: `🛒 Bundle Cart Method Deal!
🔥 Deal on {titel}
💵 Price: [ {pricecart}$ ] ✈️ including shipping
🟡 1% extra discount via Coins (change country to Canada)
🎟️ Store Coupon: [ {couponVendeur}$ ]
🎟️ Seller Discount: [ {discVendeur}$ ]
🎟️ Coupon Value: [ {couponcartValue}$ ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}

🛑 Add your main product and extra items to the cart together, then pay with an empty or frozen card. Afterwards go to pending orders and pay for your product only. Don't forget to reserve seller coupons for the extra items.

📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Main Product:
{coin_link}
📎 Extra Products:
{cart_link1}
{cart_link2}
{cart_link3}
{cart_link4}
{cart_link5}
{cart_link6}
{cart_link7}
{cart_link8}
{cart_link9}
{cart_link10}`,

  cart_note: `🔸 Note: Add {cart_link1_count} units from the first link, and 1 unit from each of the other links`,
};

const _TEMPLATES_FR: Record<string, string> = {
  share: `🔥 Super offre sur {title} !
💵 Prix d'origine : [ {originalPrice} ]
💸 Prix réduit : [ {price} ]
💰 Prix final : [ {finalPrice} ]
🎟️ Code promo : [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Utilisez le bot si vous trouvez un prix différent 👇
${BOT_LINK}
💥 Acheter maintenant :
{direct_link}

🔗 Plus d'offres :

💥 Offre page des pièces :
{coin_link}

💥 Super Deals :
{super_link}

💥 Offre Big Save :
{big_save_link}

💥 Offre à durée limitée :
{limited_link}

💥 Réduction potentielle :
{potential_link}

💥 Offre bundle directe :
{bundle_direct_link}

💥 Offre page bundle :
{bundle_page_link}`,

  message: `🔥 Super offre sur {title} !
💵 Prix d'origine : [ {originalPrice} ]
💸 Prix réduit : [ {price} ]
💰 Prix final : [ {finalPrice} ]
🎟️ Code promo : [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Utilisez le bot si vous trouvez un prix différent 👇
${BOT_LINK}
💥 Acheter maintenant :
{direct_link}

🔗 Plus d'offres :

💥 Offre page des pièces :
{coin_link}

💥 Super Deals :
{super_link}

💥 Offre Big Save :
{big_save_link}

💥 Offre à durée limitée :
{limited_link}

💥 Réduction potentielle :
{potential_link}

💥 Offre bundle directe :
{bundle_direct_link}

💥 Offre page bundle :
{bundle_page_link}

🔰 Détails du produit :
🔥 Remise : {discount}
📦 Commandes : {orders}
💼 Commission : {commission_rate}
🏷️ Catégorie : {first_level_category_name}
🏪 Boutique : {storeName}
⭐ Note boutique : {evaluateRate}
🔗 Lien boutique : {shopUrl}`,

  details: `🛍️ Produit : {title}
💰 Prix d'origine : {originalPrice}
💸 Prix réduit : {price}
🔥 Remise : {discount}
📦 Commandes : {orders}
🏷️ Catégorie : {first_level_category_name}
🏪 Boutique : {storeName}
⭐ Note boutique : {evaluateRate}
🔗 Lien boutique : {shopUrl}`,

  copyAll: `🔥 Super offre sur {title} !
💵 Prix d'origine : [ {originalPrice} ]
💸 Prix réduit : [ {price} ]
💰 Prix final : [ {finalPrice} ]
🎟️ Code promo : [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Utilisez le bot si vous trouvez un prix différent 👇
${BOT_LINK}
💥 Acheter maintenant :
{direct_link}

🔗 Plus d'offres :

💥 Offre page des pièces :
{coin_link}

💥 Super Deals :
{super_link}

💥 Offre Big Save :
{big_save_link}

💥 Offre à durée limitée :
{limited_link}

💥 Réduction potentielle :
{potential_link}

💥 Offre bundle directe :
{bundle_direct_link}

💥 Offre page bundle :
{bundle_page_link}

🔰 Détails du produit :
🔥 Remise : {discount}
📦 Commandes : {orders}
💼 Commission : {commission_rate}
🏷️ Catégorie : {first_level_category_name}
🏪 Boutique : {storeName}
⭐ Note boutique : {evaluateRate}
🔗 Lien boutique : {shopUrl}`,

  trending: `🔥 Offre tendance sur {title} !
💵 Prix : [ {finalPricetrend} ] ✈️ frais de livraison inclus
🎟️ Coupon vendeur : [ {seller_coupon} ]
🎟️ Code promo : [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{trending}`,

  coin_link: `🔥 Offre sur {title} !
💵 Prix : [ $ ]
🟡 Remise % via la page des pièces (changer le pays en Canada)
🎟️ Coupon vendeur : [ $ ]
🎟️ Code promo : [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{coin_link}`,

  direct_link: `🔥 Offre sur {title} !
💵 Prix d'origine : [ {originalPrice} ]
💸 Prix réduit : [ {price} ]
💲 Prix final : [ {finalPrice} ]
🎟️ Valeur coupon : {couponValue}
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{direct_link}`,

  super_link: `🔥 Super Deals sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{super_link}`,

  big_save_link: `🔥 Big Save sur {title} !
💰 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{big_save_link}`,

  limited_link: `🔥 Offre à durée limitée sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{limited_link}`,

  potential_link: `🔥 Réduction potentielle sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{potential_link}`,

  bundle_direct_link: `🔥 Pack Bundle 3 pcs {title} !
💵 Prix pour 3 : [ $ ]
💵 Prix à l'unité : [ $ ]
✈️ Livraison gratuite
🌐 Réglez le pays du site sur Algérie 🇩🇿
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{bundle_direct_link}`,

  bundle_page_link: `🔥 Pack Bundle 3 pcs {title} !
💵 Prix pour 3 : [ $ ]
💵 Prix à l'unité : [ $ ]
✈️ Livraison gratuite
🌐 Réglez le pays du site sur Algérie 🇩🇿
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{bundle_page_link}`,

  best_seller: `🔥 Super offre sur {title} !
💵 Prix d'origine : [ {originalPrice} ]
💸 Prix réduit : [ {price} ]
🔥 Remise : {discount}
📦 Commandes : {orders}
🏷️ Catégorie : {first_level_category_name}
🏪 Boutique : {storeName}
⭐ Note boutique : {evaluateRate}
📱 Application Offres365 👇
${APP_LINK}
🤖 Utilisez le bot si vous trouvez un prix différent 👇
${BOT_LINK}
💥 Acheter maintenant :
{direct_link}
🔗 Lien boutique :
 {shopUrl}`,

  cart: `🛒 Méthode Panier – Offre groupée !
🔥 Offre sur {titel}
💵 Prix : [ {pricecart}$ ] ✈️ livraison incluse
🟡 1% de remise supplémentaire via pièces (changer le pays en Canada)
🎟️ Coupon boutique : [ {couponVendeur}$ ]
🎟️ Remise vendeur : [ {discVendeur}$ ]
🎟️ Valeur du coupon : [ {couponcartValue}$ ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}

🛑 Ajoutez votre produit principal et les produits supplémentaires ensemble dans le panier, payez avec une carte vide ou bloquée, puis revenez aux commandes en attente et payez uniquement votre produit. N'oubliez pas de réserver les coupons vendeur pour les produits supplémentaires.

📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Produit principal :
{coin_link}
📎 Produits supplémentaires :
{cart_link1}
{cart_link2}
{cart_link3}
{cart_link4}
{cart_link5}
{cart_link6}
{cart_link7}
{cart_link8}
{cart_link9}
{cart_link10}`,

  cart_note: `🔸 Remarque : Ajoutez {cart_link1_count} unités depuis le premier lien, et 1 unité depuis chacun des autres liens`,
};

const _TEMPLATES_PT: Record<string, string> = {
  share: `🔥 Oferta incrível em {title}!
💵 Preço original: [ {originalPrice} ]
💸 Preço com desconto: [ {price} ]
💰 Preço final: [ {finalPrice} ]
🎟️ Código de cupom: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Use o bot se encontrar um preço diferente 👇
${BOT_LINK}
💥 Comprar agora:
{direct_link}

🔗 Mais ofertas:

💥 Oferta na Página de Moedas:
{coin_link}

💥 Super Deals:
{super_link}

💥 Oferta Big Save:
{big_save_link}

💥 Oferta por tempo limitado:
{limited_link}

💥 Desconto potencial:
{potential_link}

💥 Oferta bundle direta:
{bundle_direct_link}

💥 Oferta na página bundle:
{bundle_page_link}`,

  message: `🔥 Oferta incrível em {title}!
💵 Preço original: [ {originalPrice} ]
💸 Preço com desconto: [ {price} ]
💰 Preço final: [ {finalPrice} ]
🎟️ Código de cupom: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Use o bot se encontrar um preço diferente 👇
${BOT_LINK}
💥 Comprar agora:
{direct_link}

🔗 Mais ofertas:

💥 Oferta na Página de Moedas:
{coin_link}

💥 Super Deals:
{super_link}

💥 Oferta Big Save:
{big_save_link}

💥 Oferta por tempo limitado:
{limited_link}

💥 Desconto potencial:
{potential_link}

💥 Oferta bundle direta:
{bundle_direct_link}

💥 Oferta na página bundle:
{bundle_page_link}

🔰 Detalhes do produto:
🔥 Desconto: {discount}
📦 Pedidos: {orders}
💼 Comissão: {commission_rate}
🏷️ Categoria: {first_level_category_name}
🏪 Loja: {storeName}
⭐ Avaliação: {evaluateRate}
🔗 Link da loja: {shopUrl}`,

  details: `🛍️ Produto: {title}
💰 Preço original: {originalPrice}
💸 Preço com desconto: {price}
🔥 Desconto: {discount}
📦 Pedidos: {orders}
🏷️ Categoria: {first_level_category_name}
🏪 Loja: {storeName}
⭐ Avaliação da loja: {evaluateRate}
🔗 Link da loja: {shopUrl}`,

  copyAll: `🔥 Oferta incrível em {title}!
💵 Preço original: [ {originalPrice} ]
💸 Preço com desconto: [ {price} ]
💰 Preço final: [ {finalPrice} ]
🎟️ Código de cupom: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Use o bot se encontrar um preço diferente 👇
${BOT_LINK}
💥 Comprar agora:
{direct_link}

🔗 Mais ofertas:

💥 Oferta na Página de Moedas:
{coin_link}

💥 Super Deals:
{super_link}

💥 Oferta Big Save:
{big_save_link}

💥 Oferta por tempo limitado:
{limited_link}

💥 Desconto potencial:
{potential_link}

💥 Oferta bundle direta:
{bundle_direct_link}

💥 Oferta na página bundle:
{bundle_page_link}

🔰 Detalhes do produto:
🔥 Desconto: {discount}
📦 Pedidos: {orders}
💼 Comissão: {commission_rate}
🏷️ Categoria: {first_level_category_name}
🏪 Loja: {storeName}
⭐ Avaliação: {evaluateRate}
🔗 Link da loja: {shopUrl}`,

  trending: `🔥 Oferta em alta: {title}!
💵 Preço: [ {finalPricetrend} ] ✈️ com frete incluso
🎟️ Cupom do vendedor: [ {seller_coupon} ]
🎟️ Código de cupom: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{trending}`,

  coin_link: `🔥 Oferta em {title}!
💵 Preço: [ $ ]
🟡 Desconto % via Página de Moedas (mude o país para o Canadá)
🎟️ Cupom do vendedor: [ $ ]
🎟️ Código de cupom: [ {couponValue} ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{coin_link}`,

  direct_link: `🔥 Oferta em {title}!
💵 Preço original: [ {originalPrice} ]
💸 Preço com desconto: [ {price} ]
💲 Preço final: [ {finalPrice} ]
🎟️ Valor do cupom: {couponValue}
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{direct_link}`,

  super_link: `🔥 Super Deals em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{super_link}`,

  big_save_link: `🔥 Oferta Big Save em {title}!
💰 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{big_save_link}`,

  limited_link: `🔥 Oferta por tempo limitado em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{limited_link}`,

  potential_link: `🔥 Desconto potencial em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{potential_link}`,

  bundle_direct_link: `🔥 Pacote Bundle 3 unid. de {title}!
💵 Preço por 3: [ $ ]
💵 Preço por unidade: [ $ ]
✈️ Frete grátis
🌐 Configure o país do site para Argélia 🇩🇿
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{bundle_direct_link}`,

  bundle_page_link: `🔥 Pacote Bundle 3 unid. de {title}!
💵 Preço por 3: [ $ ]
💵 Preço por unidade: [ $ ]
✈️ Frete grátis
🌐 Configure o país do site para Argélia 🇩🇿
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{bundle_page_link}`,

  best_seller: `🔥 Oferta incrível em {title}!
💵 Preço original: [ {originalPrice} ]
💸 Preço com desconto: [ {price} ]
🔥 Desconto: {discount}
📦 Pedidos: {orders}
🏷️ Categoria: {first_level_category_name}
🏪 Loja: {storeName}
⭐ Avaliação: {evaluateRate}
📱 App Offres365 👇
${APP_LINK}
🤖 Use o bot se encontrar um preço diferente 👇
${BOT_LINK}
💥 Comprar agora:
{direct_link}
🔗 Link da loja:
 {shopUrl}`,

  cart: `🛒 Método Carrinho – Oferta em conjunto!
🔥 Oferta em {titel}
💵 Preço: [ {pricecart}$ ] ✈️ com frete incluso
🟡 1% extra com Moedas (mude o país para o Canadá)
🎟️ Cupom da loja: [ {couponVendeur}$ ]
🎟️ Desconto do vendedor: [ {discVendeur}$ ]
🎟️ Valor do cupom: [ {couponcartValue}$ ]
✂️ {cod_1}
✂️ {cod_2}
✂️ {cod_3}

🛑 Adicione seu produto principal e os produtos adicionais juntos no carrinho e pague com um cartão vazio ou bloqueado. Depois, vá até os pedidos pendentes e pague somente pelo seu produto. Não se esqueça de reservar os cupons do vendedor para os produtos adicionais.

📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Produto principal:
{coin_link}
📎 Produtos adicionais:
{cart_link1}
{cart_link2}
{cart_link3}
{cart_link4}
{cart_link5}
{cart_link6}
{cart_link7}
{cart_link8}
{cart_link9}
{cart_link10}`,

  cart_note: `🔸 Observação: Adicione {cart_link1_count} unidades pelo primeiro link e 1 unidade de cada um dos outros links`,
};

// ─── Multilingual template registry ──────────────────────────────────────────
// Arabic (ar) uses existing constants for backward compatibility.
export const DEFAULT_TEMPLATES_PER_LANG: Record<string, Record<string, string>> = {
  ar: {
    share:              DEFAULT_SHARE_TEMPLATE,
    message:            DEFAULT_MESSAGE_TEMPLATE,
    details:            DEFAULT_DETAILS_TEMPLATE,
    copyAll:            DEFAULT_COPY_ALL_TEMPLATE,
    trending:           DEFAULT_TRENDING_SHARE_TEMPLATE,
    coin_link:          DEFAULT_COIN_LINK_TEMPLATE,
    direct_link:        DEFAULT_DIRECT_LINK_TEMPLATE,
    super_link:         DEFAULT_SUPER_LINK_TEMPLATE,
    big_save_link:      DEFAULT_BIG_SAVE_LINK_TEMPLATE,
    limited_link:       DEFAULT_LIMITED_LINK_TEMPLATE,
    potential_link:     DEFAULT_POTENTIAL_LINK_TEMPLATE,
    bundle_direct_link: DEFAULT_BUNDLE_DIRECT_LINK_TEMPLATE,
    bundle_page_link:   DEFAULT_BUNDLE_PAGE_LINK_TEMPLATE,
    best_seller:        DEFAULT_BEST_SELLER_TEMPLATE,
    cart:               DEFAULT_CART_TEMPLATE,
    cart_note:          DEFAULT_CART_NOTE_TEMPLATE,
  },
  en: _TEMPLATES_EN,
  fr: _TEMPLATES_FR,
  pt: _TEMPLATES_PT,
};

/**
 * Returns the default template text for a given template key and UI language.
 * Falls back to Arabic if the language or key is not found.
 */
export function getDefaultTemplateForLang(key: string, lang: string): string {
  return DEFAULT_TEMPLATES_PER_LANG[lang]?.[key]
    ?? DEFAULT_TEMPLATES_PER_LANG["ar"]?.[key]
    ?? "";
}

/**
 * Returns the AsyncStorage key for a given template base key + language.
 * Arabic uses the original storage keys for backward compatibility.
 * Other languages use a dynamic key with lang suffix.
 */
export function getLangStorageKey(baseKey: string, lang: string): string {
  if (!lang || lang === "ar") {
    return TEMPLATE_KEY_MAP[baseKey] ?? `offers365_${baseKey}_template`;
  }
  return `offers365_${baseKey}_template_${lang}`;
}

export async function getRecentProducts(): Promise<ProductItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_PRODUCTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveProduct(product: ProductItem): Promise<void> {
  try {
    const products = await getRecentProducts();
    const existingIndex = products.findIndex(
      (p) => p.productId === product.productId
    );

    if (existingIndex >= 0) {
      products.splice(existingIndex, 1);
    }

    products.unshift(product);

    if (products.length > 20) {
      products.pop();
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.RECENT_PRODUCTS,
      JSON.stringify(products)
    );
  } catch (error) {
    console.error("Failed to save product:", error);
  }
}

export async function clearRecentProducts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_PRODUCTS);
  } catch (error) {
    console.error("Failed to clear products:", error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

export async function getMessageTemplate(): Promise<string> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGE_TEMPLATE);
    return data || DEFAULT_MESSAGE_TEMPLATE;
  } catch {
    return DEFAULT_MESSAGE_TEMPLATE;
  }
}

export async function saveMessageTemplate(template: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATE, template);
  } catch (error) {
    console.error("Failed to save template:", error);
  }
}

export async function getShareTemplate(key: string = "share", lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey(key, lang);
    const defaultTemplate = getDefaultTemplateForLang(key, lang) || DEFAULT_SHARE_TEMPLATE;
    const data = await AsyncStorage.getItem(storageKey);
    return data || defaultTemplate;
  } catch {
    return getDefaultTemplateForLang(key, "ar") || DEFAULT_SHARE_TEMPLATE;
  }
}

export async function saveShareTemplate(template: string, key: string = "share", lang: string = "ar"): Promise<void> {
  try {
    const storageKey = getLangStorageKey(key, lang);
    await AsyncStorage.setItem(storageKey, template);
  } catch (error) {
    console.error("Failed to save share template:", error);
  }
}

export async function getDetailsTemplate(lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey("details", lang);
    const data = await AsyncStorage.getItem(storageKey);
    return data || getDefaultTemplateForLang("details", lang) || DEFAULT_DETAILS_TEMPLATE;
  } catch {
    return DEFAULT_DETAILS_TEMPLATE;
  }
}

export async function saveDetailsTemplate(template: string, lang: string = "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(getLangStorageKey("details", lang), template);
  } catch (error) {
    console.error("Failed to save details template:", error);
  }
}

export async function getCopyAllTemplate(lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey("copyAll", lang);
    const data = await AsyncStorage.getItem(storageKey);
    return data || getDefaultTemplateForLang("copyAll", lang) || DEFAULT_COPY_ALL_TEMPLATE;
  } catch {
    return DEFAULT_COPY_ALL_TEMPLATE;
  }
}

export async function saveCopyAllTemplate(template: string, lang: string = "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(getLangStorageKey("copyAll", lang), template);
  } catch (error) {
    console.error("Failed to save copy all template:", error);
  }
}

export async function getBestSellerTemplate(lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey("best_seller", lang);
    const data = await AsyncStorage.getItem(storageKey);
    return data || getDefaultTemplateForLang("best_seller", lang) || DEFAULT_BEST_SELLER_TEMPLATE;
  } catch {
    return DEFAULT_BEST_SELLER_TEMPLATE;
  }
}

export async function saveBestSellerTemplate(template: string, lang: string = "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(getLangStorageKey("best_seller", lang), template);
  } catch (error) {
    console.error("Failed to save best seller template:", error);
  }
}

export async function getCartTemplate(lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey("cart", lang);
    const data = await AsyncStorage.getItem(storageKey);
    return data || getDefaultTemplateForLang("cart", lang) || DEFAULT_CART_TEMPLATE;
  } catch {
    return DEFAULT_CART_TEMPLATE;
  }
}

export async function saveCartTemplate(template: string, lang: string = "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(getLangStorageKey("cart", lang), template);
  } catch (error) {
    console.error("Failed to save cart template:", error);
  }
}

export async function getCartNoteTemplate(lang: string = "ar"): Promise<string> {
  try {
    const storageKey = getLangStorageKey("cart_note", lang);
    const data = await AsyncStorage.getItem(storageKey);
    return data || getDefaultTemplateForLang("cart_note", lang) || DEFAULT_CART_NOTE_TEMPLATE;
  } catch {
    return DEFAULT_CART_NOTE_TEMPLATE;
  }
}

export async function saveCartNoteTemplate(template: string, lang: string = "ar"): Promise<void> {
  try {
    await AsyncStorage.setItem(getLangStorageKey("cart_note", lang), template);
  } catch (error) {
    console.error("Failed to save cart note template:", error);
  }
}

export async function getTrendingOffers(country?: string): Promise<any[]> {
  try {
    const cc = country || (await getSettings()).country || "DZ";
    const key = `${STORAGE_KEYS.TRENDING_OFFERS_LIST}_${cc}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTrendingOffers(offers: any[], country?: string): Promise<void> {
  try {
    const cc = country || (await getSettings()).country || "DZ";
    const key = `${STORAGE_KEYS.TRENDING_OFFERS_LIST}_${cc}`;
    await AsyncStorage.setItem(key, JSON.stringify(offers));
  } catch (error) {
    console.error("Failed to save trending offers:", error);
  }
}

export async function clearAllTrendingOffersCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const trendingKeys = allKeys.filter(k =>
      k.startsWith(STORAGE_KEYS.TRENDING_OFFERS_LIST) ||
      k.startsWith(STORAGE_KEYS.TRENDING_OFFER_DETAILS) ||
      k.startsWith(STORAGE_KEYS.ALL_OFFRES) ||
      k.startsWith(STORAGE_KEYS.OFFRES_VERSION)
    );
    if (trendingKeys.length > 0) {
      await AsyncStorage.multiRemove(trendingKeys);
    }
  } catch (error) {
    console.error("Failed to clear trending offers cache:", error);
  }
}

export async function getAllOffres(country?: string): Promise<any[]> {
  try {
    const cc = (country || "DZ").toLowerCase();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ALL_OFFRES + cc);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveAllOffres(offers: any[], country?: string): Promise<void> {
  try {
    const cc = (country || "DZ").toLowerCase();
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_OFFRES + cc, JSON.stringify(offers));
  } catch {}
}

export async function getOffresVersion(country?: string): Promise<number> {
  try {
    const cc = (country || "DZ").toLowerCase();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFRES_VERSION + cc);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveOffresVersion(version: number, country?: string): Promise<void> {
  try {
    const cc = (country || "DZ").toLowerCase();
    await AsyncStorage.setItem(STORAGE_KEYS.OFFRES_VERSION + cc, String(version));
  } catch {}
}

export async function getTrendingOfferDetails(cacheKey: string): Promise<ProductItem | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRENDING_OFFER_DETAILS + cacheKey);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function deleteTrendingOfferDetails(cacheKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRENDING_OFFER_DETAILS + cacheKey);
  } catch {}
}

export async function saveTrendingOfferDetails(cacheKey: string, details: ProductItem): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRENDING_OFFER_DETAILS + cacheKey, JSON.stringify(details));
  } catch (error) {
    console.error("Failed to save trending offer details:", error);
  }
}

export function formatProductMessage(
  product: ProductItem,
  template: string
): string {
  const offersText = product.offers
    .filter((o) => o.success)
    .map((o) => `${o.name}:\n${o.link}`)
    .join("\n\n");

  let formatted = template
    .replace(/{title}/g, product.title)
    .replace(/{price}/g, product.price)
    .replace(/{originalPrice}/g, product.originalPrice)
    .replace(/{discount}/g, product.discount)
    .replace(/{storeName}/g, product.storeName)
    .replace(/{shipping_fees}/g, product.shipping_fees || "Free Shipping")
    .replace(/{evaluateRate}/g, product.evaluateRate || "N/A")
    .replace(/{orders}/g, product.orders || "N/A")
    .replace(/{commission_rate}/g, product.commissionRate || "0%")
    .replace(/{first_level_category_name}/g, product.categoryName || "N/A")
    .replace(/{commissionRate}/g, product.commissionRate || "0%")
    .replace(/{categoryName}/g, product.categoryName || "N/A")
    .replace(/{shopUrl}/g, product.affiliateStoreUrl || product.shopUrl || "N/A")
    .replace(/{coupons_summary}/g, product.coupons_summary || "")
    .replace(/{seller_coupon}/g, product.sellerCoupon || "")
    .replace(/{finalPrice}/g, product.finalPrice || product.price)
    .replace(/{finalPricetrend}/g, product.dbPrice || product.price)
    .replace(/{couponValue}/g, product.couponValue || "")
    .replace(/{cod_1}/g, product.cod_1 || "")
    .replace(/{cod_2}/g, product.cod_2 || "")
    .replace(/{cod_3}/g, product.cod_3 || "")
    .replace(/{offers}/g, offersText);

  // Replace specific offer links if they exist
  product.offers.forEach((offer) => {
    if (offer.key && offer.success) {
      formatted = formatted.replace(new RegExp(`{${offer.key}}`, "g"), offer.link);
    }
  });

  // Fallback for {direct_link} when no matching offer was generated (e.g. Best Sellers)
  // Prefer affiliate link over raw URL
  const directLinkFallback = product.affiliateUrl || product.originalUrl;
  if (directLinkFallback) {
    formatted = formatted.replace(/{direct_link}/g, directLinkFallback);
  }

  // Clean up any unused specific link placeholders
  const specificLinkKeys = [
    "{coin_link}", "{direct_link}", "{super_link}", "{big_save_link}",
    "{limited_link}", "{potential_link}", "{bundle_direct_link}", "{bundle_page_link}",
    "{commissionRate}", "{categoryName}", "{shopUrl}", "{commission_rate}", "{first_level_category_name}",
    "{finalPricetrend}"
  ];
  specificLinkKeys.forEach(key => {
    formatted = formatted.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"), "");
  });

  return formatted;
}

export interface SavedItem {
  savedId: string;
  type: "product" | "offer";
  title: string;
  imageUrl: string | null;
  savedAt: string;
  productData: ProductItem;
  offerMeta?: {
    id: number;
    productUrl: string;
    price: string;
    sellerCoupon?: string;
    country?: string;
  };
}

export async function getSavedItems(): Promise<SavedItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_ITEMS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveItem(item: SavedItem): Promise<"saved" | "exists"> {
  const items = await getSavedItems();
  const exists = items.some((i) => i.savedId === item.savedId);
  if (exists) return "exists";
  items.unshift(item);
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(items));
  return "saved";
}

export async function removeSavedItem(savedId: string): Promise<void> {
  const items = await getSavedItems();
  const filtered = items.filter((i) => i.savedId !== savedId);
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(filtered));
}

export async function clearSavedItems(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_ITEMS);
}

export async function isItemSaved(savedId: string): Promise<boolean> {
  const items = await getSavedItems();
  return items.some((i) => i.savedId === savedId);
}

export interface SocialLinksData {
  telegram: string | null;
  facebook: string | null;
  tiktok: string | null;
  bot: string | null;
}

const DEFAULT_SOCIAL_LINKS: SocialLinksData = {
  telegram: "https://t.me/rabahcopons",
  facebook: "https://www.facebook.com/share/14SzTie384J/",
  tiktok: "https://www.tiktok.com/@offres.365",
  bot: "https://t.me/rabahcoupons1bot",
};

export async function getCachedSocialLinks(): Promise<SocialLinksData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_LINKS);
    return data ? JSON.parse(data) : DEFAULT_SOCIAL_LINKS;
  } catch {
    return DEFAULT_SOCIAL_LINKS;
  }
}

export async function saveSocialLinks(links: SocialLinksData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(links));
  } catch (error) {
    console.error("Failed to save social links:", error);
  }
}

export async function getCachedShareAppContent(lang: string): Promise<string> {
  try {
    const key = lang === "ar" ? STORAGE_KEYS.SHARE_APP_CONTENT_AR : STORAGE_KEYS.SHARE_APP_CONTENT_EN;
    const data = await AsyncStorage.getItem(key);
    return data || "";
  } catch {
    return "";
  }
}

export async function saveShareAppContent(lang: string, content: string): Promise<void> {
  try {
    const key = lang === "ar" ? STORAGE_KEYS.SHARE_APP_CONTENT_AR : STORAGE_KEYS.SHARE_APP_CONTENT_EN;
    await AsyncStorage.setItem(key, content);
  } catch (error) {
    console.error("Failed to save share app content:", error);
  }
}

async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  timeoutMs: number = 15000,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function fetchSocialLinksFromApi(apiUrl: string): Promise<SocialLinksData | null> {
  try {
    const res = await fetchWithRetry(new URL("/api/social", apiUrl).href);
    if (res.ok) {
      const data: SocialLinksData = await res.json();
      await saveSocialLinks(data);
      return data;
    }
    console.warn("Social links API returned status:", res.status);
    return null;
  } catch (error) {
    console.warn("Failed to fetch social links from API:", error);
    return null;
  }
}

export async function fetchShareAppContentFromApi(apiUrl: string, lang: string): Promise<string | null> {
  try {
    const res = await fetchWithRetry(new URL(`/api/share-app?lang=${lang}`, apiUrl).href);
    if (res.ok) {
      const data = await res.json();
      if (data.content) {
        await saveShareAppContent(lang, data.content);
        return data.content;
      }
    }
    console.warn("Share app API returned status:", res.status);
    return null;
  } catch (error) {
    console.warn("Failed to fetch share app content from API:", error);
    return null;
  }
}

// Template key → AsyncStorage key mapping
const TEMPLATE_KEY_MAP: Record<string, string> = {
  message: STORAGE_KEYS.MESSAGE_TEMPLATE,
  share: STORAGE_KEYS.SHARE_TEMPLATE,
  details: STORAGE_KEYS.DETAILS_TEMPLATE,
  copyAll: STORAGE_KEYS.COPY_ALL_TEMPLATE,
  best_seller: STORAGE_KEYS.BEST_SELLER_TEMPLATE,
  trending: STORAGE_KEYS.TRENDING_SHARE_TEMPLATE,
  coin_link: STORAGE_KEYS.COIN_LINK_TEMPLATE,
  direct_link: STORAGE_KEYS.DIRECT_LINK_TEMPLATE,
  super_link: STORAGE_KEYS.SUPER_LINK_TEMPLATE,
  big_save_link: STORAGE_KEYS.BIG_SAVE_LINK_TEMPLATE,
  limited_link: STORAGE_KEYS.LIMITED_LINK_TEMPLATE,
  potential_link: STORAGE_KEYS.POTENTIAL_LINK_TEMPLATE,
  bundle_direct_link: STORAGE_KEYS.BUNDLE_DIRECT_LINK_TEMPLATE,
  bundle_page_link: STORAGE_KEYS.BUNDLE_PAGE_LINK_TEMPLATE,
  cart: STORAGE_KEYS.CART_TEMPLATE,
  cart_note: STORAGE_KEYS.CART_NOTE_TEMPLATE,
};

// ─── Trending Now Cache ──────────────────────────────────────────────────────

export interface TrendingNowProduct {
  productId: string;
  country?: string | null;
  quantity: number;
  title?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discount?: string | null;
  updatedAt?: string | null;
}

export async function getCachedTrendingNowPage(page: number, country: string): Promise<TrendingNowProduct[] | null> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_PAGE}${country.toLowerCase()}_${page}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveTrendingNowPage(page: number, country: string, products: TrendingNowProduct[]): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_PAGE}${country.toLowerCase()}_${page}`;
    await AsyncStorage.setItem(key, JSON.stringify(products));
  } catch {}
}

export async function getCachedTrendingNowVersion(country: string): Promise<string> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_VERSION}_${country.toLowerCase()}`;
    return (await AsyncStorage.getItem(key)) || "0";
  } catch {
    return "0";
  }
}

export async function saveTrendingNowVersion(version: string, country: string): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_VERSION}_${country.toLowerCase()}`;
    await AsyncStorage.setItem(key, version);
  } catch {}
}

export async function getCachedTrendingNowTotal(country: string): Promise<number> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_TOTAL}${country.toLowerCase()}`;
    const val = await AsyncStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveTrendingNowTotal(country: string, total: number): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.TRENDING_NOW_TOTAL}${country.toLowerCase()}`;
    await AsyncStorage.setItem(key, String(total));
  } catch {}
}

export async function clearTrendingNowCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const trendingKeys = keys.filter(
      (k) =>
        k.startsWith(STORAGE_KEYS.TRENDING_NOW_PAGE) ||
        k.startsWith(STORAGE_KEYS.TRENDING_NOW_VERSION) ||
        k.startsWith(STORAGE_KEYS.TRENDING_NOW_TOTAL)
    );
    await AsyncStorage.multiRemove(trendingKeys);
  } catch {}
}

export async function fetchAndCacheTemplatesFromServer(apiUrl: string): Promise<void> {
  try {
    const res = await fetch(new URL("/api/templates", apiUrl).href);
    if (!res.ok) return;
    const templates: Record<string, string> = await res.json();
    await Promise.all(
      Object.entries(templates).map(async ([key, content]) => {
        if (!content) return;
        // Check if it's a lang-specific key (e.g., "share_en", "details_fr", "cart_pt")
        const langMatch = key.match(/^(.+)_(en|fr|pt)$/);
        if (langMatch) {
          const [, baseKey, lang] = langMatch;
          const storageKey = getLangStorageKey(baseKey, lang);
          await AsyncStorage.setItem(storageKey, content);
        } else {
          // Original Arabic key — use existing TEMPLATE_KEY_MAP
          const storageKey = TEMPLATE_KEY_MAP[key];
          if (storageKey) {
            await AsyncStorage.setItem(storageKey, content);
          }
        }
      })
    );
  } catch (error) {
    console.warn("Failed to fetch templates from server:", error);
  }
}
