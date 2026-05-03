/**
 * Ingestion Engine
 *
 * Fetches fresh posts from Apify actors, extracts product signals,
 * upserts products + posts into the DB, and clears old demo data.
 */
import { db, productsTable, postsTable, alertsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { fetchTikTokPosts, fetchInstagramPosts, fetchFacebookPosts, type RawPost } from "./apifyService";

// ── Hashtag / keyword targets per category ─────────────────────────────────

const TIKTOK_HASHTAGS = [
  "tiktokmademebuyit",
  "viralproduct",
  "amazonfinds",
  "skincare",
  "gadgets",
  "fashionfinds",
  "fitness",
];

const INSTAGRAM_HASHTAGS = [
  "instashop",
  "beautytips",
  "techgadgets",
  "outfitoftheday",
  "workoutmotivation",
];

const FACEBOOK_QUERIES = [
  "viral product 2025",
  "best skincare product",
  "trending gadget",
  "fashion must have",
];

// ── Product signal extractor ───────────────────────────────────────────────

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
  const text = [post.caption].filter(Boolean).join(" ");
  if (!text) return null;
  for (const p of PRODUCT_PATTERNS) {
    if (p.regex.test(text)) return { name: p.name, category: p.category };
  }
  return null;
}

function computeTrendScore(post: RawPost): number {
  const engRate = post.views > 0 ? ((post.likes + post.comments + post.shares) / post.views) * 100 : 0;
  const viewScore = Math.min(100, Math.log10(post.views + 1) * 20);
  const engScore = Math.min(100, engRate * 10);
  const raw = 0.6 * viewScore + 0.4 * engScore;
  return Math.round(Math.min(100, raw) * 10) / 10;
}

// ── Platform-specific product name refinement ──────────────────────────────

function refineName(base: string, platform: string, caption: string | null): string {
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

// ── Main ingestion function ────────────────────────────────────────────────

export interface IngestionResult {
  platforms: { tiktok: number; instagram: number; facebook: number };
  productsUpserted: number;
  postsInserted: number;
  demoDataCleared: boolean;
}

export async function runIngestion(): Promise<IngestionResult> {
  logger.info("Ingestion: starting full social media fetch");

  // 1. Fetch from all three platforms in parallel
  const [tiktokPosts, instagramPosts, facebookPosts] = await Promise.all([
    fetchTikTokPosts(TIKTOK_HASHTAGS, 40),
    fetchInstagramPosts(INSTAGRAM_HASHTAGS, 30),
    fetchFacebookPosts(FACEBOOK_QUERIES, 20),
  ]);

  const allPosts: RawPost[] = [...tiktokPosts, ...instagramPosts, ...facebookPosts];

  logger.info(
    { tiktok: tiktokPosts.length, instagram: instagramPosts.length, facebook: facebookPosts.length, total: allPosts.length },
    "Ingestion: fetch complete"
  );

  // 2. Clear all demo/old data
  await db.delete(alertsTable);
  await db.delete(postsTable);
  await db.delete(productsTable);
  logger.info("Ingestion: cleared existing data");

  // 3. Group posts by product signal, upsert products
  const productMap = new Map<string, { name: string; category: string; platform: string; posts: RawPost[] }>();

  for (const post of allPosts) {
    const signal = extractProductSignal(post);
    if (!signal) continue;
    const refined = refineName(signal.name, post.platform, post.caption);
    const key = `${refined}::${post.platform}`;
    if (!productMap.has(key)) {
      productMap.set(key, { name: refined, category: signal.category, platform: post.platform, posts: [] });
    }
    productMap.get(key)!.posts.push(post);
  }

  // If we got zero signals (actor returned nothing useful), insert a placeholder set
  if (productMap.size === 0) {
    logger.warn("Ingestion: no product signals detected in scraped posts — DB stays empty, no demo data re-inserted");
    return {
      platforms: { tiktok: tiktokPosts.length, instagram: instagramPosts.length, facebook: facebookPosts.length },
      productsUpserted: 0,
      postsInserted: 0,
      demoDataCleared: true,
    };
  }

  let productsUpserted = 0;
  let postsInserted = 0;

  for (const [, productData] of productMap) {
    const { name, category, platform, posts } = productData;
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
    const velocity = Math.min(100, Math.round((totalViews / Math.max(1, totalPosts)) / 10000 * 10) / 10);

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
        imageUrl: posts.find((p) => p.thumbnailUrl)?.thumbnailUrl ?? null,
        affiliateUrl: null,
        detectedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    productsUpserted++;

    // Insert posts linked to this product
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

  // Also insert posts that didn't match any product signal (for the Posts page)
  const unmatched = allPosts.filter((p) => !extractProductSignal(p)).slice(0, 30);
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
    platforms: { tiktok: tiktokPosts.length, instagram: instagramPosts.length, facebook: facebookPosts.length },
    productsUpserted,
    postsInserted,
    demoDataCleared: true,
  };
}
