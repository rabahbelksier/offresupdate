# Offers 365 - Replit Agent Guide

## Overview

Offers 365 is a mobile utility application for AliExpress deal hunters. It aggregates promotional affiliate links and product details, helping users maximize savings and commissions. The app extracts product information from AliExpress URLs, generates multiple affiliate tracking links, and provides easy sharing/copying functionality.

**Core Purpose**: Power-user tool for generating and managing AliExpress affiliate links with product metadata extraction.

**Target Platforms**: iOS, Android, and Web (via Expo)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (Expo/React Native)

**Framework**: Expo SDK 54 with React Native 0.81, using the new architecture and React Compiler experimental features.

**Navigation Structure**:
- Root: Drawer Navigator (hamburger menu) containing Home, Settings, Message Design, App Guide
- Modal Stack: Product Details presented as a card modal from Home
- Persistent elements: Hamburger icon (top-left), Share icon (top-right), Social media footer on all screens

**State Management**:
- TanStack React Query for server state and API calls
- AsyncStorage for local persistence (recent products, settings, message templates)
- No authentication required - purely local utility tool

**Theming System**:
- Automatic light/dark mode support following system preferences
- AliExpress-inspired color palette (Primary: #FF6A00 orange, Secondary: #F5222D red, Accent: #FFD700 gold)
- Custom theme hook (`useTheme`) providing consistent color tokens

**Key UI Patterns**:
- Dual-action pattern: Every offer has three touch points (open, copy, share) in consistent horizontal layout
- Bold/commercial aesthetic with high-contrast, attention-grabbing design
- Montserrat font family for typography
- `ConfirmDeleteModal` component used for all admin delete actions (reusable, localized)

### Backend Architecture (Express.js)

**Server Framework**: Express 5 with TypeScript, running on Node.js

**API Responsibilities**:
- Product data extraction from AliExpress URLs via web scraping (Cheerio)
- Affiliate link generation using AliExpress API (`api-sg.aliexpress.com/sync`)
- URL resolution and product ID extraction from various AliExpress URL formats
- CORS handling for Expo web development

**Key Endpoints**:
- `POST /api/product` - Product search/extraction from AliExpress URLs, returns metadata and affiliate offers
- `GET /api/offres?country=XX&page=N` - Paginated trending offers (10/page), ordered by newest first
- `GET /api/offres/version?country=XX` - Returns `last_updated` timestamp (ms) from `offres_meta` as version number
- `POST /api/offres/sync` - Smart sync: client sends its current IDs + localVersion timestamp, server returns `{ added, updated, removed }`
- `GET /api/offres/search?country=XX&q=query` - Fuzzy search using Levenshtein distance (min score 0.25)
- `GET /api/offres/images?country=XX` - Batch load all offer images for country (returns id→imageUrl map)
- `GET /api/offres/single/:id` - Fetch a single offer by ID
- `GET /api/coupon-codes?country=XX` - Country-specific coupon codes (DZ, FR, ES, SA, BR, US, CA)
- `GET /api/update` - Check for app updates (returns version, message, link from update_table)
- `GET /api/pub?country=XX` - Get country-specific promotional popup data (returns productName, price, link, promoCode, codeValue)

**Scraping Strategy**:
- Primary: AliExpress affiliate API for offer generation
- Fallback: Web scraping with Cheerio for title/image when API doesn't support product

### Data Layer

**Database**: PostgreSQL with Drizzle ORM (schema in `shared/schema.ts`)
- `offres` — **single unified table** for all countries (country stored as a column, not separate tables). Fields: id, title, price, sellerCoupon, productUrl, info, country, date, currentPrice, updatedAt. Auto-enriched fields (filled server-side after first serve): imageUrl, storeName, shopUrl, evaluateRate, categoryName, ordersCount. Promo code fields (null = never fetched, "" = fetched but none found): promoCode1/Value1, promoCode2/Value2, promoCode3/Value3.
- `offres_meta` — tracks `last_updated` timestamp per country (primary key = country). Updated via `touchOffresMeta()` on every admin add/edit/delete. Used by clients to detect if local cache is stale.
- `coupon_codes` — unified coupon table (country as column)
- `social`: Single-row table storing social media links (telegram, facebook, tiktok, bot) - auto-seeded with defaults on first startup
- `update_table`: Stores latest app version info (version, message, link) - triggers update popup on every page when version differs
- `pub` — unified promotional ads table (country as column, fields: productName, price, link, promoCode, codeValue)
- Auto-migration: All tables created automatically on server startup in `server/db.ts`
- Database connection via `DATABASE_URL` environment variable

**Local Storage** (AsyncStorage):
- Recent products history
- User settings (language, theme, API credentials, shipping country)
- Message template customization
- Cached trending offers with images

### Build & Development

**Development Scripts**:
- `npm run expo:dev` - Start Expo development server
- `npm run server:dev` - Start Express backend with tsx
- `npm run db:push` - Push Drizzle schema to database

**Production Build**:
- `npm run expo:static:build` - Build static web bundle
- `npm run server:build` - Bundle server with esbuild
- `npm run server:prod` - Run production server

**Path Aliases**:
- `@/` → `./client/`
- `@shared/` → `./shared/`

## External Dependencies

### AliExpress Integration
- **API Endpoint**: `https://api-sg.aliexpress.com/sync`
- **Authentication**: App Key, App Secret, Tracking ID (stored in user settings)
- **Purpose**: Generate affiliate tracking links and fetch product offers

### Third-Party Services
- **Social Links**: Telegram (@rabahcopons), Facebook, TikTok channels for app promotion

### Key NPM Dependencies
- **expo** (SDK 54): Core mobile framework
- **@tanstack/react-query**: Server state management
- **drizzle-orm** + **pg**: Database ORM and PostgreSQL driver
- **cheerio**: HTML parsing for web scraping fallback
- **axios**: HTTP requests for API calls
- **react-native-reanimated**: Animation library
- **expo-clipboard**, **expo-haptics**, **expo-image**: Native feature access
- **@expo/vector-icons**: Icon library (FontAwesome5, Feather)

### Deployment (Railway Web Service)

**Production URL**: `https://offrestest.up.railway.app`

**BASE_URL**: Hardcoded in `client/lib/query-client.ts` as a constant. This ensures the URL is embedded in the APK after building.

**Data Flow**: Mobile App → `https://offrestest.up.railway.app/api/product` → Server fetches from AliExpress API → Returns data to App

**Expo Go via Railway**: The app runs on Expo Go by connecting to the production server. The server serves static JS bundles and manifests from `static-build/`. When a request comes with the `expo-platform` header (ios/android), the server returns the corresponding manifest. The landing page at the root URL provides a QR code and deep link (`exps://offrestest.up.railway.app`) for opening in Expo Go.

**Static Build**: `scripts/build.js` generates production bundles and manifests in `static-build/`. It sets `EXPO_PUBLIC_DOMAIN` to the Railway domain and updates all URLs (bundles, assets, icons) to point to the production server.

**EAS Project ID**: `7a60693a-e5f2-4a7f-8760-5d328090cfd2` (must match across `app.json` and `server/index.ts`)

**Render Build Command**: `npm install --include=dev && npm run expo:static:build && npm run server:build`
**Render Start Command**: `npm run server:prod`

**Database on Render**:
- Database Name: Offers365-db
- Username: offers365_user
- Database: offers365
- Set `DATABASE_URL` as environment variable on Render (server-side only)

### Environment Variables (Server-Side Only on Render)
- `DATABASE_URL`: PostgreSQL connection string (set in Render dashboard)

## Best Sellers Feature (Apr 2026)
- Home screen has three tabs: Home / Best Sellers / Trending, implemented in `client/screens/HomeScreen.tsx`. The old red "Trending Offers" hero CTA was removed.
- The Trending tab embeds `client/components/TrendingOffersView.tsx`, an extracted reusable component that contains all the logic that previously lived in `TrendingOffersScreen` (the screen file is now a thin wrapper around the view).
- New component `client/components/BestSellersView.tsx` shows a 2-column grid (10 per page) with search, min/max price filters, sort (LAST_VOLUME_DESC / SALE_PRICE_ASC / SALE_PRICE_DESC), and pagination (Next enabled if returned page is full — AliExpress's `total_page_no` is unreliable).
- Backend endpoint: `POST /api/hot-products` in `server/routes.ts` calls AliExpress `aliexpress.affiliate.hotproduct.query` (HMAC-SHA256 signed via `generateApiSignature`) and caches responses in the `hot_products_cache` table (24h TTL, key = JSON of request params).
- Schema: `hotProductsCache` table added in `shared/schema.ts`; ensured in `server/db.ts` `verifyTables()`.
- `ProductDetailsScreen` accepts `hideOffers?: boolean` and `bestSeller?: boolean` route params (typed in `client/navigation/RootStackNavigator.tsx`). BestSellersView navigates with `{ product, hideOffers: true, bestSeller: true }`.
- When `bestSeller` is true: only "Copy All" + "Share" appear in the action row (both use the new `best_seller` template via `getBestSellerTemplate()` which includes `{direct_link}` — falling back to `product.originalUrl` when no offers exist). Two large prominent buttons appear below: "Buy" (opens `originalUrl`) and "Product Offers" (calls `POST /api/product` to fetch full offers and replaces the current screen).
- New `best_seller` template added to `client/lib/storage.ts` (DEFAULT_BEST_SELLER_TEMPLATE, getBestSellerTemplate/saveBestSellerTemplate, TEMPLATE_KEY_MAP entry) and exposed as a tab in `client/screens/MessageDesignScreen.tsx` with the `award` icon.
- `PORT`: Server port (Render sets this automatically)
## v1.0.5 changes (Apr 2026)
- App version bumped to 1.0.5 (in `app.json`, `client/screens/AboutAppScreen.tsx`, `client/navigation/DrawerNavigator.tsx`, `client/screens/SettingsScreen.tsx`).
- ProductDetailsScreen action row: the four copy/share buttons (Copy All, Copy Title, Details, Share) are now laid out in a single row using `flex: 1` per button (no wrap), with reduced icon size and `numberOfLines={1} adjustsFontSizeToFit` so labels stay on one line on narrow screens.
- Product rating stars now use `FontAwesome` (filled solid star) instead of `Feather` (outline) — applied in `ProductDetailsScreen.tsx`, `OfferDetailsScreen.tsx`, `SearchView.tsx`, `SmartMatchView.tsx`, `BestSellersView.tsx`.
- Default templates in `client/lib/storage.ts` now mirror the live `message_templates` table content for `cart` (added warning note line), `cart_note` (full sentence with emoji), and `best_seller` (extra newline before `{shopUrl}` and leading space). The seeding defaults in `server/db.ts` were aligned for the same keys, including a new `best_seller` seed entry.
- Android edge-to-edge: `app.json` already has `android.edgeToEdgeEnabled: true` (Expo SDK 54), which addresses the Google Play deprecation notice for `setNavigationBarColor` / `LAYOUT_IN_DISPLAY_CUTOUT_MODE_*` by routing through `react-native-edge-to-edge` at build time. No runtime code in this repo calls the deprecated APIs directly.

## Android Home Screen Widget

### Architecture
- **Config Plugin**: `plugins/withAndroidWidget.js` — runs during `expo prebuild` / EAS build and injects all native Android files automatically. No manual editing of the `android/` directory required.
- **AppWidgetProvider**: `com.offers365.app.widget.OffersWidgetProvider` (Kotlin) — manages widget lifecycle (create, update, delete). Stores each widget's last URL in `SharedPreferences` keyed by widget ID.
- **WidgetInputActivity**: `com.offers365.app.widget.WidgetInputActivity` (Kotlin) — dialog-themed Activity that lets the user type or paste an AliExpress URL. On confirm, it saves the URL, refreshes the widget display, and opens the main app via deep link.
- **Deep Link**: `offers365://widget?url=<encoded-url>` — the widget triggers this intent; `HomeScreen.tsx` `handleUrl()` decodes the `url` query parameter and calls `getOffers()` immediately.

### Resource files injected by the plugin
| File | Purpose |
|---|---|
| `res/layout/widget_offers365.xml` | Widget home screen layout |
| `res/layout/activity_widget_input.xml` | URL input dialog layout |
| `res/xml/widget_info.xml` | `appwidget-provider` metadata (min size, preview, resize) |
| `res/drawable/widget_background.xml` | Orange→dark-red gradient, rounded corners |
| `res/drawable/widget_input_bg.xml` | Semi-transparent white URL area background |
| `res/drawable/widget_btn_bg.xml` | Gold "الحصول على العروض" button background |

### AndroidManifest entries (added by plugin)
- `<receiver android:name=".widget.OffersWidgetProvider" android:exported="true">` with `APPWIDGET_UPDATE` intent-filter and `@xml/widget_info` meta-data.
- `<activity android:name=".widget.WidgetInputActivity" android:exported="false" android:theme="@android:style/Theme.DeviceDefault.Dialog.NoActionBar">`.

### Build requirement
The plugin runs only during a **native build** (`eas build` or `expo prebuild`). A new APK/AAB must be built and installed for the widget to appear in the system widget picker.

## v1.0.7 changes (May 2026)

### Sale (Events) Country Targeting
- `country` column added to `sale` table (ALTER migration in `server/db.ts`).
- `GET /api/sale` filters by country: shows items where `country IS NULL OR country = '' OR LOWER(country) = userCountry`.
- Admin Events tab in `AdminOtherScreen` now has `CountryPickerWithAll` component in add mode, edit mode, and country shown on cards.
- `CountryPickerWithAll`: "all"/"" = كل الدول / All Countries (shown first), then SHIPPING_COUNTRIES dropdown.

### Save Icon on "الحصول على العروض" Button
- The `+` (plus) icon on the submit button in HomeScreen replaced with `save` icon (Feather). Functionality unchanged.

### WhatsApp-style Support Chat
- **Database**: `messages_users` table (id, user_id, first_name, last_name, email, message, message_admin, is_read_by_admin, created_at).
- **Backend routes** in `server/routes.ts`:
  - `POST /api/chat/send` — user sends message
  - `GET /api/chat/messages/:userId` — fetch user's message history
  - `GET /api/admin/chat/conversations` — admin: list all conversations (DISTINCT ON user_id, sorted latest)
  - `GET /api/admin/chat/messages/:userId` — admin: full message thread
  - `POST /api/admin/chat/reply` — admin sends reply
  - `PUT /api/admin/chat/read/:userId` — mark conversation read
  - `DELETE /api/admin/chat/conversation/:userId` — delete all messages for user
- **Client screens**:
  - `client/screens/SupportChatScreen.tsx` — user chat UI, polls every 10s, URL detection with Linking.openURL, date separators
  - `client/screens/admin/AdminChatsListScreen.tsx` — admin list with unread badge, search, pull-to-refresh
  - `client/screens/admin/AdminChatDetailScreen.tsx` — admin chat detail with reply, user info modal, delete conversation
- **Navigation**: all 3 screens registered in `RootStackNavigator.tsx` under authenticated stack
- **Entry points**: `AboutAppScreen` shows "مراسلة مباشرة مع الدعم" (→ SupportChat) for users and "دردشات المستخدمين" (→ AdminChatsList) for admins

## v1.0.6 changes (Apr 2026)
- **Templates now sync from DB on every relevant action** — the copy/share buttons in `ProductDetailsScreen` (`copyAll`, `copyDetails`, `shareProduct`) and `CartBundleSheet` consume `message_templates` rows via `getXxxTemplate()` helpers backed by AsyncStorage. To make sure all users always see admin edits, three refresh points were added:
  1. `client/App.tsx` calls `fetchAndCacheTemplatesFromServer(getApiUrl())` once on app mount, unconditionally (was previously gated on `loadUser` succeeding with a non-admin user inside `AuthContext`, which left admins and guests with stale defaults).
  2. `client/screens/MessageDesignScreen.tsx` `loadTemplates()` calls `fetchAndCacheTemplatesFromServer` before reading from cache, so the admin editor mirrors the live DB.
  3. `client/screens/ProductDetailsScreen.tsx` `copyAll`/`copyDetails`/`shareProduct` each call a small `refreshTemplatesFromServer()` helper before reading the template — best-effort, silent fallback to cache on network failure.
- **`message_templates` defaults aligned with live DB content** — the `cart` template in `client/lib/storage.ts` (DEFAULT_CART_TEMPLATE) and `server/db.ts` (DEFAULT_TEMPLATES.cart) was updated: label "🎟️كود كوبون : [ {couponcartValue} ]" → "🎟️قيمة التخفيض بالكوبون : [ {couponcartValue}$ ]", warning text "وقم بدفع الهاتف فقط" → "وقم بدفع منتجك فقط", and added blank lines surrounding the warning paragraph.
- **Cart bundle shipping calculation fix** — in `client/components/CartBundleSheet.tsx` `handleCouponSelect`, shipping was being subtracted from the final price along with the other discounts. It is now correctly added back: `finalP = price − (autoDiscount + sellerCoupon + couponcart + coinsDiscount) + shipping`.
- **Auto-install on fresh extraction** — when the project is unzipped into a new Replit account, the dev workflows can now bootstrap themselves:
  - `.npmrc` adds `include=dev` to override Replit's account-level `omit=dev` (which was silently skipping `tsx`, `drizzle-kit`, `babel-plugin-module-resolver`, `typescript`, etc.).
  - `scripts/install-if-needed.js` checks for a few critical packages (`tsx`, `expo`, `drizzle-kit`, `babel-plugin-module-resolver`) and runs `npm install --include=dev --no-audit --no-fund` if any are missing. Uses only Node built-ins so it runs before deps exist.
  - `package.json` exposes `preserver:dev` and `preexpo:dev` npm pre-script hooks plus a manual `npm run setup` shortcut, all pointing at the helper. Both `Start Backend` and `Start Frontend` workflows therefore self-install on first run.
