import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

const isProduction = process.env.NODE_ENV === "production";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

const APP_LINK = "https://offres365page.up.railway.app/";
const BOT_LINK = "https://t.me/rabahcopons/7219";

// Default message templates - mirrored from client/lib/storage.ts
const DEFAULT_TEMPLATES: Record<string, string> = {
  message: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
🔗 رابط المتجر: {shopUrl}`,

  share: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
{bundle_page_link}`,

  details: `🛍️ عنوان المنتج: {title}
💰 السعر قبل: {originalPrice}
💸 السعر بعد: {price}
🔥 نسبة التخفيض: {discount}
📦 عدد الطلبات: {orders}
🏷️ اسم الفئة: {first_level_category_name}
🏪 اسم المتجر: {storeName}
⭐ تقييم المتجر: {evaluateRate}
🔗 رابط المتجر: {shopUrl}`,

  copyAll: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
🔗 رابط المتجر: {shopUrl}`,

  trending: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
{trending}`,

  coin_link: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
{coin_link}`,

  direct_link: `🔥 تخفيض على {title}
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
{direct_link}`,

  super_link: `غـــيـــر الجديــــــــد عــرض الـســــوبــر😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{super_link}`,

  big_save_link: `🔥 تخفيض على {title}
💰 السعر [ $ ] :
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{big_save_link}`,

  limited_link: `غـــيـــر الجديــــــــد عــرض مــحـــــدود😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{limited_link}`,

  potential_link: `غـــيـــر الجديــــــــد عــرض مــحـتـمـل😍
🔥 تخفيض على {title}
💶 السعر: [ $ ] 
📎رابط تطبيق العروض Offres365👇
${APP_LINK}
📎رابط البوت👇
${BOT_LINK} 
📎رابط الشراء👇
{potential_link}`,

  bundle_direct_link: `غـــيـــر الجديــــــــد في عــروض البــانـدل 3 قطع😍
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
{bundle_direct_link}`,

  bundle_page_link: `غـــيـــر الجديــــــــد في عــروض البــانـدل 3 قطع😍
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
{bundle_page_link}`,

  cart: `غـيـر الـجـديـد مـع عـرض التـجـمـيـع فـي الـسـلـة😍
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
{cart_link10}`,

  cart_note: `🔸ملاحظة: الرابط الاول ضع منه {cart_link1_count} قطع والروابط الاخرى قطعة من كل رابط`,

  best_seller: `غـــيـــر الجديــــــــد ما تراطيــــــش😍
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
 {shopUrl}`,
};

// ─── Multi-language template seeds (EN / FR / PT) ──────────────────────────
// Keys follow the convention: {baseKey}_{lang} (e.g. share_en, cart_fr)
// These are seeded with ON CONFLICT DO NOTHING so existing admin edits are preserved.
const DEFAULT_TEMPLATES_MULTILANG: Record<string, string> = {
  // ── ENGLISH ────────────────────────────────────────────────────────────────
  share_en: `🔥 Amazing deal on {title}!
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

  message_en: `🔥 Amazing deal on {title}!
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

  details_en: `🛍️ Product: {title}
💰 Original Price: {originalPrice}
💸 Sale Price: {price}
🔥 Discount: {discount}
📦 Orders: {orders}
🏷️ Category: {first_level_category_name}
🏪 Store: {storeName}
⭐ Store Rating: {evaluateRate}
🔗 Store Link: {shopUrl}`,

  copyAll_en: `🔥 Amazing deal on {title}!
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

  trending_en: `🔥 Trending deal on {title}!
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

  coin_link_en: `🔥 Deal on {title}!
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

  direct_link_en: `🔥 Deal on {title}!
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

  super_link_en: `🔥 Super Deals on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{super_link}`,

  big_save_link_en: `🔥 Big Save Deal on {title}!
💰 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{big_save_link}`,

  limited_link_en: `🔥 Limited-Time Deal on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{limited_link}`,

  potential_link_en: `🔥 Potential Discount on {title}!
💵 Price: [ $ ]
📱 Offres365 App 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Buy Now 👇
{potential_link}`,

  bundle_direct_link_en: `🔥 Bundle Deal – 3 pcs of {title}!
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

  bundle_page_link_en: `🔥 Bundle Deal – 3 pcs of {title}!
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

  best_seller_en: `🔥 Hot Deal on {title}!
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

  cart_en: `🛒 Bundle Cart Method Deal!
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

  cart_note_en: `🔸 Note: Add {cart_link1_count} units from the first link, and 1 unit from each of the other links`,

  // ── FRENCH ─────────────────────────────────────────────────────────────────
  share_fr: `🔥 Super offre sur {title} !
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

  message_fr: `🔥 Super offre sur {title} !
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

  details_fr: `🛍️ Produit : {title}
💰 Prix d'origine : {originalPrice}
💸 Prix réduit : {price}
🔥 Remise : {discount}
📦 Commandes : {orders}
🏷️ Catégorie : {first_level_category_name}
🏪 Boutique : {storeName}
⭐ Note boutique : {evaluateRate}
🔗 Lien boutique : {shopUrl}`,

  copyAll_fr: `🔥 Super offre sur {title} !
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

  trending_fr: `🔥 Offre tendance sur {title} !
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

  coin_link_fr: `🔥 Offre sur {title} !
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

  direct_link_fr: `🔥 Offre sur {title} !
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

  super_link_fr: `🔥 Super Deals sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{super_link}`,

  big_save_link_fr: `🔥 Big Save sur {title} !
💰 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{big_save_link}`,

  limited_link_fr: `🔥 Offre à durée limitée sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{limited_link}`,

  potential_link_fr: `🔥 Réduction potentielle sur {title} !
💵 Prix : [ $ ]
📱 Application Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Acheter 👇
{potential_link}`,

  bundle_direct_link_fr: `🔥 Pack Bundle 3 pcs {title} !
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

  bundle_page_link_fr: `🔥 Pack Bundle 3 pcs {title} !
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

  best_seller_fr: `🔥 Super offre sur {title} !
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

  cart_fr: `🛒 Méthode Panier – Offre groupée !
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

  cart_note_fr: `🔸 Remarque : Ajoutez {cart_link1_count} unités depuis le premier lien, et 1 unité depuis chacun des autres liens`,

  // ── PORTUGUESE ─────────────────────────────────────────────────────────────
  share_pt: `🔥 Oferta incrível em {title}!
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

  message_pt: `🔥 Oferta incrível em {title}!
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

  details_pt: `🛍️ Produto: {title}
💰 Preço original: {originalPrice}
💸 Preço com desconto: {price}
🔥 Desconto: {discount}
📦 Pedidos: {orders}
🏷️ Categoria: {first_level_category_name}
🏪 Loja: {storeName}
⭐ Avaliação da loja: {evaluateRate}
🔗 Link da loja: {shopUrl}`,

  copyAll_pt: `🔥 Oferta incrível em {title}!
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

  trending_pt: `🔥 Oferta em alta: {title}!
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

  coin_link_pt: `🔥 Oferta em {title}!
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

  direct_link_pt: `🔥 Oferta em {title}!
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

  super_link_pt: `🔥 Super Deals em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{super_link}`,

  big_save_link_pt: `🔥 Oferta Big Save em {title}!
💰 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{big_save_link}`,

  limited_link_pt: `🔥 Oferta por tempo limitado em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{limited_link}`,

  potential_link_pt: `🔥 Desconto potencial em {title}!
💵 Preço: [ $ ]
📱 App Offres365 👇
${APP_LINK}
🤖 Bot 👇
${BOT_LINK}
🛒 Comprar 👇
{potential_link}`,

  bundle_direct_link_pt: `🔥 Pacote Bundle 3 unid. de {title}!
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

  bundle_page_link_pt: `🔥 Pacote Bundle 3 unid. de {title}!
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

  best_seller_pt: `🔥 Oferta incrível em {title}!
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

  cart_pt: `🛒 Método Carrinho – Oferta em conjunto!
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

  cart_note_pt: `🔸 Observação: Adicione {cart_link1_count} unidades pelo primeiro link e 1 unidade de cada um dos outros links`,
};

export async function verifyTables() {
  try {
    // ── users ────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(6) PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        birth_date DATE NOT NULL,
        password TEXT NOT NULL,
        country TEXT NOT NULL
      )
    `);
    // Migration: add online column if not exists
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS online TEXT DEFAULT 'off'`);
    // Migration: add created_at column if not exists (existing users get today's date)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await db.execute(sql`UPDATE users SET created_at = NOW() WHERE created_at IS NULL`);
    // Migration: add last_seen column for heartbeat-based online detection
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP`);
    // Migration: add temps column (total seconds spent in app)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS temps BIGINT DEFAULT 0`);
    await db.execute(sql`UPDATE users SET temps = 0 WHERE temps IS NULL`);
    // Migration: add desactive column (last disconnect timestamp)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS desactive TIMESTAMP`);
    // Reset all online statuses on server startup to avoid stale "on" values
    await db.execute(sql`UPDATE users SET online = 'off' WHERE online = 'on'`);

    // ── admin_login ──────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_login (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);

    // ── message_templates ────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed any missing default templates (insert new keys, preserve existing ones)
    for (const [key, content] of Object.entries(DEFAULT_TEMPLATES)) {
      await db.execute(sql`
        INSERT INTO message_templates (key, content) VALUES (${key}, ${content})
        ON CONFLICT (key) DO NOTHING
      `);
    }

    // Seed multilingual templates (EN / FR / PT) - preserve any existing admin edits
    for (const [key, content] of Object.entries(DEFAULT_TEMPLATES_MULTILANG)) {
      await db.execute(sql`
        INSERT INTO message_templates (key, content) VALUES (${key}, ${content})
        ON CONFLICT (key) DO NOTHING
      `);
    }

    // ── offres (unified, with country column) ────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS offres (
        id SERIAL PRIMARY KEY,
        title TEXT,
        price TEXT,
        seller_coupon TEXT,
        product_url TEXT,
        info TEXT,
        country TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        current_price TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS info TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS country TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT NOW()`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS current_price TEXT`);

    // ── offres_meta (auto-sync version tracking) ─────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS offres_meta (
        country TEXT PRIMARY KEY,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── coupon_codes ─────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coupon_codes (
        id SERIAL PRIMARY KEY,
        country TEXT,
        value TEXT,
        cod_1 TEXT,
        cod_2 TEXT,
        cod_3 TEXT,
        cod_4 TEXT,
        cod_5 TEXT,
        cod_6 TEXT,
        cod_7 TEXT,
        cod_8 TEXT,
        cod_9 TEXT,
        cod_10 TEXT,
        cod_11 TEXT,
        cod_12 TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS country TEXT`);
    await db.execute(sql`ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS value TEXT`);
    for (let i = 1; i <= 12; i++) {
      await db.execute(sql`ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS ${sql.raw(`cod_${i}`)} TEXT`);
    }

    // ── update ────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS update (
        id SERIAL PRIMARY KEY,
        message TEXT,
        link TEXT,
        version TEXT
      )
    `);

    // ── pub ───────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pub (
        id SERIAL PRIMARY KEY,
        product_name TEXT,
        price TEXT,
        link TEXT,
        promo_code TEXT,
        code_value TEXT,
        country TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS code_value TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS country TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS image TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS seller_coupon TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS seller_coupon_value TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS note TEXT`);
    await db.execute(sql`ALTER TABLE pub ADD COLUMN IF NOT EXISTS active TEXT DEFAULT 'on'`);

    // ── pub_2 (general ad table) ──────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pub_2 (
        id SERIAL PRIMARY KEY,
        image TEXT,
        note TEXT,
        button_label TEXT,
        button_link TEXT,
        country TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE pub_2 ADD COLUMN IF NOT EXISTS active TEXT DEFAULT 'on'`);

    // ── shar_app ──────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shar_app (
        id SERIAL PRIMARY KEY,
        content_en TEXT,
        content_ar TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE shar_app ADD COLUMN IF NOT EXISTS content_en TEXT`);
    await db.execute(sql`ALTER TABLE shar_app ADD COLUMN IF NOT EXISTS content_ar TEXT`);

    // ── social ────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social (
        id SERIAL PRIMARY KEY,
        telegram TEXT,
        facebook TEXT,
        tiktok TEXT,
        bot TEXT
      )
    `);

    const socialRows = await db.execute(sql`SELECT COUNT(*) as count FROM social`);
    const socialCount = Number((socialRows as any).rows?.[0]?.count || 0);
    if (socialCount === 0) {
      await db.execute(sql`
        INSERT INTO social (telegram, facebook, tiktok, bot)
        VALUES ('https://t.me/rabahcopons', 'https://www.facebook.com/share/14SzTie384J/', 'https://www.tiktok.com/@offres.365', 'https://t.me/rabahcoupons1bot')
      `);
      console.log("Default social links inserted");
    }

    // ── calendrier ────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS calendrier (
        id SERIAL PRIMARY KEY,
        title TEXT,
        link_img TEXT,
        info TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS title_en TEXT`);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS title_fr TEXT`);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS title_pt TEXT`);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS info_en TEXT`);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS info_fr TEXT`);
    await db.execute(sql`ALTER TABLE calendrier ADD COLUMN IF NOT EXISTS info_pt TEXT`);

    // ── coin ──────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coin (
        id SERIAL PRIMARY KEY,
        title TEXT,
        link TEXT,
        info TEXT
      )
    `);

    // ── sale ──────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sale (
        id SERIAL PRIMARY KEY,
        link_img TEXT,
        link TEXT
      )
    `);
    await db.execute(sql`ALTER TABLE sale ADD COLUMN IF NOT EXISTS country TEXT`);

    // ── cart ─────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        linkcart TEXT,
        pricecart TEXT
      )
    `);

    // ── hot_products_cache ───────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hot_products_cache (
        id SERIAL PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        page_no INTEGER NOT NULL,
        filters TEXT,
        response_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── microlink_cache ───────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS microlink_cache (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        image_url TEXT,
        cached_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── push_tokens ──────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        active TEXT NOT NULL DEFAULT 'true',
        welcome_sent TEXT NOT NULL DEFAULT 'false',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS welcome_sent TEXT NOT NULL DEFAULT 'false'
    `);
    await db.execute(sql`
      ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS user_id VARCHAR(6)
    `);
    await db.execute(sql`
      ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS notify_offers TEXT NOT NULL DEFAULT 'true'
    `);

    // Seed default notification message templates (base "all" keys + per-country keys)
    const notifTemplatesBase: Record<string, string> = {
      notif_coupon:     "🎟️ كوبونات جديدة متوفرة الآن! افتح التطبيق للاستفادة منها.",
      notif_offre:      "🔥 عرض رائج جديد: {title} بسعر {price}$",
      notif_sale:       "🛍️ حدث جديد متوفر! افتح التطبيق للاطلاع عليه.",
      notif_calendrier: "📅 رزنامة أحداث جديدة! افتح التطبيق للاطلاع على المواعيد.",
      notif_update:     "🔄 تحديث جديد للتطبيق متوفر! قم بالتحديث الآن.",
      notif_cart:       "🛒 طريقة السلة AI متوفرة الآن! استفد من أفضل الأسعار.",
      notif_welcome:    "👋 مرحباً بك في Offers 365! اكتشف أفضل عروض علي اكسبراس يومياً.",
    };

    // Country-specific notification templates (translated per language)
    const notifTemplatesPerCountry: Record<string, Record<string, string>> = {
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

    // Seed base ("all") templates
    for (const [key, content] of Object.entries(notifTemplatesBase)) {
      await db.execute(sql`
        INSERT INTO message_templates (key, content) VALUES (${key}, ${content})
        ON CONFLICT (key) DO NOTHING
      `);
    }

    // Seed per-country templates (key format: notif_coupon_dz, notif_offre_fr, …)
    for (const [country, templates] of Object.entries(notifTemplatesPerCountry)) {
      for (const [baseKey, content] of Object.entries(templates)) {
        const fullKey = `${baseKey}_${country}`;
        await db.execute(sql`
          INSERT INTO message_templates (key, content) VALUES (${fullKey}, ${content})
          ON CONFLICT (key) DO NOTHING
        `);
      }
    }

    // ── offres: add updated_at column for granular sync ──────────────────────
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);

    // ── offres: auto-enrichment columns (API / Microlink) ────────────────────
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS store_name TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS shop_url TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS evaluate_rate TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS category_name TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS orders_count TEXT`);
    // ── offres: promo code columns (fetched once, never updated) ────────────
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS promo_code_1 TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS promo_code_2 TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS promo_code_3 TEXT`);
    await db.execute(sql`ALTER TABLE offres ADD COLUMN IF NOT EXISTS promo_value TEXT`);
    await db.execute(sql`ALTER TABLE offres DROP COLUMN IF EXISTS promo_value_1`);
    await db.execute(sql`ALTER TABLE offres DROP COLUMN IF EXISTS promo_value_2`);
    await db.execute(sql`ALTER TABLE offres DROP COLUMN IF EXISTS promo_value_3`);
    // One-time reset: clear old promo data that was saved with wrong format
    // (value without currency symbol like "2" instead of "2 $").
    // Only resets rows where promoValue has no currency symbol at all (digits only or empty string).
    // After re-enrichment, value will be stored as "2 $" so this condition won't match again.
    await db.execute(sql`
      UPDATE offres
      SET promo_code_1 = NULL, promo_code_2 = NULL, promo_code_3 = NULL, promo_value = NULL
      WHERE promo_code_1 IS NOT NULL
        AND (
          promo_value IS NULL
          OR promo_value ~ '^[0-9.]+$'
          OR promo_value = ''
        )
    `);

    // ── trending (product search tracking, per country) ──────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trending (
        product_id TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'DZ',
        quantity INTEGER NOT NULL DEFAULT 1,
        title TEXT,
        image_url TEXT,
        price TEXT,
        original_price TEXT,
        discount TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (product_id, country)
      )
    `);
    // Migrate existing single-PK table to composite PK if not already done
    await db.execute(sql`ALTER TABLE trending ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'DZ'`);
    // Drop old single-column PK if it still exists (idempotent via DO block)
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'trending_pkey'
            AND contype = 'p'
            AND conrelid = 'trending'::regclass
            AND array_length(conkey, 1) = 1
        ) THEN
          ALTER TABLE trending DROP CONSTRAINT trending_pkey;
          ALTER TABLE trending ADD PRIMARY KEY (product_id, country);
        END IF;
      END$$
    `);

    // ── update: add multilang message columns ────────────────────────────────
    await db.execute(sql`ALTER TABLE "update" ADD COLUMN IF NOT EXISTS message_en TEXT`);
    await db.execute(sql`ALTER TABLE "update" ADD COLUMN IF NOT EXISTS message_fr TEXT`);
    await db.execute(sql`ALTER TABLE "update" ADD COLUMN IF NOT EXISTS message_pt TEXT`);

    // ── coin: add multilang title/info columns ────────────────────────────────
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS title_en TEXT`);
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS title_fr TEXT`);
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS title_pt TEXT`);
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS info_en TEXT`);
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS info_fr TEXT`);
    await db.execute(sql`ALTER TABLE coin ADD COLUMN IF NOT EXISTS info_pt TEXT`);

    // ── messages_users (support chat) ────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(6) NOT NULL,
        message TEXT,
        message_admin TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        app TEXT DEFAULT 'offres 365 app',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_read_by_admin TEXT DEFAULT 'false'
      )
    `);

    // ── offre_users (AI offer requests) ──────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS offre_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(6) NOT NULL,
        first_name TEXT,
        last_name TEXT,
        user_link TEXT,
        user_link_img TEXT,
        user_details TEXT,
        country TEXT,
        created_user_at TIMESTAMPTZ DEFAULT NOW(),
        link TEXT,
        link_img TEXT,
        details TEXT,
        title TEXT,
        price TEXT,
        code_value TEXT,
        coupon_vondor TEXT,
        status TEXT,
        created_admin_at TIMESTAMPTZ
      )
    `);

    console.log("Database tables verified/created successfully");
  } catch (error) {
    console.error("Error verifying/creating database tables:", error);
  }
}
