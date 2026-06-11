import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { setMaxListeners } from "node:events";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";
import * as crypto from "crypto";
import { db } from "./db";
import { sql, eq, asc, desc } from "drizzle-orm";
import { couponCodes, calendrier, coin, offres, users, messageTemplates, pubTable, pub2Table, sale as saleTable, hotProductsCache, cartTable, pushTokens, offresMeta, trendingTable, messagesUsers, offreUsers } from "@shared/schema";

function getAliexpressAppKey(): string | undefined {
  const direct = process.env["ALIEXPRESS_APP_KEY"];
  if (direct && direct.trim()) return direct.trim();
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("ALIEXPRESS_APP_KEY") && key !== "ALIEXPRESS_APP_KEY") {
      if (value && value.trim()) return value.trim();
      const suffix = key.slice("ALIEXPRESS_APP_KEY".length);
      if (suffix && /^\d+$/.test(suffix)) return suffix;
    }
  }
  return undefined;
}

interface ProductRequest {
  url: string;
  country?: string;
  currency?: string;
  language?: string;
  currentPrice?: string;
}

const SUPPORTED_PRODUCT_LANGUAGES = new Set([
  "AR", "EN", "FR", "PT", "ES", "KO", "DE", "IT",
]);

function normalizeProductLanguage(lang: unknown): string {
  if (typeof lang === "string") {
    const up = lang.trim().toUpperCase();
    if (SUPPORTED_PRODUCT_LANGUAGES.has(up)) return up;
  }
  return "EN";
}

interface OfferItem {
  key: string;
  name: string;
  link: string;
  success: boolean;
}

interface ProductResponse {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  price: string;
  originalPrice: string;
  discount: string;
  storeName: string;
  evaluateRate: string;
  shopUrl: string;
  categoryName: string;
  commissionRate: string;
  orders: string;
  shipping_fees: string;
  searchedAt: string;
  offers: OfferItem[];
  finalPrice?: string;
  couponValue?: string;
  promoCodes?: string[];
}

const ALIEXPRESS_API_URL = "https://api-sg.aliexpress.com/sync";
const API_TIMEOUT = 3500;

// Persistent HTTPS agent — reuses TCP+TLS connections to api-sg.aliexpress.com
// across requests, eliminating the ~150-350 ms handshake overhead per call.
const _aliHttpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 10 });
const aliApiClient = axios.create({
  baseURL: ALIEXPRESS_API_URL,
  timeout: API_TIMEOUT,
  httpsAgent: _aliHttpsAgent,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  maxRedirects: 0,
});

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = API_TIMEOUT,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts and sanitizes a single clean URL from arbitrary text input.
 * Handles cases where text surrounds the URL (e.g. "Check this https://... great!").
 * Returns the first valid http/https URL found, stripped of any trailing punctuation.
 * If no URL is found, returns the trimmed input as-is.
 */
function sanitizeInputUrl(input: string): string {
  const trimmed = input.trim();
  // Match the first http/https URL, stopping at whitespace or common non-URL chars
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
  if (!urlMatch) return trimmed;
  // Remove trailing punctuation that is almost never part of a URL
  const cleanUrl = urlMatch[0].replace(/[).,;:!?'"»›]+$/, "");
  return cleanUrl;
}

function extractProductId(text: string): string | null {
  const urlPattern = /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
  const urls = text.match(urlPattern);
  
  const targetUrl = urls?.find(url => 
    url.includes("aliexpress.com") || 
    url.includes("alix.live") || 
    url.includes("s.click.aliexpress.com")
  ) || text;
  // Patterns for specific product ID extraction from URLs
  const urlPatterns = [
    /[?&]productIds?=(\d+)/,
    /\/item\/(\d+)\.(?:html|htm)/,
    /\/item\/(\d+)(?:\?|$)/,
    /\/product\/(\d+)/,
    /\/i\/(\d+)/,
    /\/p\/[^/]+\/index\.html[?&]productIds?=(\d+)/,
    /\/ssr\/.*?[?&]productIds?=(\d+)/,
    /\/[a-z0-9]+\.html\?.*?productId(?:s)?=(\d+)/,
    /productIds=(\d+)/,
    /item\/(\d+)\.html/,
    /productIds=([^&]+)/,
  ];
  for (const pattern of urlPatterns) {
    const match = targetUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  // If no URL pattern matches, search for a long numeric string in the entire text
  const numericMatch = text.match(/\b\d{10,20}\b/);
  if (numericMatch) {
    return numericMatch[0];
  }
  return null;
}
function extractProductUrlFromStarLink(starUrl: string): string | null {
  try {
    const parsed = new URL(starUrl);
    const redirectUrl = parsed.searchParams.get("redirectUrl");
    if (redirectUrl) {
      const decoded = decodeURIComponent(redirectUrl);
      if (extractProductId(decoded)) {
        return decoded;
      }
    }
  } catch {}
  return null;
}

function extractProductUrlFromCookieSyncLink(url: string): string | null {
  try {
    if (!url.includes("sync_cookie_write") && !url.includes("sync_cookie_read")) {
      return null;
    }
    const parsed = new URL(url);
    const xmanGoto = parsed.searchParams.get("xman_goto");
    if (!xmanGoto) return null;
    const decoded = decodeURIComponent(xmanGoto);
    const productId = extractProductId(decoded);
    if (productId) {
      return `https://www.aliexpress.com/item/${productId}.html`;
    }
  } catch {}
  return null;
}

async function resolveRedirects(url: string): Promise<string> {
  const urlPattern = /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/;
  const match = url.match(urlPattern);
  const cleanUrl = match ? match[0] : url;

  // For short affiliate link domains, manually step through redirects one hop at a time.
  // Using redirect:"follow" causes infinite loops on a.aliexpress.com links that cycle
  // between /item/ → sync_cookie_read → sync_cookie_write → /item/ indefinitely.
  // Stepping manually lets us stop the moment a product ID becomes visible.
  if (
    cleanUrl.includes("a.aliexpress.com") ||
    cleanUrl.includes("s.click.aliexpress.com") ||
    cleanUrl.includes("alix.live")
  ) {
    const pidDirect = extractProductId(cleanUrl);
    if (pidDirect) {
      return cleanUrl.includes("/item/") ? cleanUrl : `https://www.aliexpress.com/item/${pidDirect}.html`;
    }
    try {
      let current = cleanUrl;
      const maxHops = 12;
      for (let hop = 0; hop < maxHops; hop++) {
        const resp = await fetch(current, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: AbortSignal.timeout(5000),
        });

        const location = resp.headers.get("location");

        // No redirect — try to extract from HTML body as last resort
        if (!location || resp.status < 300 || resp.status >= 400) {
          const html = await resp.text();
          const itemMatch = html.match(/aliexpress\.com\/item\/(\d{10,20})\.html/);
          if (itemMatch) {
            console.log("Short affiliate: found product ID in HTML:", itemMatch[1]);
            return `https://www.aliexpress.com/item/${itemMatch[1]}.html`;
          }
          break;
        }

        const nextUrl = location.startsWith("http")
          ? location
          : new URL(location, current).href;

        // Cookie-sync loop guard: extract real product URL from xman_goto param
        const cookieSyncUrl = extractProductUrlFromCookieSyncLink(nextUrl);
        if (cookieSyncUrl) {
          console.log("Short affiliate: cookie-sync resolved:", cookieSyncUrl.substring(0, 80));
          return cookieSyncUrl;
        }

        // Star link?
        const starUrl = extractProductUrlFromStarLink(nextUrl);
        if (starUrl) {
          console.log("Short affiliate: star link resolved:", starUrl.substring(0, 80));
          return starUrl;
        }

        // Product ID visible in this redirect URL — stop immediately
        const pid = extractProductId(nextUrl);
        if (pid) {
          const canonical = `https://www.aliexpress.com/item/${pid}.html`;
          console.log("Short affiliate: product ID found at hop", hop + 1, "→", canonical);
          return canonical;
        }

        current = nextUrl;
      }
    } catch (e) {
      console.error("Short affiliate manual follow failed:", (e as Error).message);
    }
    return cleanUrl;
  }

  try {
    let currentUrl = cleanUrl;
    const visitedUrls: string[] = [currentUrl];
    const maxRedirects = 10;

    for (let i = 0; i < maxRedirects; i++) {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });

      const locationHeader = response.headers.get("location");
      if (!locationHeader || (response.status < 300 || response.status >= 400)) {
        break;
      }

      const nextUrl = locationHeader.startsWith("http")
        ? locationHeader
        : new URL(locationHeader, currentUrl).href;

      visitedUrls.push(nextUrl);

      // Priority 1a: Extract product URL from AliExpress cookie-sync pages (xman_goto param).
      // These appear when short links redirect through login.aliexpress.us/sync_cookie_write.htm
      const productUrlFromCookieSync = extractProductUrlFromCookieSyncLink(nextUrl);
      if (productUrlFromCookieSync) {
        console.log("Found product URL in cookie-sync xman_goto param:", productUrlFromCookieSync);
        return productUrlFromCookieSync;
      }

      // Priority 1b: Extract product URL from star.aliexpress.com redirectUrl param.
      // Must be checked BEFORE extractProductId to avoid false positives from
      // timestamp-like numbers in parameters like aff_fcid.
      const productUrlFromStar = extractProductUrlFromStarLink(nextUrl);
      if (productUrlFromStar) {
        console.log("Found product URL in star redirectUrl param:", productUrlFromStar.substring(0, 100));
        return productUrlFromStar;
      }

      // Priority 2: Product ID directly visible in the redirect URL (e.g. /item/1234567890.html)
      const pidInRedirect = extractProductId(nextUrl);
      if (pidInRedirect) {
        // Already a canonical product URL — return as-is
        if (nextUrl.includes("/item/")) {
          console.log("Found canonical product URL in redirect:", nextUrl.substring(0, 100));
          return nextUrl;
        }
        // Mobile or promotional page (m.aliexpress.com/p/coin-index, deal pages, etc.)
        // These contain the productId in query params but are NOT product detail pages.
        // Microlink/scrapers would extract wrong metadata from them, so convert to canonical.
        const canonicalUrl = `https://www.aliexpress.com/item/${pidInRedirect}.html`;
        console.log("Promo/mobile redirect detected, converting to canonical URL:", canonicalUrl);
        return canonicalUrl;
      }

      // Priority 3: Try URL-decoding the entire location header
      try {
        const decoded = decodeURIComponent(nextUrl);
        if (decoded !== nextUrl && extractProductId(decoded)) {
          console.log("Found product ID in decoded redirect:", decoded.substring(0, 100));
          return decoded;
        }
      } catch {}

      currentUrl = nextUrl;
    }

    let resolvedUrl = visitedUrls[visitedUrls.length - 1];

    if (resolvedUrl.includes("star.aliexpress.com/share/share.htm")) {
      // First try to extract product URL from the redirectUrl query param (no extra request)
      const productUrlFromStar = extractProductUrlFromStarLink(resolvedUrl);
      if (productUrlFromStar) {
        console.log("Extracted product URL from star redirectUrl param:", productUrlFromStar.substring(0, 80));
        return productUrlFromStar;
      }

      console.log("Detected star.aliexpress.com redirect, following with GET...");
      try {
        const getResponse = await fetch(resolvedUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });
        const html = await getResponse.text();

        const redirectMatch = html.match(/url=([^"'\s>]+aliexpress\.com\/item\/\d+\.html[^"'\s>]*)/i) ||
          html.match(/href=["']([^"'\s>]+aliexpress\.com\/item\/\d+\.html[^"'\s>]*)["']/i) ||
          html.match(/window\.location\.href\s*=\s*["']([^"']+aliexpress\.com\/item\/\d+\.html[^"']*)["']/i) ||
          html.match(/location\.replace\(["']([^"']+aliexpress\.com\/item\/\d+\.html[^"']*)["']\)/i);
        
        if (redirectMatch) {
          resolvedUrl = redirectMatch[1];
          console.log("Extracted final URL from star redirect:", resolvedUrl.substring(0, 80));
        } else {
          const itemMatch = html.match(/aliexpress\.com\/item\/(\d+)\.html/);
          if (itemMatch) {
            resolvedUrl = `https://www.aliexpress.com/item/${itemMatch[1]}.html`;
            console.log("Extracted product URL from star page HTML:", resolvedUrl);
          } else {
            if (getResponse.url !== resolvedUrl && getResponse.url.includes("aliexpress.com")) {
              resolvedUrl = getResponse.url;
              console.log("Used GET response final URL:", resolvedUrl.substring(0, 80));
            }
          }
        }
      } catch (getError) {
        console.error("GET follow for star redirect failed:", (getError as Error).message);
      }
    }

    return resolvedUrl;
  } catch {
    return cleanUrl;
  }
}

function generateApiSignature(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  return crypto
    .createHmac("sha256", secret)
    .update(paramString)
    .digest("hex")
    .toUpperCase();
}

interface FallbackProductData {
  title: string;
  imageUrl: string | null;
  price: string;
  originalPrice: string;
  discount: string;
  storeName: string;
  orders: string;
}

function emptyFallback(): FallbackProductData {
  return { title: "", imageUrl: null, price: "", originalPrice: "", discount: "", storeName: "", orders: "" };
}

function extractDataFromHtml($: cheerio.CheerioAPI): FallbackProductData {
  const result = emptyFallback();

  const scripts = $("script");
  scripts.each((_, element) => {
    const content = $(element).html() || "";
    if (content.includes("window.runParams") || content.includes("runParams")) {
      try {
        const match = content.match(/(?:window\.)?runParams\s*=\s*(\{[\s\S]*?\});/);
        if (match) {
          const params = JSON.parse(match[1]);
          const d = params.data || params;
          result.title = d.productDetailModule?.title || d.titleModule?.subject || d.subject || "";
          result.imageUrl = d.imageModule?.imagePathList?.[0] || d.productDetailModule?.imagePathList?.[0] || null;

          const priceModule = d.priceModule || d.priceComponent || d.skuModule;
          if (priceModule) {
            result.price = priceModule.formatedActivityPrice || priceModule.formatedPrice || priceModule.minPrice || "";
            result.originalPrice = priceModule.formatedPrice || priceModule.maxPrice || "";
            result.discount = priceModule.discount?.toString() || "";
          }

          const storeModule = d.storeModule || d.sellerModule;
          if (storeModule) {
            result.storeName = storeModule.storeName || storeModule.name || "";
          }

          const tradeModule = d.tradeModule || d.quantityModule;
          if (tradeModule) {
            result.orders = tradeModule.formatTradeCount || tradeModule.tradeCount?.toString() || "";
          }
        }
      } catch (e) {}
    }

    if (content.includes('"skuAmount"') || content.includes('"actSkuCalPrice"')) {
      try {
        const priceMatch = content.match(/"(?:actSkuCalPrice|skuAmount|formatedActivityPrice)"\s*:\s*"([^"]+)"/);
        if (priceMatch && !result.price) {
          result.price = priceMatch[1];
        }
        const origMatch = content.match(/"(?:skuAmount|formatedPrice)"\s*:\s*"([^"]+)"/);
        if (origMatch && !result.originalPrice) {
          result.originalPrice = origMatch[1];
        }
      } catch (e) {}
    }
  });

  if (!result.title) {
    result.title = ($('meta[property="og:title"]').attr("content") as string) ||
      ($('meta[name="twitter:title"]').attr("content") as string) || $("title").text().trim() || "";
  }
  if (!result.imageUrl) {
    result.imageUrl = ($('meta[property="og:image"]').attr("content") as string) ||
      ($('meta[name="twitter:image"]').attr("content") as string) || null;
  }

  if (!result.price) {
    const priceEl = $('[class*="price"] .product-price-value, [data-spm="price"], .product-price-current');
    if (priceEl.length > 0) {
      result.price = priceEl.first().text().trim();
    }
  }

  if (result.title) {
    result.title = result.title.replace(/\s*[-|]\s*AliExpress\s*\d*\s*$/i, "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').substring(0, 250).trim();
  }
  if (result.imageUrl && result.imageUrl.startsWith("//")) {
    result.imageUrl = `https:${result.imageUrl}`;
  }

  return result;
}

// ── Direct scrape (replaces Microlink) ───────────────────────────────────────
// Uses axios (handles gzip/brotli decompression automatically) + Cheerio to
// extract title and image from the target page.
//
// Strategy (mirrors Python Telegram bot approach):
//   1. PRIMARY  — parse embedded JSON inside <script> tags ("subject", "imageUrl",
//                 "imagePathList"). This data survives bot-detection pages that
//                 strip og:meta tags entirely.
//   2. FALLBACK — og:title / <title> and og:image / first CDN <img> via Cheerio.
//
// Cookie handling: each scrapeFetchWithCookies() call maintains its OWN local
// cookie jar for the duration of that redirect chain — exactly like creating a
// fresh requests.Session() in Python for each product scrape.
// A shared global jar was intentionally removed: once AliExpress marks a session
// as suspicious, subsequent scrapes would inherit the bad cookies and fail too.

// ── Script-tag JSON extraction (PRIMARY method) ───────────────────────────────
// AliExpress always embeds structured product JSON inside <script> tags.
// Extracting from there is far more reliable than og:meta tags which AliExpress
// sometimes empties out when it suspects automated access.
function extractFromScriptTags(html: string): { title: string; imageUrl: string | null } {
  let title = "";
  let imageUrl: string | null = null;
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    const s = m[1];
    if (!title) {
      const t = s.match(/"subject"\s*:\s*"([^"]+)"/);
      if (t) title = t[1];
    }
    if (!imageUrl) {
      const i = s.match(/"imageUrl"\s*:\s*"([^"]+)"/)
             || s.match(/"imagePathList"\s*:\s*\[\s*"([^"]+)"/);
      if (i) imageUrl = i[1];
    }
    if (title && imageUrl) break;
  }
  return { title, imageUrl };
}

function extractFullOgTitle(html: string): string {
  // Find the raw <meta property="og:title"> tag (may span a single line)
  const tagMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*/i)
                || html.match(/<meta[^>]*og:title[^>]*/i);
  if (!tagMatch) return "";
  const rawTag = tagMatch[0];
  // Locate content=" and take everything up to the tag-closing sequence
  // which is either: " /> or "/> or " property= (next attribute)
  // Strategy: find the last occurrence of " immediately before /> or end
  const contentIdx = rawTag.search(/content=["']/i);
  if (contentIdx < 0) return "";
  const quoteChar = rawTag[contentIdx + 8]; // char after content=
  const valueStart = contentIdx + 9;        // index of first content char
  const rest = rawTag.slice(valueStart);
  // Strip trailing: closing quote + optional whitespace + /> or >
  const stripped = rest.replace(/["']\s*\/?$/, "").trim();
  return stripped;
}

// ── Persistent shared cookie jar — mirrors Python requests.Session() ─────────
// A single jar shared across ALL scrape calls so cookies from AliExpress
// accumulate over time (just like a real browser session). This prevents the
// cookie-sync redirect loop on /item/ URLs and reduces bot-detection because
// AliExpress sees a returning visitor with familiar cookies instead of a
// brand-new anonymous client on every request.
// Existing keys are overwritten with fresh values on every Set-Cookie response,
// keeping session tokens up to date automatically.
const _scrapeSessionJar = new Map<string, string>();

// ── Manual redirect follower with shared persistent cookie jar ────────────────
// Uses the module-level _scrapeSessionJar so cookies accumulate across calls —
// identical to Python requests.Session() being reused for every scrape.
// We follow redirects manually (maxRedirects: 0) so we can collect Set-Cookie
// from every hop, including the aliexpress.com → aliexpress.us sync chain.
const MAX_SCRAPE_REDIRECTS = 10;

async function scrapeFetchWithCookies(
  startUrl: string,
  timeoutMs: number,
  cancelToken: import("axios").CancelToken
): Promise<string | null> {
  // ── Shared cookie jar (persists across all scrape calls) ─────────────────
  const jar = _scrapeSessionJar;

  function addCookies(raw: string | string[] | undefined): void {
    if (!raw) return;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const h of list) {
      const pair = h.split(";")[0].trim();
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  function cookieHeader(): string {
    return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  // ─────────────────────────────────────────────────────────────────────────

  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_SCRAPE_REDIRECTS; hop++) {
    const cookieStr = cookieHeader();
    const response = await axios.get<string>(currentUrl, {
      cancelToken,
      timeout: timeoutMs,
      maxRedirects: 0,           // we follow manually
      responseType: "text",
      decompress: true,
      validateStatus: () => true, // accept any status; we inspect below
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": "https://www.aliexpress.com/",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
        ...(cookieStr ? { "Cookie": cookieStr } : {}),
      },
    });

    // Collect cookies from this hop before deciding what to do next
    addCookies(response.headers["set-cookie"]);

    const status = response.status;

    // Redirect → follow
    if ([301, 302, 303, 307, 308].includes(status) && response.headers["location"]) {
      let next = response.headers["location"] as string;
      if (!next.startsWith("http")) next = new URL(next, currentUrl).href;
      currentUrl = next;
      continue;
    }

    // Non-2xx final response → no usable HTML
    if (status >= 400) return null;

    // 2xx → return HTML
    return response.data as string;
  }

  throw new Error(`Maximum redirects exceeded (${MAX_SCRAPE_REDIRECTS})`);
}

async function tryDirectScrape(
  targetUrl: string,
  timeoutMs = 5000,
  externalSignal?: AbortSignal
): Promise<{ title: string; imageUrl: string | null; price: string }> {
  // Abort early if the external signal is already fired
  if (externalSignal?.aborted) return { title: "", imageUrl: null, price: "" };

  const axiosCancelSource = axios.CancelToken.source();
  const timeoutId = setTimeout(() => axiosCancelSource.cancel("timeout"), timeoutMs);

  // Forward external abort (e.g. API tier succeeded) to axios cancel
  const onExternalAbort = () => axiosCancelSource.cancel("aborted");
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    // Manual redirect following: collects cookies at every hop so the
    // aliexpress.com → aliexpress.us cookie-sync succeeds (mirrors requests.Session).
    const html = await scrapeFetchWithCookies(targetUrl, timeoutMs, axiosCancelSource.token);
    if (!html) return { title: "", imageUrl: null, price: "" };

    // ── Title & Image: PRIMARY — embedded script JSON ──────────────────────
    // AliExpress always has "subject" / "imageUrl" / "imagePathList" in script
    // JSON even when bot-detection strips og:meta. Same technique as Python bot.
    const fromScripts = extractFromScriptTags(html);

    // ── Title & Image: FALLBACK — og:meta + Cheerio ────────────────────────
    const $ = cheerio.load(html);
    const rawOgTitle = extractFullOgTitle(html);
    const cheerioOgTitle = $('meta[property="og:title"]').attr("content") || "";
    const titleTag = $("title").text() || "";
    const rawTitle = rawOgTitle.length > cheerioOgTitle.length ? rawOgTitle : cheerioOgTitle;

    // Script-extracted title wins; fall back to meta/tag
    let title = (fromScripts.title || rawTitle || titleTag)
      .replace(/\s*[-|]\s*AliExpress\s*\d*\s*$/i, "")
      .replace(/\.html$/i, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim();

    // Script-extracted image wins; fall back to og:image then first CDN <img>
    let imageUrl: string | null = fromScripts.imageUrl
      || $('meta[property="og:image"]').attr("content")
      || null;

    if (!imageUrl) {
      $("img").each((_i, el) => {
        const src = $(el).attr("src") || "";
        if (src.startsWith("http") && !src.includes("logo") && !src.includes("icon") && !src.includes("flag")) {
          imageUrl = src;
          return false; // break
        }
      });
    }
    if (imageUrl && imageUrl.startsWith("//")) imageUrl = `https:${imageUrl}`;

    // ── Price ──────────────────────────────────────────────────────────────
    const description = ($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "");
    const priceMatch = description.match(/(?:US\s*\$|USD\s*|€|\$)\s*([\d,.]+)/i);
    const price = priceMatch ? priceMatch[0].trim() : "";

    console.log(`DirectScrape OK ${targetUrl.substring(0, 60)} — title:${!!title} image:${!!imageUrl} [script:${!!fromScripts.title}/${!!fromScripts.imageUrl}]`);
    return { title, imageUrl, price };

  } catch (err) {
    if (!axios.isCancel(err)) {
      console.error(`DirectScrape error for ${targetUrl.substring(0, 60)}:`, (err as Error).message);
    }
    return { title: "", imageUrl: null, price: "" };
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

// ── Tier 3: Bot scrape — delegates scraping to the Python Telegram bot server ─
// The bot uses requests.Session() with proper cookie handling and follows
// /item/{id}.html redirects natively, which is more reliable than the Node.js
// direct scraper. Falls back gracefully when BOT_SCRAPE_URL is not configured.
async function scrapeViaBot(
  productId: string,
  externalSignal?: AbortSignal
): Promise<{ title: string; imageUrl: string | null }> {
  const empty = { title: "", imageUrl: null };
  const botUrl = process.env.BOT_SCRAPE_URL?.trim();
  const apiKey = process.env.SCRAPE_API_KEY?.trim() || "";
  if (!botUrl) return empty;
  if (externalSignal?.aborted) return empty;

  try {
    const url = `${botUrl}/scrape?product_id=${encodeURIComponent(productId)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, {}, 15000, externalSignal);
    if (!res.ok) {
      console.log(`Bot scrape: non-OK status ${res.status} for product ${productId}`);
      return empty;
    }
    const json = await res.json() as { title?: string; image_url?: string; error?: string };
    if (json.error) {
      console.log(`Bot scrape: error response for product ${productId}: ${json.error}`);
      return empty;
    }
    const title    = json.title?.trim()     || "";
    const imageUrl = json.image_url?.trim() || null;
    console.log(`Bot scrape OK for product ${productId} — title:${!!title} image:${!!imageUrl}`);
    return { title, imageUrl };
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.error(`Bot scrape error for product ${productId}:`, (err as Error).message);
    }
    return empty;
  }
}

// ── Scrape DB cache ───────────────────────────────────────────────────────────
// Direct-scrape results (title + image) are stored in PostgreSQL so every
// subsequent lookup — from any server instance — is answered in <10 ms.
// TTL: 7 days (product titles and images rarely change faster than that).
// The table is named microlink_cache (unchanged) to avoid a DB migration.
const MICROLINK_CACHE_TTL_DAYS = 7;

async function getMicrolinkCached(
  productId: string
): Promise<{ title: string; imageUrl: string | null } | null> {
  try {
    const cutoff = new Date(Date.now() - MICROLINK_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      SELECT title, image_url
      FROM microlink_cache
      WHERE product_id = ${productId}
        AND cached_at > ${cutoff}
      LIMIT 1
    `);
    const row = result.rows?.[0] as { title: string; image_url: string | null } | undefined;
    if (row) {
      console.log("Scrape DB cache HIT for product", productId);
      return { title: row.title, imageUrl: row.image_url };
    }
  } catch (e) {
    console.error("Scrape cache read error:", (e as Error).message);
  }
  return null;
}

async function setMicrolinkCache(
  productId: string,
  title: string,
  imageUrl: string | null
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO microlink_cache (product_id, title, image_url)
      VALUES (${productId}, ${title}, ${imageUrl})
      ON CONFLICT (product_id)
      DO UPDATE SET title = EXCLUDED.title,
                    image_url = EXCLUDED.image_url,
                    cached_at = NOW()
    `);
  } catch (e) {
    console.error("Scrape cache write error:", (e as Error).message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// ── Background offer enrichment ──────────────────────────────────────────────
//
// After serving /api/offres we fire-and-forget enrichment for any rows that
// still have null or well-known failure values in the auto-enrichment columns.
// Promo-code columns use null = "never fetched" / "" = "fetched, none found".
// Already-fetched successful values are NEVER overwritten.
// ─────────────────────────────────────────────────────────────────────────────

const ENRICH_FAILED_STORE = "Unknown Store";
const ENRICH_FAILED_NA    = "N/A";

// Maps country codes (lowercase) to their default currency for the AliExpress API.
// Must stay in sync with client/constants/countries.ts → SHIPPING_COUNTRIES[].currency.
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  dz: "USD",
  fr: "EUR",
  es: "EUR",
  sa: "SAR",
  br: "BRL",
  us: "USD",
  ca: "CAD",
  de: "EUR",
  it: "EUR",
  ae: "AED",
  kr: "KRW",
};

function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toLowerCase()] ?? "USD";
}

function offerNeedsEnrichment(o: typeof offres.$inferSelect): boolean {
  const needsAuto =
    !o.title       ||
    !o.imageUrl ||
    !o.storeName   || o.storeName   === ENRICH_FAILED_STORE ||
    !o.shopUrl     || o.shopUrl     === ENRICH_FAILED_NA    ||
    !o.evaluateRate|| o.evaluateRate=== ENRICH_FAILED_NA    ||
    !o.categoryName|| o.categoryName=== ENRICH_FAILED_NA    ||
    !o.ordersCount || o.ordersCount === ENRICH_FAILED_NA;
  const needsPromos = o.promoCode1 === null; // null = never attempted
  const needsCurrentPrice = !o.currentPrice || o.currentPrice === "N/A";
  return needsAuto || needsPromos || needsCurrentPrice;
}

// Track offers currently being enriched to avoid concurrent duplicates.
const enrichingIds = new Set<number>();

async function enrichSingleOffer(
  offer: typeof offres.$inferSelect,
  appKey: string,
  appSecret: string,
  trackingId: string
): Promise<void> {
  if (enrichingIds.has(offer.id)) return;
  enrichingIds.add(offer.id);
  try {
    if (!offer.productUrl) return;

    // ── Resolve product URL ─────────────────────────────────────────────────
    const directId = extractProductId(offer.productUrl);
    const isShortLink = !directId && (
      offer.productUrl.includes("s.click.aliexpress.com") ||
      offer.productUrl.includes("alix.live") ||
      offer.productUrl.includes("a.aliexpress.com")
    );
    let finalUrl = await resolveRedirects(offer.productUrl);
    const productId = extractProductId(finalUrl) || directId;
    if (!productId) return;
    if (!finalUrl.includes("/item/")) {
      finalUrl = `https://www.aliexpress.com/item/${productId}.html`;
    }
    const fallbackUrl = isShortLink ? offer.productUrl : finalUrl;

    const updates: Partial<typeof offres.$inferInsert> = {};

    // ── Auto-enrichment fields (API → Microlink fallback) ───────────────────
    const needsTitle        = !offer.title;
    const needsImage        = !offer.imageUrl;
    const needsStore        = !offer.storeName   || offer.storeName   === ENRICH_FAILED_STORE;
    const needsShopUrl      = !offer.shopUrl     || offer.shopUrl     === ENRICH_FAILED_NA;
    const needsEval         = !offer.evaluateRate|| offer.evaluateRate=== ENRICH_FAILED_NA;
    const needsCat          = !offer.categoryName|| offer.categoryName=== ENRICH_FAILED_NA;
    const needsOrders       = !offer.ordersCount || offer.ordersCount === ENRICH_FAILED_NA;
    const needsCurrentPrice = !offer.currentPrice || offer.currentPrice === "N/A";
    const needsAny          = needsTitle || needsImage || needsStore || needsShopUrl || needsEval || needsCat || needsOrders;

    // Use the currency that matches the offer's country so that:
    // 1. currentPrice is stored in the correct local currency.
    // 2. Promo-code threshold comparison is done in the same currency as the
    //    coupon_codes rows for that country (e.g. BRL for BR, SAR for SA).
    const offerCurrency = getCurrencyForCountry(offer.country || "dz");

    // Call the API when any auto-enrichment field is missing, or when we need
    // the current price (to save it) or need it for promo-code threshold matching.
    let apiData: Awaited<ReturnType<typeof getProductDetailsFromApi>> | null = null;
    if (needsAny || needsCurrentPrice || offer.promoCode1 === null) {
      try {
        apiData = await getProductDetailsFromApi(
          productId, appKey, appSecret, trackingId, "EN", offer.country || "", offerCurrency
        );
      } catch {}
    }

    if (apiData) {
      // Save title when admin left it blank — scraped/API value stored once, never overwritten
      if (needsTitle && apiData.title && apiData.title !== "Unknown Product")   updates.title        = apiData.title;
      if (needsImage   && apiData.imageUrl)                                     updates.imageUrl     = apiData.imageUrl;
      if (needsStore   && apiData.storeName   !== ENRICH_FAILED_STORE)          updates.storeName    = apiData.storeName;
      if (needsShopUrl && apiData.shopUrl     !== ENRICH_FAILED_NA)             updates.shopUrl      = apiData.shopUrl;
      if (needsEval    && apiData.evaluateRate!== ENRICH_FAILED_NA)             updates.evaluateRate = apiData.evaluateRate;
      if (needsCat     && apiData.categoryName!== ENRICH_FAILED_NA)             updates.categoryName = apiData.categoryName;
      if (needsOrders  && apiData.orders      !== ENRICH_FAILED_NA)             updates.ordersCount  = apiData.orders;
      // Save current price from API once in the correct local currency
      if (needsCurrentPrice && apiData.price && apiData.price !== "N/A") {
        updates.currentPrice = apiData.price;
      }
    }

    // Image (and title) fallback via Microlink if API couldn't provide them
    if (needsImage && !updates.imageUrl) {
      try {
        const fb = await getProductDetailsFallback(productId, appKey, appSecret, trackingId, fallbackUrl);
        if (fb.imageUrl && !fb.imageUrl.startsWith("data:")) {
          updates.imageUrl = fb.imageUrl;
          // Also populate microlink_cache so future /api/product Tier-3 calls hit DB
          if (fb.title && fb.title !== "AliExpress Product") {
            setMicrolinkCache(productId, fb.title, fb.imageUrl).catch(() => {});
          }
        }
        // Save scraped title when admin left it blank and the API also failed to provide one
        if (needsTitle && !updates.title && fb.title && fb.title !== "AliExpress Product") {
          updates.title = fb.title;
        }
      } catch {}
    } else if (needsTitle && !updates.title) {
      // API returned an image but no title — run scrape solely for the title
      try {
        const fb = await getProductDetailsFallback(productId, appKey, appSecret, trackingId, fallbackUrl);
        if (fb.title && fb.title !== "AliExpress Product") {
          updates.title = fb.title;
          if (fb.imageUrl) setMicrolinkCache(productId, fb.title, fb.imageUrl).catch(() => {});
        }
      } catch {}
    }

    // ── Promo codes (fetched once; null = never tried, "" = tried / none) ───
    // Uses the same bestCoupon logic as POST /api/product:
    // selects the row whose threshold ≤ currentPrice and is the highest threshold.
    // Saves the numeric value only (not "val/threshold"), and the best 3 codes.
    if (offer.promoCode1 === null) {
      try {
        const cc = (offer.country || "dz").toLowerCase();
        const allCoupons = await db.select().from(couponCodes)
          .where(eq(couponCodes.country, cc))
          .orderBy(desc(couponCodes.id));

        // Determine price for threshold comparison:
        // admin-set currentPrice takes priority, then freshly fetched API price.
        const priceStr = (offer.currentPrice && offer.currentPrice !== "N/A")
          ? offer.currentPrice
          : (updates.currentPrice || apiData?.price || "");
        const currentPriceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ""));

        const ENRICH_COD_KEYS = ['cod1','cod2','cod3','cod4','cod5','cod6','cod7','cod8','cod9','cod10','cod11','cod12'];
        let bestCoupon: { value: number; currency: string; codes: string[] } | null = null;
        let bestThreshold = -1;

        for (const couponRow of allCoupons) {
          const valStr = couponRow.value;
          if (!valStr) continue;
          const parts = valStr.split('/').map((s: string) => parseFloat(s.trim()));
          const cVal = parts[0];
          const cThreshold = parts[1];
          // Extract currency symbol from the coupon value string (e.g. "2/15$" → "$")
          const cCurrency = valStr.replace(/[\d.,\s/]/g, "").trim();
          if (!isNaN(cVal) && !isNaN(cThreshold) && !isNaN(currentPriceNum)) {
            if (cThreshold <= currentPriceNum && cThreshold > bestThreshold) {
              bestThreshold = cThreshold;
              const codes = ENRICH_COD_KEYS.map(k => (couponRow as any)[k]).filter(Boolean).slice(0, 3);
              bestCoupon = { value: cVal, currency: cCurrency, codes };
            }
          }
        }

        if (bestCoupon) {
          updates.promoCode1 = bestCoupon.codes[0] || "";
          updates.promoCode2 = bestCoupon.codes[1] || "";
          updates.promoCode3 = bestCoupon.codes[2] || "";
          // Store formatted value: "2 $" or "2 €" etc. — not just the raw number
          updates.promoValue = bestCoupon.currency
            ? `${bestCoupon.value} ${bestCoupon.currency}`
            : String(bestCoupon.value);
        } else if (allCoupons.length === 0) {
          // No coupons configured for this country → mark as attempted (empty)
          updates.promoCode1 = updates.promoCode2 = updates.promoCode3 = "";
          updates.promoValue = "";
        }
        // If coupons exist but price unknown/no match → don't mark as attempted;
        // leave promoCode1 = null so enrichment retries on the next request.
      } catch {
        // Mark as attempted so we don't retry on every request
        updates.promoCode1 = updates.promoCode2 = updates.promoCode3 = "";
        updates.promoValue = "";
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(offres).set(updates).where(eq(offres.id, offer.id));
      console.log(`Offer enriched [${offer.id}]: ${Object.keys(updates).join(", ")}`);
    }
  } catch (err) {
    console.log(`Offer enrichment error [${offer.id}]:`, (err as Error).message?.substring(0, 80));
  } finally {
    enrichingIds.delete(offer.id);
  }
}

async function triggerOffersEnrichment(
  rawOffers: (typeof offres.$inferSelect)[],
  appKey: string,
  appSecret: string,
  trackingId: string
): Promise<void> {
  const toEnrich = rawOffers.filter(o => offerNeedsEnrichment(o) && !enrichingIds.has(o.id));
  if (toEnrich.length === 0) return;
  // Process sequentially with a small delay to avoid API rate limits
  for (const offer of toEnrich) {
    await enrichSingleOffer(offer, appKey, appSecret, trackingId);
    await new Promise(r => setTimeout(r, 300));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function getProductDetailsFallback(
  productId: string,
  _appKey: string,
  _appSecret: string,
  _trackingId: string,
  originalUrl?: string,
  externalSignal?: AbortSignal
): Promise<FallbackProductData> {
  // ── Direct scrape strategy ────────────────────────────────────────────────
  //
  // Targets are fired in parallel in a "first success" race:
  // the moment any target returns a valid title + image we resolve
  // immediately and cancel remaining in-flight requests.
  //
  // externalSignal: fired when the AliExpress API tiers already succeeded,
  // so we stop waiting and free the request immediately.
  //
  // Priority order (listed first → preferred when multiple succeed):
  //   1. www/i/{id}   5.0 s — short /i/ URL, has og: tags in static HTML ✓
  //   2. m/i/{id}     5.0 s — mobile /i/ URL, independent CDN response ✓
  //   3. originalUrl  7.5 s — tracking link, only when distinct from above
  //
  // NOTE: /item/{id}.html is intentionally excluded — it redirects to
  // aliexpress.us which causes "Maximum redirects exceeded" errors.
  // ─────────────────────────────────────────────────────────────────────────
  const wwwIProductUrl = `https://www.aliexpress.com/i/${productId}.html`;
  const mobileUrl      = `https://m.aliexpress.com/i/${productId}.html`;

  type ScrapeTarget = { url: string; timeoutMs: number };
  const targets: ScrapeTarget[] = [
    { url: wwwIProductUrl, timeoutMs: 5000 },
    { url: mobileUrl,      timeoutMs: 5000 },
  ];
  // Add the tracking/original URL only when it's not one of the /i/ URLs above
  if (
    originalUrl &&
    originalUrl !== wwwIProductUrl &&
    originalUrl !== mobileUrl &&
    !originalUrl.includes("/item/")   // /item/ also hits the redirect loop
  ) {
    targets.push({ url: originalUrl, timeoutMs: 7500 });
  }

  // Titles matching these patterns are generic page titles, not product titles.
  const genericTitleRe = [
    /^buy products online from china/i,
    /^aliexpress/i,
    /wholesale/i,
    /^shop quality/i,
    /^bundle deals/i,
    /^coin page/i,
    /^flash sale/i,
    /^super deals/i,
  ];

  function isTitleValid(t: string): boolean {
    return !!t && t !== productId && !t.match(/^\d+\.html$/) &&
      !t.match(/\.html[?#]/i) && !genericTitleRe.some(p => p.test(t)) && t.length > 10;
  }

  // "First success" race: resolve with the first result that has title + image.
  // When externalSignal fires (API already succeeded), resolve immediately with
  // whatever partial data is available and cancel all in-flight Microlink fetches.
  const result = await new Promise<FallbackProductData>((resolve) => {
    let settled = 0;
    let resolved = false;
    let bestPartial = emptyFallback();

    const earlyResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve({ ...bestPartial });
      }
    };

    // If the caller signals cancellation (e.g. API succeeded), resolve early.
    if (externalSignal) {
      if (externalSignal.aborted) {
        earlyResolve();
      } else {
        externalSignal.addEventListener("abort", earlyResolve, { once: true });
      }
    }

    const tryResolve = (sc: { title: string; imageUrl: string | null; price: string }, label: string) => {
      const titleValid = isTitleValid(sc.title);
      if (!bestPartial.title && titleValid) bestPartial.title = sc.title;
      if (!bestPartial.imageUrl && sc.imageUrl) bestPartial.imageUrl = sc.imageUrl;
      if (!bestPartial.price && sc.price) bestPartial.price = sc.price;

      console.log(`Scrape ${label} - title: ${bestPartial.title ? "yes" : "no"} image: ${bestPartial.imageUrl ? "yes" : "no"}`);

      if (!resolved && bestPartial.title && bestPartial.imageUrl) {
        resolved = true;
        resolve({ ...bestPartial });
      }
    };

    for (const t of targets) {
      const label = t.url.substring(0, 60);
      tryDirectScrape(t.url, t.timeoutMs, externalSignal)
        .then(sc => {
          tryResolve(sc, label);
          settled++;
          if (settled === targets.length && !resolved) {
            resolved = true;
            resolve({ ...bestPartial });
          }
        })
        .catch(err => {
          console.error(`Scrape error ${label}:`, (err as Error).message);
          settled++;
          if (settled === targets.length && !resolved) {
            resolved = true;
            resolve({ ...bestPartial });
          }
        });
    }
  });

  if (!result.title || !result.imageUrl) {
    console.log("Scrape: all targets exhausted for product", productId,
      "- title:", result.title ? "yes" : "no", "- image:", result.imageUrl ? "yes" : "no");
  }

  if (!result.title) result.title = "AliExpress Product";
  return result;
}

async function getProductDetailsFromApi(
  productId: string,
  appKey: string,
  appSecret: string,
  trackingId: string,
  language: string = "EN",
  country: string = "DZ",
  currency: string = "USD",
  externalSignal?: AbortSignal
): Promise<{
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  storeName: string;
  evaluateRate: string;
  shopUrl: string;
  categoryName: string;
  commissionRate: string;
  orders: string;
  imageUrl: string | null;
  shipping_fees: string;
}> {
  try {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const params: Record<string, string> = {
      method: "aliexpress.affiliate.productdetail.get",
      app_key: appKey,
      sign_method: "sha256",
      timestamp,
      format: "json",
      v: "2.0",
      product_ids: productId,
      target_currency: currency,
      target_language: language,
      tracking_id: trackingId,
      fields: "commission_rate,sale_price,app_sale_price,original_price,product_main_image_url,product_title,evaluate_rate,lastest_volume,shop_url,shop_name,first_level_category_name,discount,target_sale_price,target_original_price,product_detail_url,product_small_image_urls,product_id,target_sale_price_currency,target_original_price_currency,ship_to_days",
    };
    // Only include country when specified — omitting it makes the API search
    // the global catalog, which works for products not in regional sub-catalogs.
    if (country && country.trim()) {
      params.country = country.trim();
    }

    params.sign = generateApiSignature(params, appSecret);

    let data: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (externalSignal?.aborted) throw new Error("Aborted");
      // aliApiClient reuses the persistent keep-alive connection — no TCP/TLS overhead
      const response = await aliApiClient.post("", new URLSearchParams(params).toString(), {
        signal: externalSignal as AbortSignal | undefined,
      });
      data = response.data;

      if (data.error_response) {
        if (data.error_response.code === "ApiCallLimit" && attempt < 2) {
          console.log(`Rate limited, retrying in ${(attempt + 1) * 1.5}s...`);
          await delay((attempt + 1) * 1500);
          delete params.sign;
          params.timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
          params.sign = generateApiSignature(params, appSecret);
          continue;
        }
        console.error("API Error:", data.error_response);
        throw new Error(data.error_response.msg || "API Error");
      }
      break;
    }

    const respResult = data.aliexpress_affiliate_productdetail_get_response?.resp_result;
    const result = respResult?.result;
    const products = result?.products?.product;

    if (!products || products.length === 0) {
      console.log(
        "API returned no products for ID:", productId,
        "| country:", country || "(global)",
        "| resp_code:", respResult?.resp_code ?? "unknown",
        "| count:", result?.current_record_count ?? 0
      );
      throw new Error("No product data returned");
    }

    const product = Array.isArray(products) ? products[0] : products;

    // Use specific info from the user provided API response structure for shipping and score
    // According to user, shipping_fees and product_score are in different calls/structure
    // But we should try to extract what we can from the available response.
    // The user provided a specific JSON structure:
    // result.result.ae_item_info.product_score
    // result.result.ae_item_sku_info[0].shipping_fees

    const salePrice =
      product.target_sale_price || product.app_sale_price || "N/A";
    const originalPrice =
      product.target_original_price || product.original_price || "N/A";

    let discount = product.target_discount || "";
    if (!discount && originalPrice !== "N/A" && salePrice !== "N/A") {
      try {
        const original = parseFloat(
          originalPrice.toString().replace(/[^0-9.]/g, "")
        );
        const sale = parseFloat(salePrice.toString().replace(/[^0-9.]/g, ""));
        if (original > 0 && sale > 0) {
          discount = `${(((original - sale) / original) * 100).toFixed(1)}%`;
        }
      } catch {
        discount = "";
      }
    }

    // Return raw store URL — affiliate link generation is deferred and done once
    // after the parallel fetch block, outside this function, to avoid blocking
    // both Tier 1 and Tier 2 with a redundant sequential API call each.
    const shopUrl = product.shop_url || "N/A";

    // Extraction of image from API
    const imageUrl = product.product_main_image_url || product.first_image_url || null;

    // Based on user input, we should prioritize product_score and shipping_fees from the structure they provided
    // However, getProductDetailsFromApi uses aliexpress.affiliate.productdetail.get
    // The user's provided JSON seems to be from a different call (ae_item_info)
    // For now, I will update the extraction logic to look for these specific fields if they exist in the response
    
    const evaluateRate = product.product_score || product.evaluate_rate || product.ae_item_info?.product_score || "N/A";
    const shipping_fees = product.shipping_fees || product.ae_item_sku_info?.[0]?.shipping_fees || "Free Shipping";
    const commissionRate = product.commission_rate || "0%";
    const categoryName = product.first_level_category_name || "N/A";

    return {
      title: product.product_title || "Unknown Product",
      price: `${salePrice} ${currency}`,
      originalPrice: `${originalPrice} ${currency}`,
      discount: discount || "0%",
      storeName: product.shop_name || "Unknown Store",
      evaluateRate: evaluateRate.toString(),
      shopUrl: shopUrl,
      categoryName: categoryName,
      commissionRate: commissionRate,
      orders: product.lastest_volume || "N/A",
      imageUrl: imageUrl,
      shipping_fees: shipping_fees.toString(),
    };
  } catch (error) {
    console.error("Error fetching product from API:", error);
    throw error;
  }
}

async function generateAffiliateLink(
  url: string,
  appKey: string,
  appSecret: string,
  trackingId: string
): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const params: Record<string, string> = {
      method: "aliexpress.affiliate.link.generate",
      app_key: appKey,
      sign_method: "sha256",
      timestamp,
      v: "2.0",
      format: "json",
      tracking_id: trackingId,
      promotion_link_type: "0",
      source_values: url,
    };

    params.sign = generateApiSignature(params, appSecret);

    for (let attempt = 0; attempt < 3; attempt++) {
      const apiResponse = await aliApiClient.post("", new URLSearchParams(params).toString());
      const data = apiResponse.data;

      if (data.error_response) {
        if (data.error_response.code === "ApiCallLimit" && attempt < 2) {
          await delay((attempt + 1) * 1500);
          delete params.sign;
          params.timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
          params.sign = generateApiSignature(params, appSecret);
          continue;
        }
        return null;
      }

      const result =
        data.aliexpress_affiliate_link_generate_response?.resp_result?.result;
      const promotionLinks = result?.promotion_links?.promotion_link;

      if (promotionLinks && promotionLinks.length > 0) {
        return promotionLinks[0].promotion_link;
      }
      return null;
    }

    return null;
  } catch (error) {
    console.error("Error generating affiliate link:", error);
    return null;
  }
}

async function generateAllOffers(
  productId: string,
  appKey: string,
  appSecret: string,
  trackingId: string
): Promise<OfferItem[]> {
  // Each offer has a primary URL (direct AliExpress format) and a secondary URL
  // (star.aliexpress.com/share wrapper) used as fallback when primary fails.
  const offers: Array<{
    key: string;
    name: string;
    primaryUrl: string;
    secondaryUrl: string;
  }> = [
    {
      key: "coin_link",
      name: "Coin Page Offer",
      primaryUrl: `https://m.aliexpress.com/p/coin-index/index.html?_immersiveMode=true&tabname=configTab_1926001&productIds=${productId}`,
      secondaryUrl: `https://m.aliexpress.com/p/coin-index/index.html?_immersiveMode=true&tabname=configTab_1926001&productIds=${productId}`,
    },
    {
      key: "direct_link",
      name: "Direct Product Link",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=620`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=620`,
    },
    {
      key: "super_link",
      name: "Super Deals",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=562`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=562`,
    },
    {
      key: "big_save_link",
      name: "Big Save Discount",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=680`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=680`,
    },
    {
      key: "limited_link",
      name: "Limited Discount",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=561`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=561`,
    },
    {
      key: "potential_link",
      name: "Potential Discount",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=504`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=504`,
    },
    {
      key: "bundle_direct_link",
      name: "Bundle Direct",
      primaryUrl: `https://www.aliexpress.com/item/${productId}.html?sourceType=570`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/item/${productId}.html?sourceType=570`,
    },
    {
      key: "bundle_page_link",
      name: "Bundle Deals Page",
      primaryUrl: `https://www.aliexpress.com/ssr/300000512/BundleDeals2?&pha_manifest=ssr&productIds=${productId}`,
      secondaryUrl: `https://star.aliexpress.com/share/share.htm?redirectUrl=https://www.aliexpress.com/ssr/300000512/BundleDeals2?&pha_manifest=ssr&productIds=${productId}`,
    },
  ];

  // Round 1: try all primary URLs in parallel using generateAffiliateLink (index-based,
  // avoids the source_value URL-matching fragility of the batch approach).
  console.log(`generateAllOffers [${productId}]: trying primary URLs...`);
  const primaryResults = await Promise.all(
    offers.map(o => generateAffiliateLink(o.primaryUrl, appKey, appSecret, trackingId))
  );
  const primaryCount = primaryResults.filter(Boolean).length;
  console.log(`generateAllOffers [${productId}]: primary ${primaryCount}/${offers.length}`);

  // If all primary succeeded, return immediately — no secondary calls needed.
  if (primaryCount === offers.length) {
    console.log(`generateAllOffers [${productId}]: all primary OK`);
    return offers.map((offer, i) => ({
      key: offer.key,
      name: offer.name,
      link: primaryResults[i]!,
      success: true,
    }));
  }

  // Round 2: for each offer where primary failed, try its secondary URL in parallel.
  const needsSecondary = offers.map((_, i) => !primaryResults[i]);
  console.log(`generateAllOffers [${productId}]: retrying ${needsSecondary.filter(Boolean).length} offers with secondary URLs...`);
  const secondaryResults = await Promise.all(
    offers.map((o, i) =>
      needsSecondary[i]
        ? generateAffiliateLink(o.secondaryUrl, appKey, appSecret, trackingId)
        : Promise.resolve(null)
    )
  );
  const secondaryCount = secondaryResults.filter(Boolean).length;
  console.log(`generateAllOffers [${productId}]: secondary ${secondaryCount}/${needsSecondary.filter(Boolean).length}`);

  // Build final results: primary link preferred, secondary as fallback, raw primary URL as last resort.
  return offers.map((offer, i) => {
    const link = primaryResults[i] || secondaryResults[i] || offer.primaryUrl;
    return {
      key: offer.key,
      name: offer.name,
      link,
      success: !!(primaryResults[i] || secondaryResults[i]),
    };
  });
}

import { storage } from "./storage";

// ─────────────────────────────────────────────────────────────────────────────
// Push Notification Utilities
// ─────────────────────────────────────────────────────────────────────────────

async function getActivePushTokens(notifyOffers?: true): Promise<string[]> {
  try {
    const result = notifyOffers
      ? await db.execute(sql`SELECT token FROM push_tokens WHERE active = 'true' AND notify_offers = 'true'`)
      : await db.execute(sql`SELECT token FROM push_tokens WHERE active = 'true'`);
    return ((result as any).rows || []).map((r: any) => r.token as string);
  } catch {
    return [];
  }
}

async function getNotifTemplate(key: string, country?: string): Promise<string> {
  try {
    if (country) {
      const countryKey = `${key}_${country.toLowerCase()}`;
      const countryRows = await db.select({ content: messageTemplates.content })
        .from(messageTemplates)
        .where(eq(messageTemplates.key, countryKey))
        .limit(1);
      if (countryRows[0]?.content) return countryRows[0].content;
    }
    const rows = await db.select({ content: messageTemplates.content })
      .from(messageTemplates)
      .where(eq(messageTemplates.key, key))
      .limit(1);
    return rows[0]?.content || "";
  } catch {
    return "";
  }
}

async function getActivePushTokensByCountry(country: string, notifyOffers?: true): Promise<string[]> {
  try {
    const result = notifyOffers
      ? await db.execute(sql`
          SELECT pt.token FROM push_tokens pt
          INNER JOIN users u ON pt.user_id = u.id
          WHERE pt.active = 'true' AND pt.notify_offers = 'true' AND UPPER(u.country) = UPPER(${country})
        `)
      : await db.execute(sql`
          SELECT pt.token FROM push_tokens pt
          INNER JOIN users u ON pt.user_id = u.id
          WHERE pt.active = 'true' AND UPPER(u.country) = UPPER(${country})
        `);
    return ((result as any).rows || []).map((r: any) => r.token as string);
  } catch {
    return [];
  }
}

async function getActivePushTokensByUserId(userId: string, notifyOffers?: true): Promise<string[]> {
  try {
    const result = notifyOffers
      ? await db.execute(sql`SELECT token FROM push_tokens WHERE user_id = ${userId} AND active = 'true' AND notify_offers = 'true'`)
      : await db.execute(sql`SELECT token FROM push_tokens WHERE user_id = ${userId} AND active = 'true'`);
    return ((result as any).rows || []).map((r: any) => r.token as string);
  } catch {
    return [];
  }
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;
  // Send in batches of up to 100 (Expo push API limit per request)
  const BATCH_SIZE = 100;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
      channelId: "offers365_v2",
      priority: "high",
      // TTL: 86400 s (24 h) — FCM will retry delivery for a day if device is offline
      ttl: 86400,
      // expiration: absolute unix timestamp (now + 24 h) as fallback for some platforms
      expiration: Math.floor(Date.now() / 1000) + 86400,
    }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    }).catch((err) => console.error("Push notification send error:", err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trending Products: track every product ID searched via "Get Offers"
// ─────────────────────────────────────────────────────────────────────────────

async function trackTrendingProduct(
  productId: string,
  country: string,
  score: number = 5,
  title?: string | null,
  imageUrl?: string | null,
  price?: string | null,
  originalPrice?: string | null,
  discount?: string | null
): Promise<void> {
  const countryCode = (country || "DZ").toUpperCase();
  try {
    await db.execute(sql`
      INSERT INTO trending (product_id, country, quantity, title, image_url, price, original_price, discount, updated_at)
      VALUES (
        ${productId},
        ${countryCode},
        ${score},
        ${title || null},
        ${imageUrl || null},
        ${price || null},
        ${originalPrice || null},
        ${discount || null},
        NOW()
      )
      ON CONFLICT (product_id, country) DO UPDATE
        SET quantity    = trending.quantity + ${score},
            title       = COALESCE(EXCLUDED.title, trending.title),
            image_url   = COALESCE(EXCLUDED.image_url, trending.image_url),
            price       = COALESCE(EXCLUDED.price, trending.price),
            original_price = COALESCE(EXCLUDED.original_price, trending.original_price),
            discount    = COALESCE(EXCLUDED.discount, trending.discount),
            updated_at  = NOW()
    `);
  } catch (err) {
    console.error("trackTrendingProduct error:", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ─────────────────────────────────────────────────────────────────────────
  // Debug endpoint (temporary)
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/debug/push-test", async (_req: Request, res: Response) => {
    try {
      const tokens = await getActivePushTokens();
      await sendPushNotifications(tokens, "Offers 365", "اختبار تشخيص من Railway", { screen: "Home" });
      res.json({ tokenCount: tokens.length, tokens, status: "sent" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Push Token Registration
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/admin/notify-subscribers", async (req: Request, res: Response) => {
    try {
      const { message, country } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      res.json({ message: "Notifications sent" });
      const getTokens = country
        ? getActivePushTokensByCountry(country)
        : getActivePushTokens();
      getTokens.then(async (tokens) => {
        if (tokens.length === 0) return;
        await sendPushNotifications(tokens, "Offers 365", message.trim(), { screen: "Home" });
      }).catch(() => {});
    } catch {
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  app.post("/api/push-token", async (req: Request, res: Response) => {
    try {
      const { token, userId } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid token" });
      }
      await db.execute(sql`
        INSERT INTO push_tokens (token, active, user_id, notify_offers, updated_at)
        VALUES (${token}, 'true', ${userId || null}, 'true', NOW())
        ON CONFLICT (token) DO UPDATE SET
          active = 'true',
          user_id = COALESCE(${userId || null}, push_tokens.user_id),
          updated_at = NOW()
      `);
      res.json({ message: "Token registered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to register token" });
    }
  });

  app.delete("/api/push-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid token" });
      }
      await db.execute(sql`
        UPDATE push_tokens SET active = 'false', updated_at = NOW() WHERE token = ${token}
      `);
      res.json({ message: "Token deactivated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate token" });
    }
  });

  app.put("/api/push-token/preferences", async (req: Request, res: Response) => {
    try {
      const { token, notifyOffers } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid token" });
      }
      await db.execute(sql`
        UPDATE push_tokens SET
          notify_offers = ${notifyOffers !== false ? 'true' : 'false'},
          updated_at = NOW()
        WHERE token = ${token}
      `);
      res.json({ message: "Preferences updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.get("/api/proxy/image", async (req: Request, res: Response) => {
    const urlParam = req.query.url as string;
    if (!urlParam || typeof urlParam !== "string") {
      return res.status(400).json({ message: "Missing url parameter" });
    }
    try {
      const decodedUrl = decodeURIComponent(urlParam);
      const response = await fetch(decodedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        return res.status(response.status).send("Upstream error");
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (error) {
      return res.status(500).json({ message: "Failed to proxy image" });
    }
  });

  app.get("/api/coupon-codes", async (req, res) => {
    try {
      const country = (req.query.country as string) || "DZ";
      const codes = await storage.getCouponCodes(country);
      res.json(codes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupon codes" });
    }
  });

  // ── Helper: country → UTC offset in hours ──────────────────────────────────
  function getCountryUtcOffset(country: string): number {
    const map: Record<string, number> = {
      dz: 1, fr: 1, es: 1, sa: 3, br: -3, us: -5, ca: -5,
      de: 1, it: 1, ae: 4, gb: 0, tr: 3, eg: 2,
    };
    return map[(country || "dz").toLowerCase()] ?? 0;
  }

  function formatDateWithOffset(date: Date | null | undefined, offsetHours: number): string | null {
    if (!date) return null;
    const ms = date.getTime() + offsetHours * 3600 * 1000;
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  // ── Helper: update offres_meta for a country ────────────────────────────────
  async function touchOffresMeta(country: string) {
    const cc = (country || "dz").toLowerCase();
    await db.execute(sql`
      INSERT INTO offres_meta (country, last_updated)
      VALUES (${cc}, NOW())
      ON CONFLICT (country) DO UPDATE SET last_updated = NOW()
    `);
  }

  // ── Fuzzy search helpers ─────────────────────────────────────────────────────
  function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function wordSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length <= 2 || b.length <= 2) return a === b ? 1.0 : 0.0;
    if (a.includes(b) || b.includes(a)) return 0.85;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return Math.max(0, 1 - dist / maxLen);
  }

  function fuzzyScore(title: string, query: string): number {
    if (!title || !query) return 0;
    const tl = title.toLowerCase().trim();
    const ql = query.toLowerCase().trim();
    if (tl === ql) return 1.0;
    if (tl.includes(ql)) return 0.92;
    const titleWords = tl.split(/\s+/).filter(Boolean);
    const queryWords = ql.split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return 0;
    let totalScore = 0;
    for (const qw of queryWords) {
      let bestMatch = 0;
      for (const tw of titleWords) {
        const sim = wordSimilarity(qw, tw);
        if (sim > bestMatch) bestMatch = sim;
      }
      totalScore += bestMatch;
    }
    return (totalScore / queryWords.length) * 0.8;
  }

  app.get("/api/offres", async (req, res) => {
    try {
      const country = (req.query.country as string) || "DZ";
      const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
      const pageSize = 10;
      const offset = (page - 1) * pageSize;
      const cc = country.toLowerCase();
      const offsetHours = getCountryUtcOffset(cc);

      const allOffers = await db.select().from(offres)
        .where(eq(offres.country, cc))
        .orderBy(desc(offres.id));

      const total = allOffers.length;
      const pageOffers = allOffers.slice(offset, offset + pageSize);

      const offersWithCodes = pageOffers.map(o => ({
        ...o,
        price_trending: o.price || "",
        info: o.info || "",
        cod_1: o.promoCode1 || "",
        cod_2: o.promoCode2 || "",
        cod_3: o.promoCode3 || "",
        promoValue: o.promoValue || "",
        currentPrice: (o as any).currentPrice || (o as any).current_price || null,
        date: formatDateWithOffset((o as any).date, offsetHours),
      }));

      res.json({ offers: offersWithCodes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });

      // Fire-and-forget background enrichment for rows with missing data
      const appKey    = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
      if (appKey && appSecret && trackingId) {
        triggerOffersEnrichment(pageOffers, appKey, appSecret, trackingId).catch(() => {});
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.get("/api/offres/single/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const country = ((req.query.country as string) || "dz").toLowerCase();
      const offsetHours = getCountryUtcOffset(country);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "Invalid ID" });
      const rows = await db.select().from(offres).where(eq(offres.id, id)).limit(1);
      if (rows.length === 0) return res.status(404).json({ message: "Offer not found" });
      const o = rows[0];
      res.json({
        ...o,
        price_trending: o.price || "",
        info: o.info || "",
        cod_1: o.promoCode1 || "",
        cod_2: o.promoCode2 || "",
        cod_3: o.promoCode3 || "",
        promoValue: o.promoValue || "",
        currentPrice: (o as any).current_price || null,
        date: formatDateWithOffset((o as any).date, offsetHours),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  app.get("/api/offres/version", async (req, res) => {
    try {
      const country = ((req.query.country as string) || "dz").toLowerCase();
      const rows = await db.execute(sql`SELECT last_updated FROM offres_meta WHERE country = ${country}`);
      const ts = (rows as any).rows?.[0]?.last_updated;
      if (ts) {
        res.json({ version: new Date(ts).getTime() });
      } else {
        const maxRow = await db.execute(sql`SELECT MAX(date) as maxdate FROM offres WHERE country = ${country}`);
        const maxDate = (maxRow as any).rows?.[0]?.maxdate;
        res.json({ version: maxDate ? new Date(maxDate).getTime() : 0 });
      }
    } catch (error) {
      res.status(500).json({ version: 0 });
    }
  });

  app.post("/api/offres/sync", async (req, res) => {
    try {
      const country = ((req.body.country as string) || "dz").toLowerCase();
      const clientIds: number[] = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
      // localVersion: timestamp (ms) of the client's last successful sync
      const localVersion: number = typeof req.body.localVersion === "number" ? req.body.localVersion : 0;
      const offsetHours = getCountryUtcOffset(country);

      const dbOffers = await db.select().from(offres)
        .where(eq(offres.country, country))
        .orderBy(desc(offres.id));

      const dbIds = new Set(dbOffers.map(o => o.id));
      const clientIdSet = new Set(clientIds);

      const mapOffer = (o: typeof dbOffers[number]) => ({
        ...o,
        price_trending: o.price || "",
        info: o.info || "",
        cod_1: o.promoCode1 || "",
        cod_2: o.promoCode2 || "",
        cod_3: o.promoCode3 || "",
        promoValue: o.promoValue || "",
        currentPrice: o.currentPrice || null,
        date: formatDateWithOffset((o as any).date, offsetHours),
      });

      // New offers the client doesn't have yet
      const added = dbOffers.filter(o => !clientIdSet.has(o.id)).map(mapOffer);

      // Only return offers that were actually edited after the client's last sync.
      // Drizzle ORM maps the "updated_at" DB column to the camelCase "updatedAt" key.
      const updated = localVersion > 0
        ? dbOffers.filter(o => {
            if (!clientIdSet.has(o.id)) return false;
            const updatedAt = o.updatedAt; // camelCase — matches Drizzle schema field name
            if (!updatedAt) return false;
            return new Date(updatedAt).getTime() > localVersion;
          }).map(mapOffer)
        : [];

      const removed = clientIds.filter(id => !dbIds.has(id));

      res.json({ added, updated, removed });
    } catch (error) {
      res.status(500).json({ added: [], updated: [], removed: [] });
    }
  });

  app.get("/api/offres/search", async (req, res) => {
    try {
      const country = ((req.query.country as string) || "dz").toLowerCase();
      const query = (req.query.q as string || "").trim();
      const offsetHours = getCountryUtcOffset(country);

      if (!query) {
        return res.json({ offers: [], total: 0 });
      }

      const allOffers = await db.select().from(offres)
        .where(eq(offres.country, country))
        .orderBy(desc(offres.id));

      const MIN_SCORE = 0.25;
      const scored = allOffers
        .map(o => ({ offer: o, score: fuzzyScore(o.title || "", query) }))
        .filter(x => x.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score);

      const results = scored.map(({ offer: o }) => ({
        ...o,
        price_trending: o.price || "",
        info: o.info || "",
        cod_1: o.promoCode1 || "",
        cod_2: o.promoCode2 || "",
        cod_3: o.promoCode3 || "",
        promoValue: o.promoValue || "",
        currentPrice: (o as any).currentPrice || (o as any).current_price || null,
        date: formatDateWithOffset((o as any).date, offsetHours),
      }));

      res.json({ offers: results, total: results.length });
    } catch (error) {
      res.status(500).json({ offers: [], total: 0 });
    }
  });

  app.get("/api/offres/images", async (req, res) => {
    try {
      const country = (req.query.country as string) || "DZ";
      const rawOffers = await storage.getOffres(country);
      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      const results: Record<number, string | null> = {};

      for (const offer of rawOffers) {
        if (!offer.productUrl) continue;
        try {
          // Determine if the stored URL is a tracking/short link before resolving redirects.
          const directProductId = extractProductId(offer.productUrl);
          const isTrackingLink = !directProductId && (
            offer.productUrl.includes("s.click.aliexpress.com") ||
            offer.productUrl.includes("alix.live") ||
            offer.productUrl.includes("a.aliexpress.com")
          );

          let finalUrl = await resolveRedirects(offer.productUrl);
          const productId = extractProductId(finalUrl) || directProductId;
          if (!productId) {
            results[offer.id] = null;
            continue;
          }
          if (!finalUrl.includes("/item/")) {
            finalUrl = `https://www.aliexpress.com/item/${productId}.html`;
          }

          // Pass the original tracking link to the fallback so Microlink gets a second
          // chance via redirect-following when the canonical URL hits bot detection.
          const fallbackOriginalUrl = isTrackingLink ? offer.productUrl : finalUrl;

          let imageUrl: string | null = null;

          if (appKey && appSecret && trackingId) {
            try {
              const apiResult = await getProductDetailsFromApi(productId, appKey, appSecret, trackingId, "EN", country);
              imageUrl = apiResult.imageUrl;
              if (imageUrl) {
                console.log("API image success for offer:", offer.id, "product:", productId);
              }
            } catch (apiErr) {
              console.log("API image failed for offer:", offer.id, "product:", productId, "error:", (apiErr as Error).message?.substring(0, 80));
            }
          }

          if (!imageUrl) {
            try {
              const fallback = await getProductDetailsFallback(productId, appKey || "", appSecret || "", trackingId || "", fallbackOriginalUrl);
              if (fallback.imageUrl && !fallback.imageUrl.startsWith("data:")) {
                imageUrl = fallback.imageUrl;
                console.log("Fallback image success for offer:", offer.id, "product:", productId);
              }
            } catch {
              console.log("Fallback image also failed for offer:", offer.id);
            }
          }

          results[offer.id] = imageUrl;
        } catch {
          results[offer.id] = null;
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Failed to fetch all offer images:", error);
      res.status(500).json({ message: "Failed to fetch offer images" });
    }
  });

  app.get("/api/update", async (_req, res) => {
    try {
      const data = await storage.getUpdate();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch update info" });
    }
  });

  app.get("/api/share-app", async (req, res) => {
    try {
      const lang = (req.query.lang as string) || "en";
      const content = await storage.getShareAppContent(lang);
      res.json({ content: content || "" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch share app content" });
    }
  });

  app.get("/api/social", async (_req, res) => {
    try {
      const data = await storage.getSocialLinks();
      res.json(data || { telegram: null, facebook: null, tiktok: null, bot: null });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social links" });
    }
  });

  app.get("/api/pub", async (req, res) => {
    try {
      const country = (req.query.country as string) || "DZ";
      const rows = await storage.getPub(country);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch promotional info" });
    }
  });

  app.post("/api/offres/image", async (req: Request, res: Response) => {
    try {
      const { productUrl } = req.body;
      if (!productUrl) {
        return res.status(400).json({ message: "productUrl is required" });
      }

      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      // Determine if this is a tracking/short link before resolving redirects.
      // Tracking links have no product ID visible and benefit from being passed
      // to Microlink directly so it can follow the redirect chain itself.
      const directProductId = extractProductId(productUrl);
      const isTrackingLink = !directProductId && (
        productUrl.includes("s.click.aliexpress.com") ||
        productUrl.includes("alix.live") ||
        productUrl.includes("a.aliexpress.com")
      );

      let finalUrl = await resolveRedirects(productUrl);
      const productId = extractProductId(finalUrl) || directProductId;
      if (!productId) {
        return res.json({ imageUrl: null });
      }
      if (!finalUrl.includes("/item/")) {
        finalUrl = `https://www.aliexpress.com/item/${productId}.html`;
      }

      // Pass the original tracking link to the fallback so Microlink gets a second
      // chance via redirect-following when the canonical URL hits bot detection.
      const fallbackOriginalUrl = isTrackingLink ? productUrl : finalUrl;

      let imageUrl: string | null = null;

      if (appKey && appSecret && trackingId) {
        try {
          const apiResult = await getProductDetailsFromApi(productId, appKey, appSecret, trackingId);
          imageUrl = apiResult.imageUrl;
        } catch {}
      }

      if (!imageUrl) {
        try {
          const fallback = await getProductDetailsFallback(productId, appKey || "", appSecret || "", trackingId || "", fallbackOriginalUrl);
          if (fallback.imageUrl && !fallback.imageUrl.startsWith("data:")) {
            imageUrl = fallback.imageUrl;
          }
        } catch {}
      }

      res.json({ imageUrl });
    } catch (error) {
      console.error("Failed to fetch offer image:", error);
      res.json({ imageUrl: null });
    }
  });

  // ── POST /api/scrape ─────────────────────────────────────────────────────────
  // Accepts { url } in the request body.
  // Fetches the page with Chrome-like headers and extracts og:title + og:image.
  // Returns { title, image } or { error }.
  app.post("/api/scrape", async (req: Request, res: Response) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "url is required" });
      }
      const result = await tryDirectScrape(url, 8000);
      if (!result.title && !result.imageUrl) {
        return res.status(422).json({ error: "Could not extract data from the provided URL" });
      }
      res.json({ title: result.title || null, image: result.imageUrl || null });
    } catch (error) {
      console.error("POST /api/scrape error:", (error as Error).message);
      res.status(500).json({ error: "Scrape failed" });
    }
  });

  app.post("/api/hot-products", async (req: Request, res: Response) => {
    try {
      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      if (!appKey || !appSecret || !trackingId) {
        return res.status(500).json({ message: "Server API credentials not configured" });
      }

      const {
        page_no = 1,
        keywords = "",
        min_price = "",
        max_price = "",
        sort = "LAST_VOLUME_DESC",
        currency = "USD",
        language = "AR",
        category_ids = "",
      } = req.body || {};

      const pageNum = Math.max(1, parseInt(String(page_no)) || 1);
      const filtersObj = {
        keywords: String(keywords || "").trim(),
        min_price: String(min_price || "").trim(),
        max_price: String(max_price || "").trim(),
        sort: String(sort || "LAST_VOLUME_DESC"),
        currency: String(currency || "USD"),
        language: String(language || "AR"),
        category_ids: String(category_ids || "").trim(),
      };
      const cacheKey = JSON.stringify({ page_no: pageNum, ...filtersObj });

      // Check cache
      try {
        const cached = await db
          .select()
          .from(hotProductsCache)
          .where(eq(hotProductsCache.cacheKey, cacheKey))
          .limit(1);
        if (cached.length > 0 && cached[0].createdAt) {
          const ageMs = Date.now() - new Date(cached[0].createdAt).getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            return res.json(JSON.parse(cached[0].responseData));
          }
        }
      } catch (e) {
        console.error("Cache lookup failed:", e);
      }

      // The hotproduct.query method only reliably honours its default
      // popularity-style ordering and IGNORES min_sale_price / max_sale_price,
      // which is why the price-range filter on Best Sellers returns mixed
      // products unrelated to the chosen min/max range. Branch to
      // aliexpress.affiliate.product.query whenever the user picks a
      // SALE_PRICE_* sort OR provides a min/max price — that endpoint honours
      // both sorting and price filtering correctly. All other sorts (default
      // popularity, volume, etc.) keep using hotproduct.query unchanged.
      const isPriceSort =
        filtersObj.sort === "SALE_PRICE_ASC" ||
        filtersObj.sort === "SALE_PRICE_DESC";
      const hasPriceRange =
        filtersObj.min_price !== "" || filtersObj.max_price !== "";
      const useProductQuery = isPriceSort || hasPriceRange;
      const apiMethod = useProductQuery
        ? "aliexpress.affiliate.product.query"
        : "aliexpress.affiliate.hotproduct.query";
      const responseKey = useProductQuery
        ? "aliexpress_affiliate_product_query_response"
        : "aliexpress_affiliate_hotproduct_query_response";

      // Build API params
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
      const params: Record<string, string> = {
        method: apiMethod,
        app_key: appKey,
        sign_method: "sha256",
        timestamp,
        format: "json",
        v: "2.0",
        page_no: String(pageNum),
        page_size: "20",
        sort: filtersObj.sort,
        target_currency: filtersObj.currency,
        target_language: filtersObj.language,
        tracking_id: trackingId,
        fields: "product_id,product_title,product_main_image_url,target_sale_price,target_original_price,target_sale_price_currency,target_original_price_currency,discount,evaluate_rate,lastest_volume,shop_name,shop_url,first_level_category_name,commission_rate,product_detail_url,sale_price,original_price,product_small_image_urls",
      };
      if (filtersObj.keywords) params.keywords = filtersObj.keywords;
      // AliExpress expects min_sale_price / max_sale_price as integer CENTS,
      // not decimal currency units. The user types human-readable amounts
      // (e.g. "10" for $10), so we multiply by 100 and floor to integer cents
      // before forwarding to the API. Without this, "10" was being treated as
      // 10 cents and returned products priced at ~$0.10 mixed with others —
      // which is exactly what the user reported.
      const toCents = (v: string): string | null => {
        const n = parseFloat(v);
        if (!Number.isFinite(n) || n < 0) return null;
        return String(Math.round(n * 100));
      };
      if (filtersObj.min_price) {
        const cents = toCents(filtersObj.min_price);
        if (cents !== null) params.min_sale_price = cents;
      }
      if (filtersObj.max_price) {
        const cents = toCents(filtersObj.max_price);
        if (cents !== null) params.max_sale_price = cents;
      }
      if (filtersObj.category_ids) params.category_ids = filtersObj.category_ids;

      params.sign = generateApiSignature(params, appSecret);

      let data: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const apiResponse = await fetchWithTimeout(ALIEXPRESS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(params).toString(),
        });
        data = await apiResponse.json();

        if (data.error_response) {
          if (data.error_response.code === "ApiCallLimit" && attempt < 2) {
            await delay((attempt + 1) * 1500);
            delete params.sign;
            params.timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
            params.sign = generateApiSignature(params, appSecret);
            continue;
          }
          console.error("Hot products API Error:", data.error_response);
          return res.status(502).json({ message: data.error_response.msg || "API Error" });
        }
        break;
      }

      const result = data?.[responseKey]?.resp_result?.result;
      const productsRaw = result?.products?.product || [];
      const rawProducts = Array.isArray(productsRaw) ? productsRaw : [productsRaw];

      // Generate affiliate links for each product (product URL + store URL) in parallel
      const products = await Promise.all(
        rawProducts.map(async (p: any) => {
          const productId = p.product_id;
          const cleanProductUrl = productId
            ? `https://www.aliexpress.com/item/${productId}.html`
            : null;

          let rawShopUrl: string | null = p.shop_url || null;
          if (rawShopUrl && rawShopUrl.startsWith("//")) {
            rawShopUrl = `https:${rawShopUrl}`;
          }
          const shopUrl =
            rawShopUrl && rawShopUrl.includes("/store/") ? rawShopUrl : null;

          const [productLinkResult, storeLinkResult] = await Promise.allSettled([
            cleanProductUrl
              ? generateAffiliateLink(cleanProductUrl, appKey, appSecret, trackingId)
              : Promise.resolve(null),
            shopUrl
              ? generateAffiliateLink(shopUrl, appKey, appSecret, trackingId)
              : Promise.resolve(null),
          ]);

          return {
            ...p,
            affiliate_product_url:
              productLinkResult.status === "fulfilled"
                ? productLinkResult.value || null
                : null,
            affiliate_store_url:
              storeLinkResult.status === "fulfilled"
                ? storeLinkResult.value || null
                : null,
          };
        })
      );

      const payload = {
        products,
        total_record_count: result?.total_record_count || products.length,
        total_page_no: result?.total_page_no || 1,
        current_page_no: result?.current_page_no || pageNum,
        current_record_count: result?.current_record_count || products.length,
      };

      // Save to cache (upsert)
      try {
        await db
          .insert(hotProductsCache)
          .values({
            cacheKey,
            pageNo: pageNum,
            filters: JSON.stringify(filtersObj),
            responseData: JSON.stringify(payload),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: hotProductsCache.cacheKey,
            set: {
              responseData: JSON.stringify(payload),
              createdAt: new Date(),
            },
          });
      } catch (e) {
        console.error("Cache write failed:", e);
      }

      return res.json(payload);
    } catch (error) {
      console.error("Error fetching hot products:", error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch hot products",
      });
    }
  });

  app.post("/api/smart-match", async (req: Request, res: Response) => {
    try {
      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      if (!appKey || !appSecret || !trackingId) {
        return res.status(500).json({ message: "Server API credentials not configured" });
      }

      const {
        page_no = 1,
        keywords = "",
        product_id = "",
        currency = "USD",
        language = "AR",
        min_price = "",
        max_price = "",
        sort = "",
        country: userCountry = "",
      } = req.body || {};

      const GENERIC_WORDS = new Set([
        'global', 'version', 'new', 'original', 'genuine', 'official',
        '1pcs', '2pcs', '3pcs', 'hd', 'free', 'shipping', 'sale', 'hot',
        'for', 'with', 'and', 'the', 'in', 'of', 'to', 'a', 'an', 'best',
        'high', 'quality', 'portable', 'wireless', 'bluetooth',
      ]);
      const extractMeaningfulWords = (kw: string): string[] =>
        kw.trim().split(/\s+/).filter(w => w.length > 1 && !GENERIC_WORDS.has(w.toLowerCase()));

      const truncateKeywords = (kw: string): string => {
        const words = extractMeaningfulWords(kw).slice(0, 5).join(" ");
        return words.length > 60 ? words.slice(0, 60).trim() : words || kw.trim().split(/\s+/).slice(0, 4).join(" ");
      };

      const pageNum = Math.max(1, parseInt(String(page_no)) || 1);
      const fallbackKeywords = "trending deals popular";
      const allowedSorts = new Set(["SALE_PRICE_ASC", "SALE_PRICE_DESC", "LAST_VOLUME_DESC"]);
      const sortStr = String(sort || "").trim();
      const resolvedCountry = String(userCountry || "").trim().toLowerCase() || "global";
      const filtersObj = {
        keywords: truncateKeywords(String(keywords || "").trim()),
        product_id: String(product_id || "").trim(),
        currency: String(currency || "USD"),
        language: String(language || "AR"),
        min_price: String(min_price || "").trim(),
        max_price: String(max_price || "").trim(),
        sort: allowedSorts.has(sortStr) ? sortStr : "",
      };

      // When the user supplies a price range OR a price-sort, smartmatch is not
      // appropriate (it ignores both). Branch to aliexpress.affiliate.product.query
      // which honours keywords + price range + SALE_PRICE_* sorts correctly.
      const useProductQuery =
        filtersObj.min_price !== "" ||
        filtersObj.max_price !== "" ||
        filtersObj.sort === "SALE_PRICE_ASC" ||
        filtersObj.sort === "SALE_PRICE_DESC";

      // AliExpress min_sale_price/max_sale_price are integer CENTS, not decimal units.
      const toCents = (v: string): string | null => {
        const n = parseFloat(v);
        if (!Number.isFinite(n) || n < 0) return null;
        return String(Math.round(n * 100));
      };

      const cacheKey = JSON.stringify({ smt: 1, page_no: pageNum, country: resolvedCountry, ...filtersObj });

      // Check cache (1 hour)
      try {
        const cached = await db
          .select()
          .from(hotProductsCache)
          .where(eq(hotProductsCache.cacheKey, cacheKey))
          .limit(1);
        if (cached.length > 0 && cached[0].createdAt) {
          const ageMs = Date.now() - new Date(cached[0].createdAt).getTime();
          if (ageMs < 60 * 60 * 1000) {
            return res.json(JSON.parse(cached[0].responseData));
          }
        }
      } catch (e) {
        console.error("SmartMatch cache lookup failed:", e);
      }

      const callApi = async (paramsBase: Record<string, string>): Promise<any> => {
        const params = { ...paramsBase };
        for (let attempt = 0; attempt < 3; attempt++) {
          params.timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
          params.sign = generateApiSignature(params, appSecret);
          const apiResponse = await fetchWithTimeout(ALIEXPRESS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params).toString(),
          });
          const data = await apiResponse.json();
          if (data.error_response) {
            if (data.error_response.code === "ApiCallLimit" && attempt < 2) {
              await delay((attempt + 1) * 1500);
              continue;
            }
            return { error: data.error_response };
          }
          return { data };
        }
        return { error: { msg: "Retries exhausted" } };
      };

      const buildParams = (extra: Record<string, string>): Record<string, string> => {
        const base: Record<string, string> = {
          method: "aliexpress.affiliate.product.smartmatch",
          app_key: appKey,
          sign_method: "sha256",
          format: "json",
          v: "2.0",
          page_no: String(pageNum),
          page_size: "10",
          tracking_id: trackingId,
          target_currency: filtersObj.currency,
          target_language: filtersObj.language,
          country: resolvedCountry,
          fields:
            "product_id,product_title,product_main_image_url,target_sale_price,target_original_price,target_sale_price_currency,target_original_price_currency,discount,evaluate_rate,lastest_volume,shop_name,shop_url,first_level_category_name,commission_rate,product_detail_url,sale_price,original_price",
          timestamp: "",
        };
        return { ...base, ...extra };
      };

      const extra: Record<string, string> = {};
      const deviceType = "GAID";
      const deviceIdValue = crypto
        .createHash("md5")
        .update(`${pageNum}|${filtersObj.keywords}|${filtersObj.product_id}|stateless`)
        .digest("hex");
      extra.device = deviceType;
      extra.device_id = deviceIdValue;
      if (filtersObj.product_id) extra.product_id = filtersObj.product_id;
      if (filtersObj.keywords) extra.keywords = filtersObj.keywords;

      let apiResult: any;
      const extractProducts = (data: any) => {
        const result =
          data?.aliexpress_affiliate_product_smartmatch_response?.resp_result?.result;
        const productsRaw = result?.products?.product || [];
        const list = Array.isArray(productsRaw) ? productsRaw : [productsRaw];
        return { list, result };
      };

      const extractFromProductQuery = (data: any) => {
        const result =
          data?.aliexpress_affiliate_product_query_response?.resp_result?.result;
        const productsRaw = result?.products?.product || [];
        const list = Array.isArray(productsRaw) ? productsRaw : [productsRaw];
        return { list, result };
      };

      let parsed: { list: any[]; result: any };

      if (useProductQuery) {
        // product.query path — keywords + min/max price (cents) + sort
        const queryParams: Record<string, string> = {
          method: "aliexpress.affiliate.product.query",
          app_key: appKey,
          sign_method: "sha256",
          format: "json",
          v: "2.0",
          page_no: String(pageNum),
          page_size: "20",
          target_currency: filtersObj.currency,
          target_language: filtersObj.language,
          tracking_id: trackingId,
          fields:
            "product_id,product_title,product_main_image_url,target_sale_price,target_original_price,target_sale_price_currency,target_original_price_currency,discount,evaluate_rate,lastest_volume,shop_name,shop_url,first_level_category_name,commission_rate,product_detail_url,sale_price,original_price,product_small_image_urls",
          timestamp: "",
        };
        if (filtersObj.keywords) queryParams.keywords = filtersObj.keywords;
        if (filtersObj.sort) queryParams.sort = filtersObj.sort;
        if (filtersObj.min_price) {
          const cents = toCents(filtersObj.min_price);
          if (cents !== null) queryParams.min_sale_price = cents;
        }
        if (filtersObj.max_price) {
          const cents = toCents(filtersObj.max_price);
          if (cents !== null) queryParams.max_sale_price = cents;
        }
        apiResult = await callApi(queryParams);
        parsed = apiResult.data ? extractFromProductQuery(apiResult.data) : { list: [], result: null };
      } else {
        apiResult = await callApi(buildParams(extra));
        parsed = apiResult.data ? extractProducts(apiResult.data) : { list: [], result: null };
      }

      // Fallback 1: if no results and we didn't already use keywords, retry smartmatch with generic keywords.
      // Skip when the user explicitly filtered by price/sort — the fallbacks ignore those filters
      // and would return unrelated products that violate the user's range.
      if (!useProductQuery && (apiResult.error || parsed.list.length === 0) && !filtersObj.keywords) {
        const fallbackExtra: Record<string, string> = {
          keywords: fallbackKeywords,
          device: deviceType,
          device_id: deviceIdValue,
        };
        if (filtersObj.product_id) fallbackExtra.product_id = filtersObj.product_id;
        apiResult = await callApi(buildParams(fallbackExtra));
        parsed = apiResult.data ? extractProducts(apiResult.data) : { list: [], result: null };
      }

      // Fallback 2: if smartmatch still returned nothing, use hotproduct.query (same API as Best Sellers, very reliable).
      // Skip when the user explicitly filtered by price/sort — hotproduct.query is the wrong API for that.
      if (!useProductQuery && parsed.list.length === 0) {
        const buildHotParams = (kw: string): Record<string, string> => ({
          method: "aliexpress.affiliate.hotproduct.query",
          app_key: appKey,
          sign_method: "sha256",
          format: "json",
          v: "2.0",
          page_no: String(pageNum),
          page_size: "10",
          sort: "LAST_VOLUME_DESC",
          target_currency: filtersObj.currency,
          target_language: filtersObj.language,
          tracking_id: trackingId,
          fields:
            "product_id,product_title,product_main_image_url,target_sale_price,target_original_price,target_sale_price_currency,target_original_price_currency,discount,evaluate_rate,lastest_volume,shop_name,shop_url,first_level_category_name,commission_rate,product_detail_url,sale_price,original_price,product_small_image_urls",
          keywords: kw,
          timestamp: "",
        });

        const extractHot = (data: any) => {
          const r = data?.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result;
          const productsRaw = r?.products?.product || [];
          const list = Array.isArray(productsRaw) ? productsRaw : [productsRaw];
          return { list, result: r };
        };

        // Attempt 1: use truncated meaningful keywords (e.g. "HONOR X9d 12GB+256GB")
        const specificKeywords = (filtersObj.keywords || fallbackKeywords).slice(0, 60);
        const hotResult1 = await callApi(buildHotParams(specificKeywords));
        if (hotResult1.data) {
          const { list, result: r } = extractHot(hotResult1.data);
          if (list.length > 0) {
            parsed = { list, result: r };
            apiResult = { data: hotResult1.data };
          }
        }

        // Attempt 2: narrow down to first 2 meaningful words (e.g. "HONOR X9d")
        if (parsed.list.length === 0 && filtersObj.keywords) {
          const shortKeywords = extractMeaningfulWords(filtersObj.keywords).slice(0, 2).join(" ");
          if (shortKeywords && shortKeywords !== specificKeywords) {
            const hotResult2 = await callApi(buildHotParams(shortKeywords));
            if (hotResult2.data) {
              const { list, result: r } = extractHot(hotResult2.data);
              if (list.length > 0) {
                parsed = { list, result: r };
                apiResult = { data: hotResult2.data };
              }
            }
          }
        }

        // Attempt 3: absolute last resort — generic trending keywords
        if (parsed.list.length === 0) {
          const hotResult3 = await callApi(buildHotParams(fallbackKeywords));
          if (hotResult3.data) {
            const { list, result: r } = extractHot(hotResult3.data);
            if (list.length > 0) {
              parsed = { list, result: r };
              apiResult = { data: hotResult3.data };
            }
          }
        }
      }

      if (apiResult.error && parsed.list.length === 0) {
        console.error("SmartMatch API error:", apiResult.error);
        return res.status(502).json({
          message: apiResult.error.msg || "API Error",
          products: [],
        });
      }

      const rawProducts = parsed.list.filter((p: any) => p && p.product_id);

      // Generate affiliate links in batches of 5 products to avoid rate limits
      const AFFILIATE_BATCH_SIZE = 5;
      const products: any[] = [];
      for (let i = 0; i < rawProducts.length; i += AFFILIATE_BATCH_SIZE) {
        const batch = rawProducts.slice(i, i + AFFILIATE_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (p: any) => {
            const productId = p.product_id;
            const cleanProductUrl = productId
              ? `https://www.aliexpress.com/item/${productId}.html`
              : null;

            let rawShopUrl: string | null = p.shop_url || null;
            if (rawShopUrl && rawShopUrl.startsWith("//")) {
              rawShopUrl = `https:${rawShopUrl}`;
            }
            const shopUrl =
              rawShopUrl && rawShopUrl.includes("/store/") ? rawShopUrl : null;

            const [productLinkResult, storeLinkResult] = await Promise.allSettled([
              cleanProductUrl
                ? generateAffiliateLink(cleanProductUrl, appKey, appSecret, trackingId)
                : Promise.resolve(null),
              shopUrl
                ? generateAffiliateLink(shopUrl, appKey, appSecret, trackingId)
                : Promise.resolve(null),
            ]);

            return {
              ...p,
              affiliate_product_url:
                productLinkResult.status === "fulfilled"
                  ? productLinkResult.value || null
                  : null,
              affiliate_store_url:
                storeLinkResult.status === "fulfilled"
                  ? storeLinkResult.value || null
                  : null,
            };
          })
        );
        products.push(...batchResults);
      }

      const payload = {
        products,
        total_record_count: parsed.result?.total_record_count || products.length,
        total_page_no: parsed.result?.total_page_no || 1,
        current_page_no: parsed.result?.current_page_no || pageNum,
        current_record_count: parsed.result?.current_record_count || products.length,
      };

      // Save to cache
      try {
        await db
          .insert(hotProductsCache)
          .values({
            cacheKey,
            pageNo: pageNum,
            filters: JSON.stringify(filtersObj),
            responseData: JSON.stringify(payload),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: hotProductsCache.cacheKey,
            set: {
              responseData: JSON.stringify(payload),
              createdAt: new Date(),
            },
          });
      } catch (e) {
        console.error("SmartMatch cache write failed:", e);
      }

      return res.json(payload);
    } catch (error) {
      console.error("Error in /api/smart-match:", error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch recommendations",
        products: [],
      });
    }
  });

  app.post("/api/affiliate-link", async (req: Request, res: Response) => {
    try {
      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      if (!appKey || !appSecret || !trackingId) {
        return res.status(500).json({ message: "Server API credentials not configured" });
      }

      const { url } = req.body || {};
      if (!url || typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ message: "Missing or invalid url" });
      }

      const affiliateLink = await generateAffiliateLink(url.trim(), appKey, appSecret, trackingId);

      if (affiliateLink) {
        return res.json({ link: affiliateLink });
      }
      return res.status(502).json({ message: "Could not generate affiliate link" });
    } catch (error) {
      console.error("Error in /api/affiliate-link:", error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate affiliate link",
      });
    }
  });

  app.post("/api/product", async (req: Request, res: Response) => {
    try {
      const { url, country, currency, language, currentPrice, skipCache }: ProductRequest & { skipCache?: boolean } = req.body;
      const productLanguage = normalizeProductLanguage(language);

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const appKey = getAliexpressAppKey();
      const appSecret = process.env.ALIEXPRESS_APP_SECRET;
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

      if (!appKey || !appSecret || !trackingId) {
        return res.status(500).json({ message: "Server API credentials not configured" });
      }

      if (
        !url.includes("aliexpress.com") &&
        !url.includes("alix.live") &&
        !url.includes("s.click.aliexpress.com")
      ) {
        return res.status(400).json({ message: "provide_url" });
      }

      // Sanitize the input — extract a clean URL from potentially surrounding text.
      // This ensures Microlink/scraping receives a proper URL, not raw text with a URL inside.
      const cleanInputUrl = sanitizeInputUrl(url);
      console.log("Input sanitized:", cleanInputUrl.substring(0, 100));

      const originalProductId = extractProductId(cleanInputUrl);

      // A "tracking link" is a short/redirect URL with no product ID visible directly.
      // Short links (s.click.aliexpress.com, alix.live, a.aliexpress.com) belong to this category.
      // Promotional/mobile pages (coin-index, deal pages) are NOT tracking links even when
      // they contain productIds in their query params — Microlink would scrape the wrong page.
      const isTrackingLink = !originalProductId && (
        cleanInputUrl.includes("s.click.aliexpress.com") ||
        cleanInputUrl.includes("alix.live") ||
        cleanInputUrl.includes("a.aliexpress.com")
      );

      // Start coupon fetch immediately — it's a fast DB query that can run
      // in parallel with redirect resolution instead of waiting for it.
      const couponCodesPromise = storage.getCouponCodes(country || "DZ");

      // Skip redirect resolution when productId is already visible in the URL.
      // Only short/tracking links (s.click.aliexpress.com, alix.live, etc.) need following.
      let finalUrl = cleanInputUrl;
      let redirectProductId: string | null = null;
      if (!originalProductId) {
        finalUrl = await resolveRedirects(cleanInputUrl);
        redirectProductId = extractProductId(finalUrl);
        console.log("Redirect resolved:", finalUrl.substring(0, 80));
      } else {
        console.log("ProductId found in URL directly, skipping redirect resolution");
      }

      const productId = originalProductId || redirectProductId;

      if (!productId) {
        return res.status(400).json({ message: "Could not extract product ID from URL" });
      }

      // Normalize finalUrl to canonical product page.
      // Handles cases where the input URL (or resolved URL) is a promotional/mobile page
      // (e.g. m.aliexpress.com/p/coin-index, deal pages) that contains productIds in params
      // but is NOT a product detail page — Microlink would return wrong data from those pages.
      if (!finalUrl.includes("/item/")) {
        finalUrl = `https://www.aliexpress.com/item/${productId}.html`;
        console.log("Normalized to canonical product URL:", finalUrl);
      }

      // When the original input is a tracking/short link, pass it as the additional scraping
      // target so Microlink can follow the redirect chain and extract product data directly.
      // This gives a second chance when the canonical URL hits AliExpress bot detection.
      // Promo/mobile pages (coin-index etc.) must not be used — they show multiple products.
      const fallbackOriginalUrl = isTrackingLink ? cleanInputUrl : finalUrl;

      const productIdsToTry = [productId];
      if (redirectProductId && redirectProductId !== productId) {
        productIdsToTry.push(redirectProductId);
      }
      if (originalProductId && originalProductId !== productId && !productIdsToTry.includes(originalProductId)) {
        productIdsToTry.push(originalProductId);
      }

      // Helper: fetch product details from API then fallback if needed — runs in parallel with offers/coupons
      async function resolveProductDetails() {
        const EMPTY_DATA = {
          title: "",
          price: "N/A",
          originalPrice: "N/A",
          discount: "0%",
          storeName: "Unknown Store",
          evaluateRate: "N/A",
          shopUrl: "N/A",
          categoryName: "N/A",
          commissionRate: "N/A",
          orders: "N/A",
          imageUrl: null as string | null,
          shipping_fees: "Free Shipping",
        };

        // ── API fetch strategy ─────────────────────────────────────────────────
        // Tier 1 — user's country + user's currency (full details, correct pricing)
        // Tier 2 — no country filter (global catalog lookup, price-neutral fields only)
        // Tier 3 — Python bot scraping (title + image only, reliable cookie handling)
        // Tier 4 — Node.js direct scraping (last resort, runs only if Tier 3 fails)
        //
        // Tiers 1, 2 & 3 run in parallel. Tier 1 takes priority if it succeeds;
        // Tier 2 result is used only when Tier 1 fails. When any API tier succeeds,
        // Tier 3 (bot scrape) is cancelled via mlAbort. Tier 4 runs only if Tier 3 fails.
        //
        // Tier 2 global lookup: AliExpress's productdetail.get filters by country catalog.
        // Products absent from a regional sub-catalog return current_record_count:0 when
        // country is specified. Omitting country forces a global lookup and usually works.
        // Price is intentionally NOT copied from the global result — global pricing may
        // not reflect the user's local market.
        // ──────────────────────────────────────────────────────────────────────────

        let data = { ...EMPTY_DATA };

        const requestedCountry = (country || "DZ").toUpperCase();

        // Price-neutral fields — safe to copy from global catalog regardless of currency
        const PRICE_NEUTRAL_FIELDS = [
          "title", "storeName", "evaluateRate", "shopUrl",
          "categoryName", "commissionRate", "orders", "imageUrl", "shipping_fees"
        ] as const;

        // Fetches product data for each candidate ID and returns the first success.
        // Returns null if all IDs fail or if externalSignal is aborted.
        // Does NOT mutate shared state.
        async function fetchApiData(
          tryCountry: string,
          tryLanguage: string,
          tryCurrency: string,
          signal?: AbortSignal
        ): Promise<typeof EMPTY_DATA | null> {
          for (const tryId of productIdsToTry) {
            if (signal?.aborted) return null;
            try {
              const apiData = await getProductDetailsFromApi(
                tryId, appKey!, appSecret!, trackingId!, tryLanguage, tryCountry, tryCurrency, signal
              );
              console.log("API success for product:", tryId,
                "| country:", tryCountry || "(global)",
                "| price:", apiData.price,
                "| title:", apiData.title?.substring(0, 50));
              return { ...EMPTY_DATA, ...apiData };
            } catch (apiError) {
              const msg = (apiError as Error).message;
              if (signal?.aborted) return null;
              console.log("API failed | product:", tryId, "| country:", tryCountry || "(global)", "|", msg);
              if (msg.includes("ApiCallLimit")) await delay(2000);
            }
          }
          return null;
        }

        // ── Run Tier 1, Tier 2, and Tier 3 (direct scrape) simultaneously ───
        //
        // Tier 3 (scrape) starts at the same time as the API tiers so it is
        // already resolved by the time both API tiers fail (Tier 3 products).
        //
        // API success:  one tier wins → mlAbort cancels the scrape, apiAbort
        //               cancels the other API tier → total ≈ winning tier time (~2 s).
        // API failure:  scrape first attempt runs (5 s); if incomplete, retries
        //               after 2 s → total ≈ 5 s + 2 s + scrape time ≈ 7–10 s.
        //
        // For Tier 1/2 products the scrape result is simply discarded once
        // the API succeeded — no correctness issue, minor wasted work.
        //
        // Price fields are NOT copied from scrape: AliExpress prices are
        // JS-rendered and unreliable from a static scrape.
        // ──────────────────────────────────────────────────────────────────────
        // Wraps getProductDetailsFallback with a DB cache layer.
        // Cache HIT  → returns instantly (<10ms), no scrape call.
        // Cache MISS → scrapes page, stores result for future requests.
        // mlAbort.signal is passed so scrape fetches are cancelled as soon as
        // either API tier returns good data, preventing a long tail wait.
        async function fetchFallbackWithCache(abortSignal: AbortSignal) {
          if (!skipCache) {
            const cached = await getMicrolinkCached(productId!);
            // Only use cache when BOTH title AND imageUrl are present.
            // A partial entry (title but no image) means a previous attempt only
            // got half the data — ignore it so we try again for the full result.
            if (cached?.title && cached?.imageUrl) return cached;
          }

          const fresh = await getProductDetailsFallback(productId!, appKey!, appSecret!, trackingId!, fallbackOriginalUrl, abortSignal);

          // Only cache complete results (title + image). A partial result must NOT
          // be cached so future requests can retry and get the missing piece.
          if (fresh.title && fresh.title !== "AliExpress Product" && fresh.imageUrl) {
            setMicrolinkCache(productId!, fresh.title, fresh.imageUrl).catch(() => {});
            return fresh;
          }

          // First attempt incomplete — retry when title OR image is still missing.
          // AliExpress pages can be slow; a 2 s wait then a retry often gets the full data.
          // Skip if the API already returned good data (abortSignal fired).
          const needsRetry = (!fresh.title || fresh.title === "AliExpress Product") || !fresh.imageUrl;
          if (needsRetry && !abortSignal.aborted) {
            console.log(`Scrape: first attempt incomplete for ${productId} (title:${!!fresh.title} image:${!!fresh.imageUrl}), waiting 2 s before retry...`);
            await delay(2000);
            if (!abortSignal.aborted) {
              console.log(`Scrape: retrying ${productId} after delay`);
              const retry = await getProductDetailsFallback(productId!, appKey!, appSecret!, trackingId!, fallbackOriginalUrl, abortSignal);
              console.log(`Scrape: retry result — title: ${retry.title !== "AliExpress Product" ? "yes" : "NO"}, image: ${retry.imageUrl ? "yes" : "NO"}`);
              // Merge: prefer retry fields but fall back to whatever fresh had
              const merged = {
                ...fresh,
                title: (retry.title && retry.title !== "AliExpress Product") ? retry.title : fresh.title,
                imageUrl: retry.imageUrl || fresh.imageUrl,
              };
              if (merged.title && merged.title !== "AliExpress Product" && merged.imageUrl) {
                setMicrolinkCache(productId!, merged.title, merged.imageUrl).catch(() => {});
              }
              return merged;
            }
          }

          return fresh;
        }

        // mlAbort:    fires when any API tier succeeds → cancels Tier 3 (bot scrape).
        // tier2Abort: fires only when Tier 1 succeeds → cancels Tier 2 early.
        //
        // Tier 1 (country-specific) is the priority source.
        // Tier 2 (global, no country) must NOT abort Tier 1, so each tier has its
        // own abort signal. Only Tier 1 success cancels Tier 2; both successes cancel Tier 3.
        const mlAbort    = new AbortController();
        const tier2Abort = new AbortController();
        setMaxListeners(20, mlAbort.signal);

        const [tier1Result, tier2Result, tier3Result] = await Promise.allSettled([
          // Tier 1: country-specific — highest priority.
          // On success → cancel Tier 2 and Tier 3 (bot scrape).
          fetchApiData(requestedCountry, productLanguage, currency || "USD").then(result => {
            if (result) {
              tier2Abort.abort();
              mlAbort.abort();
            }
            return result;
          }),
          // Tier 2: global catalog, no country filter — fallback only.
          // On success → cancel Tier 3, but leave Tier 1 running so it can still win.
          fetchApiData("", productLanguage, "USD", tier2Abort.signal).then(result => {
            if (result) {
              mlAbort.abort();
            }
            return result;
          }),
          // Tier 3: Python bot scraping — runs in parallel with API tiers.
          // Cancelled immediately when any API tier succeeds via mlAbort.
          scrapeViaBot(productId!, mlAbort.signal),
        ]);

        let apiSuccess = false;

        if (tier1Result.status === "fulfilled" && tier1Result.value) {
          // Tier 1 succeeded — full data with correct country pricing
          data = tier1Result.value;
          apiSuccess = true;
          console.log("Tier 1 succeeded");
        } else if (tier2Result.status === "fulfilled" && tier2Result.value) {
          // Tier 1 failed — copy only price-neutral fields from Tier 2 global result
          const globalData = tier2Result.value;
          for (const field of PRICE_NEUTRAL_FIELDS) {
            if (globalData[field]) (data as any)[field] = globalData[field];
          }
          apiSuccess = true;
          console.log("Tier 1 failed, Tier 2 (global catalog) used for price-neutral fields");
        } else {
          console.log("Both Tier 1 and Tier 2 failed, trying Tier 3 (bot scrape) result");
        }

        // ── Apply scrape result — only when BOTH API tiers failed ─────────────
        // Scrape tiers are strictly last resort: NOT used as gap-fillers when
        // Tier 1 or Tier 2 already succeeded.
        //   Tier 1 wins → done.
        //   Tier 2 wins → done.
        //   Both fail   → try Tier 3 (bot), then Tier 4 (Node.js direct scrape).
        if (!apiSuccess) {
          const botData = tier3Result.status === "fulfilled" ? tier3Result.value : null;
          const botHasTitle = !!botData?.title && botData.title !== "AliExpress Product";
          const botHasImage = !!botData?.imageUrl;

          if (botHasTitle || botHasImage) {
            // Tier 3 (bot scrape) succeeded
            console.log("Tier 3 (bot scrape) succeeded");
            if ((!data.title || data.title === "Unknown Product" || data.title === "AliExpress Product") && botHasTitle) {
              data.title = botData!.title;
            }
            if (!data.imageUrl && botHasImage) data.imageUrl = botData!.imageUrl;
          } else {
            // Tier 3 failed — fall back to Tier 4 (Node.js direct scrape)
            console.log("Tier 3 (bot scrape) failed, falling back to Tier 4 (Node.js direct scrape)");
            const tier4Abort = new AbortController();
            const fallbackData = await fetchFallbackWithCache(tier4Abort.signal);
            if (!data.title || data.title === "Unknown Product" || data.title === "AliExpress Product") {
              data.title = fallbackData.title;
            }
            if (!data.imageUrl) data.imageUrl = fallbackData.imageUrl;
            if (data.storeName === "Unknown Store" && fallbackData.storeName) {
              data.storeName = fallbackData.storeName;
            }
            if (data.orders === "N/A" && fallbackData.orders) {
              data.orders = fallbackData.orders;
            }
          }
        }

        return data;
      }

      // Run product details, offers generation, and coupon codes all in parallel
      const t0 = Date.now();
      const [productResult, offersResult, codesResult] = await Promise.allSettled([
        resolveProductDetails(),
        generateAllOffers(productId, appKey, appSecret, trackingId),
        couponCodesPromise,
      ]);
      console.log(`Parallel fetch completed in ${Date.now() - t0}ms`);

      // Generate affiliate link for the store URL (deferred from getProductDetailsFromApi)
      let affiliateStoreUrl: string | null = null;
      const rawShopUrl = productResult.status === "fulfilled"
        ? productResult.value?.shopUrl
        : null;
      if (rawShopUrl && rawShopUrl !== "N/A" && rawShopUrl.includes("/store/")) {
        try {
          affiliateStoreUrl = await generateAffiliateLink(rawShopUrl, appKey, appSecret, trackingId);
        } catch {
          affiliateStoreUrl = null;
        }
      }

      const productData = productResult.status === "fulfilled"
        ? productResult.value
        : {
            title: "",
            price: "N/A",
            originalPrice: "N/A",
            discount: "0%",
            storeName: "Unknown Store",
            evaluateRate: "N/A",
            shopUrl: "N/A",
            categoryName: "N/A",
            commissionRate: "N/A",
            orders: "N/A",
            imageUrl: null as string | null,
            shipping_fees: "Free Shipping",
          };

      const offers = offersResult.status === "fulfilled" ? offersResult.value : [];
      const codes = codesResult.status === "fulfilled" ? codesResult.value : [];

      // Process coupon codes
      let couponsSummary = "";
      let bestCoupon: { value: number; threshold: number; codes: string[]; title?: string } | null = null;

      try {
        if (codes && codes.length > 0) {
          const summaryParts: string[] = [];
          // Use currentPrice from request body as fallback when API price is unavailable
          const priceForCoupon = (productData.price && productData.price !== "N/A")
            ? productData.price
            : (currentPrice || productData.price);
          const currentPriceNum = parseFloat((priceForCoupon || "").replace(/[^0-9.]/g, ""));
          let bestThreshold = -1;

          const COD_KEYS = ['cod1','cod2','cod3','cod4','cod5','cod6','cod7','cod8','cod9','cod10','cod11','cod12'];

          for (const couponRow of codes) {
            const valStr = (couponRow as any).value;
            if (!valStr) continue;

            const rowCodes: string[] = COD_KEYS.map(k => (couponRow as any)[k]).filter(Boolean);
            if (rowCodes.length > 0) {
              summaryParts.push(`${valStr} ⇨ ${rowCodes.join(", ")}`);
            }

            const [cVal, cThreshold] = valStr.split('/').map((s: string) => parseFloat(s.trim()));
            if (!isNaN(cVal) && !isNaN(cThreshold) && !isNaN(currentPriceNum)) {
              if (cThreshold <= currentPriceNum && cThreshold > bestThreshold) {
                bestThreshold = cThreshold;
                bestCoupon = {
                  value: cVal,
                  threshold: cThreshold,
                  codes: rowCodes.slice(0, 3),
                  title: (couponRow as any).couponTitle || undefined,
                };
              }
            }
          }
          couponsSummary = summaryParts.join("\n");
        }
      } catch (e) {
        console.error("Error generating coupon summary:", e);
      }

      // When the API returns "N/A" for price, fall back to the currentPrice sent by the client
      // so that the price field displays the actual offer price instead of "N/A".
      const displayPrice = (productData.price && productData.price !== "N/A")
        ? productData.price
        : (currentPrice || "N/A");

      const response: ProductResponse & { coupons_summary?: string, cod_1?: string, cod_2?: string, cod_3?: string, couponTitle?: string } = {
        id: `${productId}-${Date.now()}`,
        productId,
        title: productData.title,
        imageUrl: productData.imageUrl,
        price: displayPrice,
        originalPrice: productData.originalPrice,
        discount: productData.discount,
        storeName: productData.storeName,
        evaluateRate: productData.evaluateRate,
        shopUrl: productData.shopUrl,
        affiliateStoreUrl: affiliateStoreUrl || undefined,
        categoryName: productData.categoryName,
        commissionRate: productData.commissionRate,
        orders: productData.orders,
        shipping_fees: productData.shipping_fees,
        searchedAt: new Date().toISOString(),
        offers,
        coupons_summary: couponsSummary,
      };

      if (bestCoupon && bestCoupon.codes.length > 0) {
        const priceNum = parseFloat(displayPrice.replace(/[^0-9.]/g, ""));
        // Extract currency symbol: strip all digits, dots, commas and whitespace
        const currencySymbol = displayPrice.replace(/[\d.,\s]/g, "").trim();
        const withCurr = (val: number) =>
          currencySymbol ? `${val.toFixed(2)} ${currencySymbol}` : val.toFixed(2);

        response.finalPrice = isNaN(priceNum) ? "N/A" : withCurr(priceNum - bestCoupon.value);
        response.couponValue = currencySymbol
          ? `${bestCoupon.value} ${currencySymbol}`
          : String(bestCoupon.value);
        response.promoCodes = bestCoupon.codes;
        response.couponTitle = bestCoupon.title || undefined;

        // cod_1/2/3 for message templates
        response.cod_1 = bestCoupon.codes[0] || "";
        response.cod_2 = bestCoupon.codes[1] || "";
        response.cod_3 = bestCoupon.codes[2] || "";
      } else {
        response.cod_1 = "";
        response.cod_2 = "";
        response.cod_3 = "";
      }

      // Fire-and-forget: record this product search in the trending table.
      // When skipTrending=true the request is an internal/enrichment call (e.g.
      // card tap in "Trending Now" which uses /api/trending/tap for its own +1,
      // initial price fetch on ProductDetails, refresh offer, or prefetch from
      // TrendingOffersView) — skip here to avoid unintended trending updates.
      // trendingScore overrides the default +5 (e.g. "عروض المنتج" button uses +3).
      const skipTrending = req.body.skipTrending === true;
      if (!skipTrending) {
        const trendingScore =
          typeof req.body.trendingScore === "number" && req.body.trendingScore > 0
            ? req.body.trendingScore
            : 5;
        setImmediate(() => {
          trackTrendingProduct(
            productId,
            country || "DZ",
            trendingScore,
            productData.title || null,
            productData.imageUrl || null,
            displayPrice !== "N/A" ? displayPrice : null,
            productData.originalPrice !== "N/A" ? productData.originalPrice : null,
            productData.discount !== "0%" ? productData.discount : null
          ).catch(() => {});
        });
      }

      return res.json(response);
    } catch (error) {
      console.error("Error processing product:", error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process product",
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Trending Products Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  // Card tap in "Trending Now": adds +1 to the product's quantity.
  // This is separate from the "Get Offers" tracking (+5) so both can coexist
  // without double-counting when the card tap also fetches full offers.
  app.post("/api/trending/tap", async (req: Request, res: Response) => {
    try {
      const { productId, country, title, imageUrl, price, originalPrice, discount } = req.body;
      if (!productId || typeof productId !== "string") {
        return res.status(400).json({ message: "productId is required" });
      }
      await trackTrendingProduct(productId, country || "DZ", 1, title || null, imageUrl || null, price || null, originalPrice || null, discount || null);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to track tap" });
    }
  });

  app.post("/api/trending/update-meta", async (req: Request, res: Response) => {
    try {
      const { productId, country, title, imageUrl, price, originalPrice, discount } = req.body;
      if (!productId || typeof productId !== "string") {
        return res.status(400).json({ message: "productId is required" });
      }
      const countryCode = (country || "DZ").toUpperCase();
      // UPSERT instead of plain UPDATE: if the row doesn't exist yet
      // (e.g. the fire-and-forget /api/trending/tap hasn't completed),
      // we create it with quantity=0 so the metadata is never lost silently.
      await db.execute(sql`
        INSERT INTO trending (product_id, country, quantity, title, image_url, price, original_price, discount, updated_at)
        VALUES (
          ${productId},
          ${countryCode},
          0,
          ${title || null},
          ${imageUrl || null},
          ${price || null},
          ${originalPrice || null},
          ${discount || null},
          NOW()
        )
        ON CONFLICT (product_id, country) DO UPDATE
          SET
            title          = COALESCE(EXCLUDED.title,          trending.title),
            image_url      = COALESCE(EXCLUDED.image_url,      trending.image_url),
            price          = COALESCE(EXCLUDED.price,          trending.price),
            original_price = COALESCE(EXCLUDED.original_price, trending.original_price),
            discount       = COALESCE(EXCLUDED.discount,       trending.discount)
      `);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to update trending meta" });
    }
  });

  app.get("/api/trending/products", async (req: Request, res: Response) => {
    try {
      const page = Math.max(0, parseInt(String(req.query.page || "0")) || 0);
      const countryCode = ((req.query.country as string) || "DZ").toUpperCase();
      const limit = 10;
      const offset = page * limit;

      const rows = await db.execute(sql`
        SELECT product_id, country, quantity, title, image_url, price, original_price, discount,
               updated_at
        FROM trending
        WHERE country = ${countryCode}
        ORDER BY quantity DESC, updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const countRow = await db.execute(sql`SELECT COUNT(*) as total FROM trending WHERE country = ${countryCode}`);
      const total = parseInt(String((countRow as any).rows?.[0]?.total || 0), 10);

      const versionRow = await db.execute(sql`
        SELECT MAX(updated_at) as version FROM (
          SELECT updated_at FROM trending WHERE country = ${countryCode} ORDER BY quantity DESC LIMIT 10
        ) t
      `);
      const version = (versionRow as any).rows?.[0]?.version
        ? new Date((versionRow as any).rows[0].version).getTime().toString()
        : "0";

      const products = ((rows as any).rows || []).map((r: any) => ({
        productId: r.product_id,
        country: r.country,
        quantity: r.quantity,
        title: r.title || null,
        imageUrl: r.image_url || null,
        price: r.price || null,
        originalPrice: r.original_price || null,
        discount: r.discount || null,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      }));

      res.json({ products, total, page, version });
    } catch (error) {
      console.error("Error fetching trending products:", error);
      res.status(500).json({ products: [], total: 0, page: 0, version: "0" });
    }
  });

  app.get("/api/trending/version", async (req: Request, res: Response) => {
    try {
      const countryCode = ((req.query.country as string) || "DZ").toUpperCase();
      const versionRow = await db.execute(sql`
        SELECT MAX(updated_at) as version FROM (
          SELECT updated_at FROM trending WHERE country = ${countryCode} ORDER BY quantity DESC LIMIT 10
        ) t
      `);
      const version = (versionRow as any).rows?.[0]?.version
        ? new Date((versionRow as any).rows[0].version).getTime().toString()
        : "0";
      res.json({ version });
    } catch (error) {
      res.json({ version: "0" });
    }
  });

  app.get("/api/calendrier", async (_req, res) => {
    try {
      const rows = await storage.getCalendrier();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendrier" });
    }
  });

  app.get("/api/coin", async (_req, res) => {
    try {
      const rows = await storage.getCoin();
      const mapped = rows.map((r: any) => ({
        id: r.id,
        title: r.title ?? null,
        title_en: r.titleEn ?? r.title_en ?? null,
        title_fr: r.titleFr ?? r.title_fr ?? null,
        title_pt: r.titlePt ?? r.title_pt ?? null,
        link: r.link ?? null,
        info: r.info ?? null,
        info_en: r.infoEn ?? r.info_en ?? null,
        info_fr: r.infoFr ?? r.info_fr ?? null,
        info_pt: r.infoPt ?? r.info_pt ?? null,
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coin" });
    }
  });

  app.get("/api/sale", async (req, res) => {
    try {
      const country = (req.query.country as string | undefined)?.toLowerCase()?.trim() || "";
      let rows: any[];
      if (country) {
        const result = await db.execute(sql`
          SELECT * FROM sale
          WHERE country IS NULL OR country = '' OR LOWER(country) = ${country}
          ORDER BY id ASC
        `);
        rows = (result.rows as any[]).map((r: any) => ({
          id: r.id,
          linkImg: r.link_img ?? r.linkImg ?? null,
          link: r.link ?? null,
          country: r.country ?? null,
        }));
      } else {
        rows = await db.select().from(saleTable).orderBy(asc(saleTable.id));
      }
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Message Templates - GET for all users, PUT for admin
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/templates", async (_req, res) => {
    try {
      const rows = await db.select().from(messageTemplates).orderBy(asc(messageTemplates.id));
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.content;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/admin/templates/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const rows = await db.select({ content: messageTemplates.content })
        .from(messageTemplates)
        .where(eq(messageTemplates.key, key))
        .limit(1);
      if (!rows.length) return res.status(404).json({ message: "Not found" });
      res.json({ content: rows[0].content });
    } catch {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.put("/api/admin/templates/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Content is required" });
      await db.execute(sql`
        INSERT INTO message_templates (key, content, updated_at)
        VALUES (${key}, ${content}, NOW())
        ON CONFLICT (key) DO UPDATE SET content = ${content}, updated_at = NOW()
      `);
      res.json({ message: "Template updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Coupon Codes
  // ─────────────────────────────────────────────────────────────────────────
  app.put("/api/admin/coupon-codes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { country, value, cod1, cod2, cod3, cod4, cod5, cod6, cod7, cod8, cod9, cod10, cod11, cod12, cod13, cod14, cod15, cod16, cod17, cod18, cod19, cod20, couponTitle } = req.body;
      await db.update(couponCodes).set({
        country: country ? country.toLowerCase() : country, value,
        cod1: cod1 || null, cod2: cod2 || null, cod3: cod3 || null,
        cod4: cod4 || null, cod5: cod5 || null, cod6: cod6 || null,
        cod7: cod7 || null, cod8: cod8 || null, cod9: cod9 || null,
        cod10: cod10 || null, cod11: cod11 || null, cod12: cod12 || null,
        cod13: cod13 || null, cod14: cod14 || null, cod15: cod15 || null,
        cod16: cod16 || null, cod17: cod17 || null, cod18: cod18 || null,
        cod19: cod19 || null, cod20: cod20 || null,
        couponTitle: couponTitle || null,
      }).where(eq(couponCodes.id, parseInt(id)));
      res.json({ message: "Coupon updated" });
    } catch (error) {
      console.error("Failed to update coupon:", error);
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupon-codes/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE coupon_codes RESTART IDENTITY`);
      res.json({ message: "All coupons deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupons" });
    }
  });

  app.delete("/api/admin/coupon-codes/:id/cod/:codKey", async (req: Request, res: Response) => {
    try {
      const { id, codKey } = req.params;
      const allowed = ["cod1","cod2","cod3","cod4","cod5","cod6","cod7","cod8","cod9","cod10","cod11","cod12"];
      if (!allowed.includes(codKey)) return res.status(400).json({ message: "Invalid cod key" });
      const updateObj: Record<string, null> = { [codKey]: null };
      await db.update(couponCodes).set(updateObj as any).where(eq(couponCodes.id, parseInt(id)));
      res.json({ message: "Code cleared" });
    } catch (error) {
      console.error("Failed to clear code:", error);
      res.status(500).json({ message: "Failed to clear code" });
    }
  });

  app.delete("/api/admin/coupon-codes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(couponCodes).where(eq(couponCodes.id, parseInt(id)));
      res.json({ message: "Coupon deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  app.post("/api/admin/coupon-codes/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(couponCodes).values({
          country: row.country ? row.country.toLowerCase() : null,
          value: row.value || null,
          cod1: row.cod1 || null, cod2: row.cod2 || null, cod3: row.cod3 || null,
          cod4: row.cod4 || null, cod5: row.cod5 || null, cod6: row.cod6 || null,
          cod7: row.cod7 || null, cod8: row.cod8 || null, cod9: row.cod9 || null,
          cod10: row.cod10 || null, cod11: row.cod11 || null, cod12: row.cod12 || null,
          cod13: row.cod13 || null, cod14: row.cod14 || null, cod15: row.cod15 || null,
          cod16: row.cod16 || null, cod17: row.cod17 || null, cod18: row.cod18 || null,
          cod19: row.cod19 || null, cod20: row.cod20 || null,
          couponTitle: row.couponTitle || null,
        });
      }
      res.json({ message: `${rows.length} coupon row(s) added` });
      // Fire push notifications asynchronously after responding
      (async () => {
        const firstCountry = rows[0]?.country || null;
        const tokens = firstCountry
          ? await getActivePushTokensByCountry(firstCountry)
          : await getActivePushTokens();
        if (tokens.length === 0) return;
        const tmpl = await getNotifTemplate("notif_coupon", firstCountry || undefined);
        if (tmpl) await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "CouponCodes" });
      })().catch(() => {});
    } catch (error) {
      console.error("Failed to add coupons:", error);
      res.status(500).json({ message: "Failed to add coupons" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Calendrier
  // ─────────────────────────────────────────────────────────────────────────
  app.put("/api/admin/calendrier/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, linkImg, info, titleEn, titleFr, titlePt, infoEn, infoFr, infoPt } = req.body;
      await db.update(calendrier).set({
        title, linkImg, info,
        titleEn: titleEn || null,
        titleFr: titleFr || null,
        titlePt: titlePt || null,
        infoEn: infoEn || null,
        infoFr: infoFr || null,
        infoPt: infoPt || null,
      }).where(eq(calendrier.id, parseInt(id)));
      res.json({ message: "Calendrier updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update calendrier" });
    }
  });

  app.delete("/api/admin/calendrier/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE calendrier RESTART IDENTITY`);
      res.json({ message: "All calendrier entries deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete calendrier" });
    }
  });

  app.delete("/api/admin/calendrier/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(calendrier).where(eq(calendrier.id, parseInt(id)));
      res.json({ message: "Entry deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.post("/api/admin/calendrier/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(calendrier).values({
          title: row.title || null,
          linkImg: row.linkImg || null,
          info: row.info || null,
          titleEn: row.titleEn || null,
          titleFr: row.titleFr || null,
          titlePt: row.titlePt || null,
          infoEn: row.infoEn || null,
          infoFr: row.infoFr || null,
          infoPt: row.infoPt || null,
        });
      }
      res.json({ message: `${rows.length} entry(s) added` });
      getActivePushTokens().then(async (tokens) => {
        if (tokens.length === 0) return;
        const tmpl = await getNotifTemplate("notif_calendrier");
        if (tmpl) await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "Calendrier" });
      }).catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Coin
  // ─────────────────────────────────────────────────────────────────────────
  app.put("/api/admin/coin/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, title_en, title_fr, title_pt, link, info, info_en, info_fr, info_pt } = req.body;
      await db.update(coin).set({
        title, titleEn: title_en ?? null, titleFr: title_fr ?? null, titlePt: title_pt ?? null,
        link, info, infoEn: info_en ?? null, infoFr: info_fr ?? null, infoPt: info_pt ?? null,
      }).where(eq(coin.id, parseInt(id)));
      res.json({ message: "Coin entry updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update coin entry" });
    }
  });

  app.delete("/api/admin/coin/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE coin RESTART IDENTITY`);
      res.json({ message: "All coin entries deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coin entries" });
    }
  });

  app.delete("/api/admin/coin/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(coin).where(eq(coin.id, parseInt(id)));
      res.json({ message: "Entry deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.post("/api/admin/coin/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(coin).values({
          title: row.title, titleEn: row.title_en ?? null, titleFr: row.title_fr ?? null, titlePt: row.title_pt ?? null,
          link: row.link, info: row.info, infoEn: row.info_en ?? null, infoFr: row.info_fr ?? null, infoPt: row.info_pt ?? null,
        });
      }
      res.json({ message: `${rows.length} entry(s) added` });
    } catch (error) {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Offres
  // ─────────────────────────────────────────────────────────────────────────
  app.put("/api/admin/offres/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId) || numericId <= 0 || numericId > 2147483647) {
        return res.status(400).json({ message: "Invalid offer ID" });
      }
      const { title, price, sellerCoupon, productUrl, info, country, currentPrice, imageUrl } = req.body;
      const cc = country ? country.toLowerCase() : country;
      await db.execute(sql`
        UPDATE offres SET
          title = ${title},
          price = ${price},
          seller_coupon = ${sellerCoupon},
          product_url = ${productUrl},
          info = ${info},
          country = ${cc},
          current_price = ${currentPrice ?? null},
          image_url = ${imageUrl || null},
          updated_at = NOW()
        WHERE id = ${numericId}
      `);
      if (cc) await touchOffresMeta(cc);
      res.json({ message: "Offre updated" });
    } catch (error) {
      console.error("Failed to update offre:", error);
      res.status(500).json({ message: "Failed to update offre" });
    }
  });

  app.delete("/api/admin/offres/all", async (req: Request, res) => {
    try {
      const country = ((req.body?.country as string) || "").toLowerCase();
      if (country) {
        await db.execute(sql`DELETE FROM offres WHERE LOWER(country) = ${country}`);
        await touchOffresMeta(country);
      } else {
        await db.execute(sql`TRUNCATE TABLE offres RESTART IDENTITY`);
      }
      res.json({ message: "Offres deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete offres" });
    }
  });

  app.delete("/api/admin/offres/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId) || numericId <= 0 || numericId > 2147483647) {
        return res.status(400).json({ message: "Invalid offer ID" });
      }
      const existing = await db.select({ country: offres.country }).from(offres).where(eq(offres.id, numericId)).limit(1);
      await db.delete(offres).where(eq(offres.id, numericId));
      if (existing[0]?.country) await touchOffresMeta(existing[0].country);
      res.json({ message: "Offre deleted" });
    } catch (error) {
      console.error("Failed to delete offre:", error);
      res.status(500).json({ message: "Failed to delete offre" });
    }
  });

  app.post("/api/admin/offres/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      const insertedIds: number[] = [];
      for (const row of rows) {
        const cc = row.country ? row.country.toLowerCase() : null;
        const result = await db.execute(sql`
          INSERT INTO offres (title, price, seller_coupon, product_url, info, country, current_price, image_url, date)
          VALUES (${row.title}, ${row.price}, ${row.sellerCoupon || null}, ${row.productUrl}, ${row.info || null}, ${cc}, ${row.currentPrice || null}, ${row.imageUrl || null}, NOW())
          RETURNING id
        `);
        const newId = (result as any).rows?.[0]?.id;
        if (newId) insertedIds.push(Number(newId));
        if (cc) await touchOffresMeta(cc);
      }
      res.json({ message: `${rows.length} offre(s) added`, ids: insertedIds });
      // Trigger enrichment immediately for the newly inserted offers (fire-and-forget)
      if (insertedIds.length > 0) {
        (async () => {
          const appKey    = getAliexpressAppKey();
          const appSecret = process.env.ALIEXPRESS_APP_SECRET;
          const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
          if (!appKey || !appSecret || !trackingId) return;
          const newOffers = await db.select().from(offres).where(
            sql`id = ANY(${sql.raw(`ARRAY[${insertedIds.join(",")}]::int[]`)})`)
          ;
          if (newOffers.length > 0) {
            await triggerOffersEnrichment(newOffers, appKey, appSecret, trackingId);
          }
        })().catch(() => {});
      }
      // Notify for each offre (max 3 to avoid spam) — only users with notify_offers enabled
      (async () => {
        const firstCountry = rows[0]?.country || null;
        const tokens = firstCountry
          ? await getActivePushTokensByCountry(firstCountry, true)
          : await getActivePushTokens(true);
        if (tokens.length === 0) return;
        const toNotify = rows.slice(0, 3);
        for (let i = 0; i < toNotify.length; i++) {
          const row = toNotify[i];
          const offreId = insertedIds[i];
          const tmpl = await getNotifTemplate("notif_offre", firstCountry || undefined);
          if (!tmpl) continue;
          const body = tmpl
            .replace("{title}", row.title || "")
            .replace("{price}", row.price || "");
          await sendPushNotifications(tokens, "Offers 365", body, {
            screen: "OfferDetails",
            offreId: String(offreId || ""),
            offreCountry: (row.country || "dz").toLowerCase(),
          });
        }
      })().catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to add offres" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin - Subscribers
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/subscribers", async (_req, res) => {
    try {
      const rows = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        country: users.country,
        online: users.online,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
        temps: users.temps,
        desactive: users.desactive,
      }).from(users).orderBy(desc(users.createdAt));

      // Heartbeat-based online detection:
      // A user is truly online only if their last_seen is within 90s (2× the 45s heartbeat).
      // Stale users (online="on" but lastSeen too old) are auto-corrected in the DB asynchronously.
      const ONLINE_TIMEOUT_MS = 90 * 1000;
      const now = Date.now();
      const staleIds: { id: string; lastSeen: Date }[] = [];

      const withStatus = rows.map(row => {
        const lastSeenMs = row.lastSeen ? new Date(row.lastSeen).getTime() : 0;
        const isReallyOnline = row.online === "on" && lastSeenMs > 0 && (now - lastSeenMs) < ONLINE_TIMEOUT_MS;

        // Detect stale: DB says "on" but heartbeat has expired
        if (row.online === "on" && !isReallyOnline) {
          staleIds.push({ id: row.id, lastSeen: row.lastSeen ?? new Date() });
        }

        // desactive: use existing value, or lastSeen if stale and desactive is null
        const desactiveTs = row.desactive
          ? row.desactive.toISOString()
          : (!isReallyOnline && row.lastSeen ? row.lastSeen.toISOString() : null);

        return {
          ...row,
          online: isReallyOnline ? "on" : "off",
          temps: row.temps ?? 0,
          desactive: desactiveTs,
        };
      });

      // Auto-correct stale records in DB (fire-and-forget, non-blocking)
      if (staleIds.length > 0) {
        Promise.all(
          staleIds.map(({ id, lastSeen }) =>
            db.update(users)
              .set({ online: "off", desactive: lastSeen })
              .where(eq(users.id, id))
              .catch(() => {})
          )
        ).catch(() => {});
      }

      // Sort: online users first, then by createdAt desc
      const sorted = [...withStatus].sort((a, b) => {
        const aOnline = a.online === "on" ? 1 : 0;
        const bOnline = b.online === "on" ? 1 : 0;
        if (bOnline !== aOnline) return bOnline - aOnline;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });
      res.json(sorted);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Update table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/update", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT id, message, message_en, message_fr, message_pt, link, version FROM "update"`);
      res.json((result as any).rows || []);
    } catch {
      res.status(500).json({ message: "Failed to fetch update data" });
    }
  });

  app.delete("/api/admin/update/all", async (_req, res) => {
    try {
      await db.execute(sql`DELETE FROM "update"`);
      res.json({ message: "Update table cleared" });
    } catch {
      res.status(500).json({ message: "Failed to clear update table" });
    }
  });

  app.delete("/api/admin/update/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM "update" WHERE id = ${id}`);
      res.json({ message: "Entry deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.put("/api/admin/update/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message, message_en, message_fr, message_pt, link, version } = req.body;
      await db.execute(sql`UPDATE "update" SET message=${message}, message_en=${message_en ?? null}, message_fr=${message_fr ?? null}, message_pt=${message_pt ?? null}, link=${link}, version=${version} WHERE id=${id}`);
      res.json({ message: "Entry updated" });
    } catch {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/admin/update/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        const genId = crypto.randomBytes(4).toString("hex");
        await db.execute(sql`INSERT INTO "update" (id, message, message_en, message_fr, message_pt, link, version) VALUES (${genId}, ${row.message}, ${row.message_en ?? null}, ${row.message_fr ?? null}, ${row.message_pt ?? null}, ${row.link}, ${row.version})`);
      }
      res.json({ message: `${rows.length} entry(s) added` });
      getActivePushTokens().then(async (tokens) => {
        if (tokens.length === 0) return;
        const tmpl = await getNotifTemplate("notif_update");
        if (tmpl) await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "Home" });
      }).catch(() => {});
    } catch {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Social table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/social", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT id, telegram, facebook, tiktok, bot FROM social`);
      res.json((result as any).rows || []);
    } catch {
      res.status(500).json({ message: "Failed to fetch social data" });
    }
  });

  app.delete("/api/admin/social/all", async (_req, res) => {
    try {
      await db.execute(sql`DELETE FROM social`);
      res.json({ message: "Social table cleared" });
    } catch {
      res.status(500).json({ message: "Failed to clear social table" });
    }
  });

  app.delete("/api/admin/social/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM social WHERE id = ${id}`);
      res.json({ message: "Entry deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.put("/api/admin/social/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { telegram, facebook, tiktok, bot } = req.body;
      await db.execute(sql`UPDATE social SET telegram=${telegram}, facebook=${facebook}, tiktok=${tiktok}, bot=${bot} WHERE id=${id}`);
      res.json({ message: "Entry updated" });
    } catch {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/admin/social/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        const genId = crypto.randomBytes(4).toString("hex");
        await db.execute(sql`INSERT INTO social (id, telegram, facebook, tiktok, bot) VALUES (${genId}, ${row.telegram}, ${row.facebook}, ${row.tiktok}, ${row.bot})`);
      }
      res.json({ message: `${rows.length} entry(s) added` });
    } catch {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Sale table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/sale", async (_req, res) => {
    try {
      const rows = await db.select().from(saleTable);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to fetch sale data" });
    }
  });

  app.delete("/api/admin/sale/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE sale RESTART IDENTITY`);
      res.json({ message: "Sale table cleared" });
    } catch {
      res.status(500).json({ message: "Failed to clear sale table" });
    }
  });

  app.delete("/api/admin/sale/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(saleTable).where(eq(saleTable.id, parseInt(id)));
      res.json({ message: "Entry deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.put("/api/admin/sale/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { linkImg, link, country } = req.body;
      await db.update(saleTable).set({ linkImg, link, country: country || null }).where(eq(saleTable.id, parseInt(id)));
      res.json({ message: "Entry updated" });
    } catch {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/admin/sale/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(saleTable).values({ linkImg: row.linkImg, link: row.link, country: row.country || null });
      }
      res.json({ message: `${rows.length} entry(s) added` });
      (async () => {
        const firstCountry = rows[0]?.country || null;
        const tokens = firstCountry
          ? await getActivePushTokensByCountry(firstCountry)
          : await getActivePushTokens();
        if (tokens.length === 0) return;
        const tmpl = await getNotifTemplate("notif_sale", firstCountry || undefined);
        if (tmpl) await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "Home" });
      })().catch(() => {});
    } catch {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Pub table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/pub", async (_req, res) => {
    try {
      const rows = await db.select().from(pubTable);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to fetch pub data" });
    }
  });

  app.delete("/api/admin/pub/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE pub RESTART IDENTITY`);
      res.json({ message: "Pub table cleared" });
    } catch {
      res.status(500).json({ message: "Failed to clear pub table" });
    }
  });

  app.delete("/api/admin/pub/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(pubTable).where(eq(pubTable.id, parseInt(id)));
      res.json({ message: "Entry deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.put("/api/admin/pub/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { productName, price, link, promoCode, codeValue, country, image, sellerCoupon, sellerCouponValue, note, active } = req.body;
      await db.update(pubTable).set({ productName, price, link, promoCode, codeValue, country, image, sellerCoupon, sellerCouponValue, note, active: active || "on" }).where(eq(pubTable.id, parseInt(id)));
      res.json({ message: "Entry updated" });
    } catch {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/admin/pub/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(pubTable).values({
          productName: row.productName,
          price: row.price,
          link: row.link,
          promoCode: row.promoCode,
          codeValue: row.codeValue,
          country: row.country,
          image: row.image || null,
          sellerCoupon: row.sellerCoupon || null,
          sellerCouponValue: row.sellerCouponValue || null,
          note: row.note || null,
          active: row.active || "on",
        });
      }
      res.json({ message: `${rows.length} entry(s) added` });
    } catch {
      res.status(500).json({ message: "Failed to add entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Public - Pub2 (general ad)
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/pub2", async (req, res) => {
    try {
      const country = (req.query.country as string) || "DZ";
      const rows = await storage.getPub2(country);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to fetch general ad" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Pub2 table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/pub2", async (_req, res) => {
    try {
      const rows = await db.select().from(pub2Table);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Failed to fetch pub2 data" });
    }
  });

  app.delete("/api/admin/pub2/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE pub_2 RESTART IDENTITY`);
      res.json({ message: "Pub2 table cleared" });
    } catch {
      res.status(500).json({ message: "Failed to clear pub2 table" });
    }
  });

  app.delete("/api/admin/pub2/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(pub2Table).where(eq(pub2Table.id, parseInt(id)));
      res.json({ message: "Entry deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.put("/api/admin/pub2/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { image, note, buttonLabel, buttonLink, country, active } = req.body;
      const activeValue = active === "off" ? "off" : "on";
      await db.update(pub2Table).set({ image, note, buttonLabel, buttonLink, country, active: activeValue }).where(eq(pub2Table.id, parseInt(id)));
      res.json({ message: "Entry updated" });
    } catch {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/admin/pub2/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(pub2Table).values({
          image: row.image || null,
          note: row.note || null,
          buttonLabel: row.buttonLabel || null,
          buttonLink: row.buttonLink || null,
          country: row.country,
          active: row.active === "off" ? "off" : "on",
        });
      }
      res.json({ message: `${rows.length} entry(s) added` });
    } catch {
      res.status(500).json({ message: "Failed to add pub2 entries" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cart - public read
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/cart", async (_req, res) => {
    try {
      const rows = await db.select().from(cartTable).orderBy(asc(cartTable.id));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin CRUD - Cart table
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin/cart", async (_req, res) => {
    try {
      const rows = await db.select().from(cartTable).orderBy(asc(cartTable.id));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.delete("/api/admin/cart/all", async (_req, res) => {
    try {
      await db.execute(sql`TRUNCATE TABLE cart RESTART IDENTITY`);
      res.json({ message: "Cart table cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart table" });
    }
  });

  app.delete("/api/admin/cart/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(cartTable).where(eq(cartTable.id, parseInt(id)));
      res.json({ message: "Cart entry deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cart entry" });
    }
  });

  app.put("/api/admin/cart/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { linkcart, pricecart } = req.body;
      await db.update(cartTable).set({ linkcart: linkcart || null, pricecart: pricecart || null }).where(eq(cartTable.id, parseInt(id)));
      res.json({ message: "Cart entry updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart entry" });
    }
  });

  app.post("/api/admin/cart/bulk", async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }
      for (const row of rows) {
        await db.insert(cartTable).values({ linkcart: row.linkcart || null, pricecart: row.pricecart || null });
      }
      res.json({ message: `${rows.length} cart entry(s) added` });
      // Cart AI is DZ-only: notify Algerian users only, and only if DZ coupons exist
      getActivePushTokensByCountry("dz").then(async (tokens) => {
        if (tokens.length === 0) return;
        const couponRows = await db.execute(sql`SELECT id FROM coupon_codes WHERE country = 'dz' LIMIT 1`);
        if (!((couponRows as any).rows?.length > 0)) return;
        const tmpl = await getNotifTemplate("notif_cart");
        if (tmpl) await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "Home" });
      }).catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to add cart entries" });
    }
  });

  // ─── Welcome Notification Cron (runs every 5 minutes) ──────────────────────
  setInterval(async () => {
    try {
      const result = await db.execute(sql`
        SELECT token FROM push_tokens
        WHERE active = 'true'
        AND welcome_sent = 'false'
        AND created_at <= NOW() - INTERVAL '2 hours'
      `);
      const tokens = ((result as any).rows || []).map((r: any) => r.token as string);
      if (tokens.length === 0) return;
      const tmpl = await getNotifTemplate("notif_welcome");
      if (!tmpl) return;
      await sendPushNotifications(tokens, "Offers 365", tmpl, { screen: "Home" });
      for (const token of tokens) {
        await db.execute(sql`
          UPDATE push_tokens SET welcome_sent = 'true', updated_at = NOW() WHERE token = ${token}
        `);
      }
    } catch {}
  }, 5 * 60 * 1000);

  // ─────────────────────────────────────────────────────────────────────────
  // Support Chat - User endpoints
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/chat/send", async (req: Request, res: Response) => {
    try {
      const { userId, message, firstName, lastName, email } = req.body;
      if (!userId || !message?.trim()) {
        return res.status(400).json({ message: "userId and message are required" });
      }
      // Use raw SQL RETURNING * so the response has snake_case keys consistent
      // with the GET endpoints (Drizzle .returning() yields camelCase which
      // breaks the client's created_at / message_admin field lookups).
      const result = await db.execute(sql`
        INSERT INTO messages_users (user_id, message, message_admin, first_name, last_name, email, app, is_read_by_admin)
        VALUES (
          ${userId},
          ${message.trim()},
          NULL,
          ${firstName || null},
          ${lastName || null},
          ${email || null},
          'offres 365 app',
          'false'
        )
        RETURNING *
      `);
      const row = (result as any).rows?.[0];
      if (!row) return res.status(500).json({ message: "Failed to send message" });
      res.json(row);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/chat/messages/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await db.execute(sql`
        SELECT * FROM messages_users WHERE user_id = ${userId} ORDER BY created_at ASC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Support Chat - Admin endpoints
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/chat/conversations", async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT ON (m.user_id)
          m.user_id,
          m.first_name,
          m.last_name,
          m.email,
          m.message,
          m.message_admin,
          m.created_at,
          (SELECT COUNT(*) FROM messages_users m2 WHERE m2.user_id = m.user_id AND m2.is_read_by_admin = 'false' AND m2.message IS NOT NULL) AS unread_count,
          u.online
        FROM messages_users m
        LEFT JOIN users u ON u.id = m.user_id
        ORDER BY m.user_id, m.created_at DESC
      `);
      // Sort by latest message
      const rows = (result.rows as any[]);
      rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/admin/chat/messages/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await db.execute(sql`
        SELECT * FROM messages_users WHERE user_id = ${userId} ORDER BY created_at ASC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/chat/reply", async (req: Request, res: Response) => {
    try {
      const { userId, message } = req.body;
      if (!userId || !message?.trim()) {
        return res.status(400).json({ message: "userId and message are required" });
      }
      // Fetch user info to fill metadata
      const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const u = userRows[0];
      // Use raw SQL RETURNING * for snake_case consistency with GET endpoints
      const result = await db.execute(sql`
        INSERT INTO messages_users (user_id, message, message_admin, first_name, last_name, email, app, is_read_by_admin)
        VALUES (
          ${userId},
          NULL,
          ${message.trim()},
          ${u?.firstName || null},
          ${u?.lastName || null},
          ${u?.email || null},
          'offres 365 app',
          'true'
        )
        RETURNING *
      `);
      const row = (result as any).rows?.[0];
      if (!row) return res.status(500).json({ message: "Failed to send reply" });
      res.json(row);

      // Send push notification to the user asynchronously
      (async () => {
        const tokens = await getActivePushTokensByUserId(userId);
        if (tokens.length === 0) return;
        const body = message.trim().length > 80 ? message.trim().slice(0, 80) + "…" : message.trim();
        await sendPushNotifications(tokens, "رسالة جديدة من الدعم 💬", body, { screen: "SupportChat" });
      })().catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  app.put("/api/admin/chat/read/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      await db.execute(sql`
        UPDATE messages_users SET is_read_by_admin = 'true' WHERE user_id = ${userId} AND message IS NOT NULL
      `);
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // Unread count for a specific user (admin messages not yet seen by user)
  app.get("/api/chat/unread/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await db.execute(sql`
        SELECT COUNT(*) AS count FROM messages_users
        WHERE user_id = ${userId} AND message_admin IS NOT NULL
      `);
      const count = parseInt(String((result as any).rows?.[0]?.count || "0"), 10);
      res.json({ count });
    } catch {
      res.json({ count: 0 });
    }
  });

  // Total unread conversations for admin
  app.get("/api/admin/chat/total-unread", async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) AS count FROM messages_users
        WHERE is_read_by_admin = 'false' AND message IS NOT NULL
      `);
      const count = parseInt(String((result as any).rows?.[0]?.count || "0"), 10);
      res.json({ count });
    } catch {
      res.json({ count: 0 });
    }
  });

  app.delete("/api/admin/chat/conversation/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      await db.execute(sql`DELETE FROM messages_users WHERE user_id = ${userId}`);
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AI Offer Requests (offre_users)
  // ─────────────────────────────────────────────────────────────────────────

  function getNotifMessageForCountry(
    country: string | null | undefined,
    type: "processed" | "cancelled",
    details?: string | null
  ): { title: string; body: string } {
    const c = (country || "").toUpperCase();
    const isArabic = ["DZ", "SA", "AE"].includes(c);
    const isFrench = c === "FR";
    const isSpanish = c === "ES";
    const isPortuguese = c === "BR";

    if (type === "processed") {
      if (isArabic) return { title: "تم معالجة طلبك ✅", body: "تمت معالجة طلب العرض الخاص بك. افتح التطبيق لمشاهدة العرض!" };
      if (isFrench) return { title: "Demande traitée ✅", body: "Votre demande d'offre a été traitée. Ouvrez l'app pour voir l'offre!" };
      if (isSpanish) return { title: "Solicitud procesada ✅", body: "Tu solicitud de oferta ha sido procesada. ¡Abre la app para ver la oferta!" };
      if (isPortuguese) return { title: "Pedido processado ✅", body: "Seu pedido de oferta foi processado. Abra o app para ver a oferta!" };
      return { title: "Offer Request Processed ✅", body: "Your offer request has been processed. Open the app to see your offer!" };
    } else {
      const reason = details ? ` (${details.slice(0, 60)})` : "";
      if (isArabic) return { title: "تم إلغاء طلبك ❌", body: `تم إلغاء طلب العرض الخاص بك${reason}. يمكنك تقديم طلب جديد.` };
      if (isFrench) return { title: "Demande annulée ❌", body: `Votre demande d'offre a été annulée${reason}. Vous pouvez soumettre une nouvelle demande.` };
      if (isSpanish) return { title: "Solicitud cancelada ❌", body: `Tu solicitud de oferta ha sido cancelada${reason}. Puedes enviar una nueva.` };
      if (isPortuguese) return { title: "Pedido cancelado ❌", body: `Seu pedido de oferta foi cancelado${reason}. Você pode enviar um novo.` };
      return { title: "Offer Request Cancelled ❌", body: `Your offer request has been cancelled${reason}. You can submit a new one.` };
    }
  }

  // POST /api/offre-users — user submits a new offer request
  app.post("/api/offre-users", async (req: Request, res: Response) => {
    try {
      const { userId, firstName, lastName, userLink, userLinkImg, userDetails, country } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });

      // Check max 5 per user (pending only)
      const countResult = await db.execute(sql`
        SELECT COUNT(*) AS cnt FROM offre_users
        WHERE user_id = ${userId} AND (status IS NULL OR status = '')
      `);
      const cnt = parseInt(String((countResult as any).rows?.[0]?.cnt || "0"), 10);
      if (cnt >= 5) {
        return res.status(400).json({ message: "Max 5 requests reached" });
      }

      const [row] = await db.insert(offreUsers).values({
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        userLink: userLink || null,
        userLinkImg: userLinkImg || null,
        userDetails: userDetails || null,
        country: country || null,
      }).returning();

      res.json(row);
    } catch (error) {
      res.status(500).json({ message: "Failed to create offer request" });
    }
  });

  // GET /api/offre-users/:userId — get user's own requests
  app.get("/api/offre-users/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const rows = await db.execute(sql`
        SELECT * FROM offre_users WHERE user_id = ${userId}
        ORDER BY created_user_at DESC
      `);
      res.json((rows as any).rows || []);
    } catch {
      res.json([]);
    }
  });

  // PUT /api/offre-users/:id — user edits a pending request
  app.put("/api/offre-users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userLink, userLinkImg, userDetails, country } = req.body;

      // Only allow editing if status is null/pending
      const existing = await db.execute(sql`
        SELECT status FROM offre_users WHERE id = ${parseInt(id)}
      `);
      const row = (existing as any).rows?.[0];
      if (!row) return res.status(404).json({ message: "Not found" });
      if (row.status) return res.status(403).json({ message: "Cannot edit a processed/cancelled request" });

      await db.execute(sql`
        UPDATE offre_users SET
          user_link = ${userLink || null},
          user_link_img = ${userLinkImg || null},
          user_details = ${userDetails || null},
          country = ${country || null}
        WHERE id = ${parseInt(id)}
      `);
      res.json({ message: "Updated" });
    } catch {
      res.status(500).json({ message: "Failed to update" });
    }
  });

  // DELETE /api/offre-users/:id — user deletes a single request
  app.delete("/api/offre-users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM offre_users WHERE id = ${parseInt(id)}`);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  // DELETE /api/offre-users/all/:userId — user clears all own requests
  app.delete("/api/offre-users/all/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      await db.execute(sql`DELETE FROM offre_users WHERE user_id = ${userId}`);
      res.json({ message: "All deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete all" });
    }
  });

  // GET /api/admin/offre-users — admin: pending requests, oldest first
  app.get("/api/admin/offre-users", async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM offre_users
        WHERE status IS NULL OR status = ''
        ORDER BY created_user_at ASC
      `);
      res.json((rows as any).rows || []);
    } catch {
      res.json([]);
    }
  });

  // GET /api/admin/offre-users/history — admin: processed and cancelled
  app.get("/api/admin/offre-users/history", async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM offre_users
        WHERE status = 'yes' OR status = 'no'
        ORDER BY created_admin_at DESC
      `);
      res.json((rows as any).rows || []);
    } catch {
      res.json([]);
    }
  });

  // Helper: auto-generate AI note based on user's country language
  function getAutoAiNote(country: string | null | undefined): string {
    const c = (country || "").toUpperCase();
    if (["DZ", "SA", "AE"].includes(c)) {
      return "تم العثور على أفضل عرض لطلبك! استمتع بالسعر المميز والكوبونات الحصرية 🎁";
    }
    if (c === "FR") {
      return "Nous avons trouvé la meilleure offre pour votre demande ! Profitez du prix spécial et des coupons exclusifs 🎁";
    }
    if (c === "ES") {
      return "¡Hemos encontrado la mejor oferta para tu solicitud! Disfruta del precio especial y los cupones exclusivos 🎁";
    }
    if (c === "BR") {
      return "Encontramos a melhor oferta para o seu pedido! Aproveite o preço especial e os cupons exclusivos 🎁";
    }
    return "We found the best offer for your request! Enjoy the special price and exclusive coupons 🎁";
  }

  // GET /api/offer-request-coupons — get real coupon codes by country and value
  app.get("/api/offer-request-coupons", async (req: Request, res: Response) => {
    try {
      const country = (req.query.country as string || "DZ").toLowerCase();
      const codeValueRaw = req.query.codeValue as string || "0";
      const numericValue = parseFloat(codeValueRaw.replace(/[^0-9.]/g, "")) || 0;

      const rows = await db.execute(sql`
        SELECT * FROM coupon_codes WHERE LOWER(country) = ${country}
      `);
      const allRows = (rows as any).rows || [];

      if (allRows.length === 0) {
        return res.json([]);
      }

      // Find row whose value is closest to admin's code_value
      let bestRow = allRows[0];
      let bestDiff = Infinity;
      for (const row of allRows) {
        const rowVal = parseFloat(String(row.value || "0").replace(/[^0-9.]/g, "")) || 0;
        const diff = Math.abs(rowVal - numericValue);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRow = row;
        }
      }

      // Collect up to 3 non-null/non-empty codes
      const codes: string[] = [];
      for (let i = 1; i <= 12 && codes.length < 3; i++) {
        const code = bestRow[`cod_${i}`];
        if (code && String(code).trim()) codes.push(String(code).trim());
      }

      res.json(codes);
    } catch {
      res.json([]);
    }
  });

  // POST /api/admin/offre-users/:id/process — admin processes a request
  app.post("/api/admin/offre-users/:id/process", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { linkImg, title, price, codeValue, couponVondor, link, details, userId, country } = req.body;

      const finalDetails = (details && details.trim()) ? details.trim() : getAutoAiNote(country);

      await db.execute(sql`
        UPDATE offre_users SET
          link_img = ${linkImg || null},
          title = ${title || null},
          price = ${price || null},
          code_value = ${codeValue || null},
          coupon_vondor = ${couponVondor || null},
          link = ${link || null},
          details = ${finalDetails},
          status = 'yes',
          created_admin_at = NOW()
        WHERE id = ${parseInt(id)}
      `);

      res.json({ message: "Processed" });

      // Notify user async
      (async () => {
        const tokens = await getActivePushTokensByUserId(userId, true);
        if (tokens.length === 0) return;
        const notif = getNotifMessageForCountry(country, "processed");
        await sendPushNotifications(tokens, notif.title, notif.body, { screen: "UserOfferRequest" });
      })().catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // POST /api/admin/offre-users/:id/cancel — admin cancels a request
  app.post("/api/admin/offre-users/:id/cancel", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { details, userId, country } = req.body;

      await db.execute(sql`
        UPDATE offre_users SET
          details = ${details || null},
          status = 'no',
          created_admin_at = NOW()
        WHERE id = ${parseInt(id)}
      `);

      res.json({ message: "Cancelled" });

      // Notify user async
      (async () => {
        const tokens = await getActivePushTokensByUserId(userId, true);
        if (tokens.length === 0) return;
        const notif = getNotifMessageForCountry(country, "cancelled", details);
        await sendPushNotifications(tokens, notif.title, notif.body, { screen: "UserOfferRequest" });
      })().catch(() => {});
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
