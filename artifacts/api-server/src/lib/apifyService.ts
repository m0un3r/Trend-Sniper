import { ApifyClient } from "apify-client";
import { logger } from "./logger";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

export interface RawPost {
  platform: "tiktok" | "instagram" | "facebook";
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
}

function safeInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

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
