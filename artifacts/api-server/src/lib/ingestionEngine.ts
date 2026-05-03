/**
 * Ingestion Engine
 *
 * Fetches fresh posts/products from Apify and/or Bright Data across all 5 platforms,
 * extracts product signals, upserts products + posts into the DB,
 * and clears old demo data before writing real data.
 */
import { db, productsTable, postsTable, alertsTable } from "@workspace/db";
import { logger } from "./logger";
import {
  fetchTikTokPosts,
  fetchInstagramPosts,
  fetchFacebookPosts,
  fetchAmazonProducts,
  fetchShopifyProducts,
  type RawPost,
} from "./apifyService";
import {
  fetchBrightDataTikTok,
  fetchBrightDataInstagram,
  fetchBrightDataAmazon,
} from "./brightDataService";

export type DataSource = "apify" | "brightdata" | "both";

// ── Targets ─────────────────────────────────────────────────────────────────

const TIKTOK_HASHTAGS = [
  "tiktokmademebuyit", "viralproduct", "amazonfinds",
  "skincare", "gadgets", "fashionfinds", "fitness",
];

const INSTAGRAM_HASHTAGS = [
  "instashop", "beautytips", "techgadgets",
  "outfitoftheday", "workoutmotivation",
];

const FACEBOOK_QUERIES = [
  "viral product 2025", "best skincare product",
  "trending gadget", "fashion must have",
];

// Amazon bestseller category URLs (public, no login required)
const AMAZON_CATEGORIES = [
  "https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty",
  "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
  "https://www.amazon.com/Best-Sellers-Clothing/zgbs/fashion",
  "https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods",
  "https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden",
];

// Popular Shopify-powered stores with public product catalogs
const SHOPIFY_STORES = [
  "https://gymshark.com/collections/all",
  "https://skims.com/collections/all",
  "https://www.fashionnova.com/collections/new-arrivals",
  "https://www.ruggable.com/collections/rugs",
];

// ── Product signal extractor (social posts) ─────────────────────────────────

const PRODUCT_PATTERNS: Array<{ regex: RegExp; name: string; category: string }> = [
  { regex: /skin\s*care|serum|moisturi[sz]er|sunscreen|retinol|face\s*mask/i, name: "Skincare Trend", category: "beauty" },
  { regex: /lip\s*(gloss|liner|balm|stain)|blush|mascara|foundation|concealer/i, name: "Makeup Essential", category: "beauty" },
  { regex: /hair\s*(mask|oil|serum|care|growth)/i, name: "Hair Care Product", category: "beauty" },
  { regex: /led\s*(face\s*)?mask|gua\s*sha|jade\s*roller|microneedl/i, name: "Beauty Device", category: "beauty" },
  { regex: /airpod|earbud|headphone|speaker|bluetooth\s*audio/i, name: "Audio Tech", category: "tech" },
  { regex: /laptop\s*(stand|bag)|keyboard|mouse|desk\s*(mat|setup)/i, name: "Desk Setup Gear", category: "tech" },
  { regex: /phone\s*(case|stand|holder|grip)|magsafe/i, name: "Phone Accessory", category: "tech" },
  { regex: /smart\s*(watch|ring|band|scale)|fitness\s*tracker/i, name: "Wearable Tech", category: "tech" },
  { regex: /mini\s*projector|ring\s*light|webcam|microphone/i, name: "Creator Gear", category: "tech" },
  { regex: /dress|outfit|jeans|leggings|cardigan|hoodie|sneaker/i, name: "Fashion Item", category: "fashion" },
  { regex: /gym|workout|protein|supplement|pre[-\s]?workout|creatine/i, name: "Fitness Product", category: "fitness" },
  { regex: /home\s*decor|aesthetic|candle|diffuser|lamp|organiz/i, name: "Home Decor", category: "home" },
  { regex: /air\s*fryer|kitchen|blender|coffee|matcha|cooking/i, name: "Kitchen Product", category: "food" },
  { regex: /amazon\s*find|must\s*have|obsessed|game\s*changer/i, name: "Viral Find", category: "beauty" },
];

function extractProductSignal(post: RawPost): { name: string; category: string } | null {
  // E-commerce posts carry explicit product names
  if (post.platform === "amazon" || post.platform === "shopify") {
    if (post.productName) {
      const cap = post.productName.toLowerCase();
      for (const p of PRODUCT_PATTERNS) {
        if (p.regex.test(cap)) return { name: post.productName, category: p.category };
      }
      // Fallback category based on caption keywords
      return { name: post.productName, category: guessCategory(post.caption ?? post.productName) };
    }
  }
  const text = [post.caption].filter(Boolean).join(" ");
  if (!text) return null;
  for (const p of PRODUCT_PATTERNS) {
    if (p.regex.test(text)) return { name: p.name, category: p.category };
  }
  return null;
}

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (/beauty|skin|hair|makeup|serum|cream/.test(t)) return "beauty";
  if (/tech|phone|laptop|computer|electronic|gadget/.test(t)) return "tech";
  if (/fashion|cloth|dress|shirt|shoe|bag/.test(t)) return "fashion";
  if (/fitness|gym|sport|workout|yoga/.test(t)) return "fitness";
  if (/home|kitchen|decor|furniture|rug/.test(t)) return "home";
  if (/food|drink|coffee|nutrition|supplement/.test(t)) return "food";
  return "other";
}

function computeTrendScore(post: RawPost): number {
  if (post.platform === "amazon") {
    const rating = (post.rating ?? 0) / 5;
    const reviewScore = Math.min(100, Math.log10(post.views + 1) * 25);
    return Math.round((rating * 40 + reviewScore * 0.6) * 10) / 10;
  }
  if (post.platform === "shopify") {
    const viewScore = Math.min(100, Math.log10(post.views + 1) * 22);
    return Math.round(Math.min(100, viewScore) * 10) / 10;
  }
  const engRate = post.views > 0 ? ((post.likes + post.comments + post.shares) / post.views) * 100 : 0;
  const viewScore = Math.min(100, Math.log10(post.views + 1) * 20);
  const engScore = Math.min(100, engRate * 10);
  return Math.round(Math.min(100, 0.6 * viewScore + 0.4 * engScore) * 10) / 10;
}

function refineName(base: string, caption: string | null): string {
  const cap = (caption ?? "").toLowerCase();
  if (base === "Skincare Trend") {
    if (/serum/i.test(cap)) return "Viral Serum";
    if (/sunscreen/i.test(cap)) return "SPF Sunscreen";
    if (/retinol/i.test(cap)) return "Retinol Cream";
    if (/moisturi/i.test(cap)) return "Moisturizer";
  }
  if (base === "Fashion Item") {
    if (/dress/i.test(cap)) return "Trending Dress";
    if (/jeans|denim/i.test(cap)) return "Viral Denim";
    if (/sneaker/i.test(cap)) return "Trending Sneakers";
    if (/hoodie/i.test(cap)) return "Aesthetic Hoodie";
  }
  return base;
}

function normalizeFingerprint(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getPostFingerprint(post: RawPost): string {
  const parts = [
    post.platform,
    post.productName ?? "",
    post.videoUrl ?? "",
    post.caption ?? "",
    post.creatorUsername ?? "",
  ];
  return normalizeFingerprint(parts.join("|"));
}

async function fetchWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  label: string,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    logger.warn({ err, label }, "Ingestion: primary source failed, falling back");
    return fallback();
  }
}

// ── Main ingestion ───────────────────────────────────────────────────────────

export interface IngestionResult {
  platforms: {
    tiktok: number;
    instagram: number;
    facebook: number;
    amazon: number;
    shopify: number;
  };
  productsUpserted: number;
  postsInserted: number;
  demoDataCleared: boolean;
  source: DataSource;
  confidence: number;
}

function computeSourceConfidence(sourceCounts: { apify: number; brightdata: number }): number {
  const total = sourceCounts.apify + sourceCounts.brightdata;
  if (total === 0) return 0;
  const overlapBoost = Math.min(sourceCounts.apify, sourceCounts.brightdata) / total;
  return Math.round((0.65 + overlapBoost * 0.35) * 100);
}

export async function runIngestion(source: DataSource = "apify"): Promise<IngestionResult> {
  logger.info({ source }, "Ingestion: starting fetch");

  let tiktokPosts: RawPost[] = [];
  let instagramPosts: RawPost[] = [];
  let facebookPosts: RawPost[] = [];
  let amazonProducts: RawPost[] = [];
  let shopifyProducts: RawPost[] = [];
  let apifyCount = 0;
  let brightdataCount = 0;

  if (source === "apify" || source === "both") {
    logger.info("Ingestion: running Apify actors");
    const [tt, ig, fb, amz, shp] = await Promise.all([
      fetchTikTokPosts(TIKTOK_HASHTAGS, 40),
      fetchInstagramPosts(INSTAGRAM_HASHTAGS, 30),
      fetchFacebookPosts(FACEBOOK_QUERIES, 20),
      fetchAmazonProducts(AMAZON_CATEGORIES, 30),
      fetchShopifyProducts(SHOPIFY_STORES, 30),
    ]);
    tiktokPosts = [...tiktokPosts, ...tt];
    instagramPosts = [...instagramPosts, ...ig];
    facebookPosts = [...facebookPosts, ...fb];
    amazonProducts = [...amazonProducts, ...amz];
    shopifyProducts = [...shopifyProducts, ...shp];
    apifyCount += tt.length + ig.length + fb.length + amz.length + shp.length;
    logger.info({ tiktok: tt.length, instagram: ig.length, facebook: fb.length, amazon: amz.length, shopify: shp.length }, "Ingestion: Apify complete");
  }

  if (source === "brightdata" || source === "both") {
    logger.info("Ingestion: running Bright Data datasets");
    const AMAZON_KEYWORDS = ["trending skincare", "viral gadgets", "best fitness gear", "trending fashion", "home decor bestsellers"];
    const [bdTt, bdIg, bdAmz] = await Promise.all([
      fetchWithFallback(
        () => fetchBrightDataTikTok(TIKTOK_HASHTAGS, 40),
        () => fetchTikTokPosts(TIKTOK_HASHTAGS, 40),
        "tiktok",
      ),
      fetchWithFallback(
        () => fetchBrightDataInstagram(INSTAGRAM_HASHTAGS, 30),
        () => fetchInstagramPosts(INSTAGRAM_HASHTAGS, 30),
        "instagram",
      ),
      fetchWithFallback(
        () => fetchBrightDataAmazon(AMAZON_KEYWORDS, 30),
        () => fetchAmazonProducts(AMAZON_CATEGORIES, 30),
        "amazon",
      ),
    ]);
    tiktokPosts = [...tiktokPosts, ...bdTt];
    instagramPosts = [...instagramPosts, ...bdIg];
    amazonProducts = [...amazonProducts, ...bdAmz];
    brightdataCount += bdTt.length + bdIg.length + bdAmz.length;
    logger.info({ tiktok: bdTt.length, instagram: bdIg.length, amazon: bdAmz.length }, "Ingestion: Bright Data complete");
  }

  const allPosts: RawPost[] = [
    ...tiktokPosts, ...instagramPosts, ...facebookPosts,
    ...amazonProducts, ...shopifyProducts,
  ];

  logger.info(
    {
      tiktok: tiktokPosts.length,
      instagram: instagramPosts.length,
      facebook: facebookPosts.length,
      amazon: amazonProducts.length,
      shopify: shopifyProducts.length,
      total: allPosts.length,
      source,
    },
    "Ingestion: fetch complete"
  );

  // 2. Clear existing data
  await db.delete(alertsTable);
  await db.delete(postsTable);
  await db.delete(productsTable);
  logger.info("Ingestion: cleared existing data");

  // 3. Group by product signal
  const productMap = new Map<string, { name: string; category: string; platform: string; posts: RawPost[]; fingerprints: Set<string> }>();

  for (const post of allPosts) {
    const signal = extractProductSignal(post);
    if (!signal) continue;

    // E-commerce: each item is its own product (keyed by exact name)
    // Social: group similar signals per platform
    const isEcom = post.platform === "amazon" || post.platform === "shopify";
    const productName = isEcom ? signal.name : refineName(signal.name, post.caption);
    const key = isEcom ? `${productName}::${post.platform}` : `${productName}::${post.platform}`;

    if (!productMap.has(key)) {
      productMap.set(key, { name: productName, category: signal.category, platform: post.platform, posts: [], fingerprints: new Set() });
    }
    const bucket = productMap.get(key)!;
    const fingerprint = getPostFingerprint(post);
    if (bucket.fingerprints.has(fingerprint)) continue;
    bucket.fingerprints.add(fingerprint);
    bucket.posts.push(post);
  }

  if (productMap.size === 0) {
    logger.warn("Ingestion: no product signals detected — DB empty");
    return {
      platforms: {
        tiktok: tiktokPosts.length, instagram: instagramPosts.length,
        facebook: facebookPosts.length, amazon: amazonProducts.length, shopify: shopifyProducts.length,
      },
      productsUpserted: 0, postsInserted: 0, demoDataCleared: true, source,
    };
  }

  let productsUpserted = 0;
  let postsInserted = 0;

  for (const [, productData] of productMap) {
    const { name, category, platform, posts } = productData;
    const isEcom = platform === "amazon" || platform === "shopify";

    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const totalShares = posts.reduce((s, p) => s + p.shares, 0);
    const totalPosts = posts.length;
    const engagementRate = totalViews > 0
      ? Math.round(((totalLikes + totalComments + totalShares) / totalViews) * 1000) / 10
      : 0;
    const avgScore = posts.reduce((s, p) => s + computeTrendScore(p), 0) / posts.length;
    const trendScore = Math.round(avgScore * 10) / 10;
    const velocity = isEcom
      ? Math.min(100, Math.round((totalViews / Math.max(1, totalPosts)) / 5000 * 10) / 10)
      : Math.min(100, Math.round((totalViews / Math.max(1, totalPosts)) / 10000 * 10) / 10);

    // For e-commerce, carry through affiliate URL, price, and rating from the first post
    const firstPost = posts[0];
    const affiliateUrl = isEcom ? (firstPost?.affiliateUrl ?? null) : null;
    const imageUrl = posts.find((p) => p.thumbnailUrl)?.thumbnailUrl ?? null;

    // Average price and rating across all e-commerce posts that have them
    const pricesWithValues = posts.map((p) => p.price).filter((v): v is number => v != null && v > 0);
    const ratingsWithValues = posts.map((p) => p.rating).filter((v): v is number => v != null && v > 0);
    const price = isEcom && pricesWithValues.length > 0
      ? Math.round((pricesWithValues.reduce((s, v) => s + v, 0) / pricesWithValues.length) * 100) / 100
      : null;
    const rating = isEcom && ratingsWithValues.length > 0
      ? Math.round((ratingsWithValues.reduce((s, v) => s + v, 0) / ratingsWithValues.length) * 10) / 10
      : null;

    const [inserted] = await db
      .insert(productsTable)
      .values({
        name,
        category,
        platform,
        trendScore,
        velocity,
        engagementRate,
        totalPosts,
        totalViews,
        imageUrl,
        affiliateUrl,
        price,
        rating,
        detectedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    productsUpserted++;

    for (const post of posts.slice(0, 10)) {
      await db.insert(postsTable).values({
        platform: post.platform,
        videoUrl: post.videoUrl,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        trendScore: computeTrendScore(post),
        creatorUsername: post.creatorUsername,
        creatorFollowers: post.creatorFollowers,
        productId: inserted.id,
        postedAt: post.postedAt,
      });
      postsInserted++;
    }
  }

  // Unmatched social posts (no product signal) go in for browsing
  const unmatched = allPosts
    .filter((p) => p.platform !== "amazon" && p.platform !== "shopify" && !extractProductSignal(p))
    .filter((post, index, arr) => arr.findIndex((other) => getPostFingerprint(other) === getPostFingerprint(post)) === index)
    .slice(0, 30);

  for (const post of unmatched) {
    await db.insert(postsTable).values({
      platform: post.platform,
      videoUrl: post.videoUrl,
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption,
      views: post.views,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      trendScore: computeTrendScore(post),
      creatorUsername: post.creatorUsername,
      creatorFollowers: post.creatorFollowers,
      productId: null,
      postedAt: post.postedAt,
    });
    postsInserted++;
  }

  logger.info({ productsUpserted, postsInserted }, "Ingestion: complete");

  return {
    platforms: {
      tiktok: tiktokPosts.length,
      instagram: instagramPosts.length,
      facebook: facebookPosts.length,
      amazon: amazonProducts.length,
      shopify: shopifyProducts.length,
    },
    productsUpserted,
    postsInserted,
    demoDataCleared: true,
    source,
    confidence: computeSourceConfidence({ apify: apifyCount, brightdata: brightdataCount }),
  };
}
