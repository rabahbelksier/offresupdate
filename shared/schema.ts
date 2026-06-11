import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, serial, integer, bigint, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 6 }).primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  password: text("password").notNull(),
  country: text("country").notNull(),
  online: text("online").default("off"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow(),
  temps: bigint("temps", { mode: "number" }).default(0),
  desactive: timestamp("desactive"),
});

// Admin login table - filled manually by admin directly in DB
export const adminLogin = pgTable("admin_login", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

// Message templates: one row per template key
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified coupon_codes table: one row per coupon value per country
export const couponCodes = pgTable("coupon_codes", {
  id: serial("id").primaryKey(),
  country: text("country"),
  value: text("value"),
  cod1: text("cod_1"),
  cod2: text("cod_2"),
  cod3: text("cod_3"),
  cod4: text("cod_4"),
  cod5: text("cod_5"),
  cod6: text("cod_6"),
  cod7: text("cod_7"),
  cod8: text("cod_8"),
  cod9: text("cod_9"),
  cod10: text("cod_10"),
  cod11: text("cod_11"),
  cod12: text("cod_12"),
  cod13: text("cod_13"),
  cod14: text("cod_14"),
  cod15: text("cod_15"),
  cod16: text("cod_16"),
  cod17: text("cod_17"),
  cod18: text("cod_18"),
  cod19: text("cod_19"),
  cod20: text("cod_20"),
  couponTitle: text("coupon_title"),
});

// Unified offres table: one table for all countries
export const offres = pgTable("offres", {
  id: serial("id").primaryKey(),
  title: text("title"),
  price: text("price"),
  sellerCoupon: text("seller_coupon"),
  productUrl: text("product_url"),
  info: text("info"),
  country: text("country"),
  date: timestamp("date", { withTimezone: true }).defaultNow(),
  currentPrice: text("current_price"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  // Auto-enriched from AliExpress API / Microlink (retried when null or failed value)
  imageUrl:     text("image_url"),
  storeName:    text("store_name"),
  shopUrl:      text("shop_url"),
  evaluateRate: text("evaluate_rate"),
  categoryName: text("category_name"),
  ordersCount:  text("orders_count"),
  // Promo codes — fetched once from coupon_codes table, never updated (even if empty)
  promoCode1:  text("promo_code_1"),
  promoCode2:  text("promo_code_2"),
  promoCode3:  text("promo_code_3"),
  promoValue:  text("promo_value"),
});

// Offres metadata: last update timestamp per country (for auto-sync)
export const offresMeta = pgTable("offres_meta", {
  country: text("country").primaryKey(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
});

export const updateTable = pgTable("update", {
  id: serial("id").primaryKey(),
  message: text("message"),
  messageEn: text("message_en"),
  messageFr: text("message_fr"),
  messagePt: text("message_pt"),
  link: text("link"),
  version: text("version"),
});

// Unified pub table: one row per ad per country — "إعلان عرض"
export const pubTable = pgTable("pub", {
  id: serial("id").primaryKey(),
  productName: text("product_name"),
  price: text("price"),
  link: text("link"),
  promoCode: text("promo_code"),
  codeValue: text("code_value"),
  country: text("country"),
  image: text("image"),
  sellerCoupon: text("seller_coupon"),
  sellerCouponValue: text("seller_coupon_value"),
  note: text("note"),
  active: text("active").default("on"),
});

// General ad table — "إعلان عام"
export const pub2Table = pgTable("pub_2", {
  id: serial("id").primaryKey(),
  image: text("image"),
  note: text("note"),
  buttonLabel: text("button_label"),
  buttonLink: text("button_link"),
  country: text("country"),
  // "on" = always show (default), "off" = show once per user then hide forever
  active: text("active").default("on"),
});

export const sharApp = pgTable("shar_app", {
  id: serial("id").primaryKey(),
  contentEn: text("content_en"),
  contentAr: text("content_ar"),
});

export const socialTable = pgTable("social", {
  id: serial("id").primaryKey(),
  telegram: text("telegram"),
  facebook: text("facebook"),
  tiktok: text("tiktok"),
  bot: text("bot"),
});

export const insertOffreSchema = createInsertSchema(offres).omit({ id: true });
export type Offre = typeof offres.$inferSelect;
export type InsertOffre = z.infer<typeof insertOffreSchema>;

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, online: true, createdAt: true })
  .extend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email format"),
    birthDate: z.string().min(1, "Birth date is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    country: z.string().min(1, "Country is required"),
  });

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

// Sales calendar: one row = one calendar entry
export const calendrier = pgTable("calendrier", {
  id: serial("id").primaryKey(),
  title: text("title"),
  linkImg: text("link_img"),
  info: text("info"),
  titleEn: text("title_en"),
  titleFr: text("title_fr"),
  titlePt: text("title_pt"),
  infoEn: text("info_en"),
  infoFr: text("info_fr"),
  infoPt: text("info_pt"),
});

// Coin collection: one row = one button
export const coin = pgTable("coin", {
  id: serial("id").primaryKey(),
  title: text("title"),
  titleEn: text("title_en"),
  titleFr: text("title_fr"),
  titlePt: text("title_pt"),
  link: text("link"),
  info: text("info"),
  infoEn: text("info_en"),
  infoFr: text("info_fr"),
  infoPt: text("info_pt"),
});

// Sale event images: one row = one image with a link
export const sale = pgTable("sale", {
  id: serial("id").primaryKey(),
  linkImg: text("link_img"),
  link: text("link"),
  country: text("country"), // null or empty = all countries
});

// Support chat messages between users and admin
export const messagesUsers = pgTable("messages_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 6 }).notNull(),
  message: text("message"),
  messageAdmin: text("message_admin"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  app: text("app").default("offres 365 app"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  isReadByAdmin: text("is_read_by_admin").default("false"),
});

// Cart items for bundle offer feature
export const cartTable = pgTable("cart", {
  id: serial("id").primaryKey(),
  linkcart: text("linkcart"),
  pricecart: text("pricecart"),
});

export type CartItem = typeof cartTable.$inferSelect;

// Hot products cache: cached responses from aliexpress.affiliate.hotproduct.query
export const hotProductsCache = pgTable("hot_products_cache", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  pageNo: integer("page_no").notNull(),
  filters: text("filters"),
  responseData: text("response_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Microlink scraping cache — avoids cold-start latency on first product lookup
export const microlinkCache = pgTable("microlink_cache", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull().unique(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  cachedAt: timestamp("cached_at").defaultNow(),
});

// Push notification tokens: one row per device
export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  active: text("active").notNull().default("true"),
  userId: varchar("user_id", { length: 6 }),
  welcomeSent: text("welcome_sent").notNull().default("false"),
  notifyOffers: text("notify_offers").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PushToken = typeof pushTokens.$inferSelect;

// Trending products: tracks how many times each product has been searched, per country
export const trendingTable = pgTable("trending", {
  productId: text("product_id").notNull(),
  country: text("country").notNull().default("DZ"),
  quantity: integer("quantity").notNull().default(1),
  title: text("title"),
  imageUrl: text("image_url"),
  price: text("price"),
  originalPrice: text("original_price"),
  discount: text("discount"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.country] }),
}));

export type TrendingProduct = typeof trendingTable.$inferSelect;

// AI Offer Requests: user requests a product offer, admin processes it
export const offreUsers = pgTable("offre_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 6 }).notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // User-submitted original data (never overwritten)
  userLink: text("user_link"),
  userLinkImg: text("user_link_img"),
  userDetails: text("user_details"),
  country: text("country"),
  createdUserAt: timestamp("created_user_at", { withTimezone: true }).defaultNow(),
  // Admin-filled data (overwrite link/link_img/details)
  link: text("link"),
  linkImg: text("link_img"),
  details: text("details"),
  title: text("title"),
  price: text("price"),
  codeValue: text("code_value"),
  couponVondor: text("coupon_vondor"),
  status: text("status"), // null = pending, 'yes' = processed, 'no' = cancelled
  createdAdminAt: timestamp("created_admin_at", { withTimezone: true }),
});

export type OffreUser = typeof offreUsers.$inferSelect;
