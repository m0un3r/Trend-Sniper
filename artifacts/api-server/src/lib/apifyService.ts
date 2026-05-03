import { ApifyClient } from "apify-client";
import { logger } from "./logger";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

export type Platform = "tiktok" | "instagram" | "facebook" | "amazon" | "shopify";

export interface RawPost {
  platform: Platform;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  creatorUsername: string;
  creatorFollowers: number;
  postedAt: Date;
  /** e-commerce extras */
  productName?: string;
  price?: number | null;
  rating?: number | null;
  affiliateUrl?: string | null;
}

function safeInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function safeFloat(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

// ── Social media ────────────────────────────────────────────────────────────

/** TikTok — clockworks/free-tiktok-scraper */
export async function fetchTikTokPosts(hashtags: string[], maxItems = 30): Promise<RawPost[]> {
  try {
    logger.info({ hashtags, maxItems }, "Apify: starting TikTok scrape");
    const run = await client.actor("clockworks/free-tiktok-scraper").call({
      hashtags,
      resultsPerPage: maxItems,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    logger.info({ count: items.length }, "Apify: TikTok scrape done");

    return items.map((item): RawPost => ({
      platform: "tiktok",
      videoUrl: safeStr(item["videoUrl"] ?? item["webVideoUrl"]) || null,
      thumbnailUrl: safeStr(item["coverUrl"] ?? item["thumbnailUrl"]) || null,
      caption: safeStr(item["text"] ?? item["description"]) || null,
      views: safeInt(item["playCount"] ?? item["views"]),
      likes: safeInt(item["diggCount"] ?? item["likes"]),
      comments: safeInt(item["commentCount"] ?? item["comments"]),
      shares: safeInt(item["shareCount"] ?? item["shares"]),
      creatorUsername: safeStr(item["authorMeta"]?.["name"] ?? item["author"]) || "unknown",
      creatorFollowers: safeInt(item["authorMeta"]?.["fans"] ?? item["authorFollowers"]),
      postedAt: item["createTimeISO"] ? new Date(item["createTimeISO"] as string) : new Date(),
    }));
  } catch (err) {
    logger.error({ err }, "Apify: TikTok scrape failed");
    return [];
  }
}

/** Instagram — apify/instagram-hashtag-scraper */
export async function fetchInstagramPosts(hashtags: string[], maxItems = 30): Promise<RawPost[]> {
  try {
    logger.info({ hashtags, maxItems }, "Apify: starting Instagram scrape");
    const run = await client.actor("apify/instagram-hashtag-scraper").call({
      hashtags,
      resultsLimit: maxItems,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    logger.info({ count: items.length }, "Apify: Instagram scrape done");

    return items.map((item): RawPost => ({
      platform: "instagram",
      videoUrl: safeStr(item["videoUrl"]) || null,
      thumbnailUrl: safeStr(item["displayUrl"] ?? item["thumbnailUrl"]) || null,
      caption: safeStr(item["caption"] ?? item["alt"]) || null,
      views: safeInt(item["videoViewCount"] ?? item["views"] ?? item["likesCount"]),
      likes: safeInt(item["likesCount"] ?? item["likes"]),
      comments: safeInt(item["commentsCount"] ?? item["comments"]),
      shares: 0,
      creatorUsername: safeStr(item["ownerUsername"] ?? item["username"]) || "unknown",
      creatorFollowers: safeInt(item["ownerFollowersCount"] ?? item["followers"]),
      postedAt: item["timestamp"] ? new Date(item["timestamp"] as string) : new Date(),
    }));
  } catch (err) {
    logger.error({ err }, "Apify: Instagram scrape failed");
    return [];
  }
}

/** Facebook — apify/facebook-pages-scraper (public pages) */
export async function fetchFacebookPosts(queries: string[], maxItems = 20): Promise<RawPost[]> {
  try {
    logger.info({ queries, maxItems }, "Apify: starting Facebook scrape");
    const run = await client.actor("apify/facebook-pages-scraper").call({
      startUrls: queries.map((q) => ({
        url: `https://www.facebook.com/search/posts?q=${encodeURIComponent(q)}`,
      })),
      maxPosts: maxItems,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    logger.info({ count: items.length }, "Apify: Facebook scrape done");

    return items.map((item): RawPost => ({
      platform: "facebook",
      videoUrl: safeStr(item["videoUrl"]) || null,
      thumbnailUrl: safeStr(item["thumbnailUrl"]) || null,
      caption: safeStr(item["text"] ?? item["message"]) || null,
      views: safeInt(item["views"] ?? item["videoViewCount"] ?? item["reactionsCount"]),
      likes: safeInt(item["reactionsCount"] ?? item["likes"]),
      comments: safeInt(item["commentsCount"] ?? item["comments"]),
      shares: safeInt(item["sharesCount"] ?? item["shares"]),
      creatorUsername: safeStr(item["pageName"] ?? item["username"]) || "unknown",
      creatorFollowers: safeInt(item["pageFollowers"] ?? item["followers"]),
      postedAt: item["date"] ? new Date(item["date"] as string) : new Date(),
    }));
  } catch (err) {
    logger.error({ err }, "Apify: Facebook scrape failed");
    return [];
  }
}

// ── E-commerce ──────────────────────────────────────────────────────────────

/**
 * Amazon — junglee/amazon-best-sellers-scraper
 * Treats each bestseller listing as a "post": reviews = views, rating×200 = likes
 */
export async function fetchAmazonProducts(categories: string[], maxItems = 30): Promise<RawPost[]> {
  try {
    logger.info({ categories, maxItems }, "Apify: starting Amazon scrape");
    const run = await client.actor("junglee/amazon-best-sellers-scraper").call({
      categoryUrls: categories.map((url) => ({ url })),
      maxItemsPerStartUrl: Math.ceil(maxItems / categories.length),
      proxyConfiguration: { useApifyProxy: true },
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    logger.info({ count: items.length }, "Apify: Amazon scrape done");

    return items.map((item): RawPost => {
      const reviewCount = safeInt(item["reviewsCount"] ?? item["ratingsCount"] ?? item["numberOfRatings"]);
      const rating = safeFloat(item["stars"] ?? item["rating"] ?? item["averageRating"], 0);
      const price = safeFloat(item["price"] ?? item["currentPrice"] ?? 0, 0);
      const name = safeStr(item["name"] ?? item["title"] ?? item["productName"]);
      const asin = safeStr(item["asin"] ?? item["productId"] ?? "");

      return {
        platform: "amazon",
        videoUrl: null,
        thumbnailUrl: safeStr(item["thumbnailImage"] ?? item["imageUrl"] ?? item["image"]) || null,
        caption: name || null,
        views: reviewCount,
        likes: Math.round(rating * 200),
        comments: reviewCount,
        shares: 0,
        creatorUsername: safeStr(item["seller"] ?? item["brand"] ?? item["soldBy"]) || "Amazon Seller",
        creatorFollowers: 0,
        postedAt: new Date(),
        productName: name || undefined,
        price: price > 0 ? price : null,
        rating: rating > 0 ? rating : null,
        affiliateUrl: asin ? `https://www.amazon.com/dp/${asin}` : safeStr(item["url"]) || null,
      };
    });
  } catch (err) {
    logger.error({ err }, "Apify: Amazon scrape failed");
    return [];
  }
}

/**
 * Shopify — epctex/shopify-scraper
 * Scrapes public Shopify storefronts for trending products.
 * Reviews = views proxy; availableForSale drives engagement signal.
 */
export async function fetchShopifyProducts(storeUrls: string[], maxItems = 30): Promise<RawPost[]> {
  try {
    logger.info({ storeUrls, maxItems }, "Apify: starting Shopify scrape");
    const run = await client.actor("epctex/shopify-scraper").call({
      startUrls: storeUrls.map((url) => ({ url })),
      maxResults: maxItems,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    logger.info({ count: items.length }, "Apify: Shopify scrape done");

    return items.map((item): RawPost => {
      const name = safeStr(item["title"] ?? item["name"] ?? item["productTitle"]);
      const price = safeFloat(item["price"] ?? item["priceMin"] ?? item["variants"]?.[0]?.["price"] ?? 0, 0);
      const vendor = safeStr(item["vendor"] ?? item["brand"] ?? item["store"]);
      const url = safeStr(item["url"] ?? item["productUrl"] ?? item["handle"]);
      const reviewCount = safeInt(item["reviewsCount"] ?? item["totalReviews"] ?? 0);
      const image = safeStr(item["image"] ?? item["featuredImage"] ?? item["images"]?.[0]);

      return {
        platform: "shopify",
        videoUrl: null,
        thumbnailUrl: image || null,
        caption: name
          ? `${name}${item["description"] ? " — " + String(item["description"]).slice(0, 120) : ""}`
          : null,
        views: reviewCount > 0 ? reviewCount * 50 : 1000,
        likes: reviewCount > 0 ? reviewCount * 10 : 200,
        comments: reviewCount,
        shares: 0,
        creatorUsername: vendor || "Shopify Store",
        creatorFollowers: 0,
        postedAt: item["createdAt"] ? new Date(item["createdAt"] as string) : new Date(),
        productName: name || undefined,
        price: price > 0 ? price : null,
        rating: null,
        affiliateUrl: url || null,
      };
    });
  } catch (err) {
    logger.error({ err }, "Apify: Shopify scrape failed");
    return [];
  }
}
