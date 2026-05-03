/**
 * Bright Data Service
 *
 * Uses Bright Data's Dataset API to collect trending products and posts
 * from TikTok, Instagram, and Amazon as an alternative/complement to Apify.
 *
 * Dataset API flow:
 *  1. POST /datasets/v3/trigger?dataset_id=<id>  → { snapshot_id }
 *  2. Poll GET /datasets/v3/snapshot/<id>?format=json  until status = "ready"
 *  3. Download result rows
 */

import { logger } from "./logger";
import type { RawPost } from "./apifyService";

const BASE = "https://api.brightdata.com";

// Bright Data pre-built dataset IDs
const DATASET_IDS = {
  tiktok: "gd_lu702nij2f790tmv24",
  instagram: "gd_lk5ns1qpbhfq73jhr",
  amazon: "gd_l7q7dkf244hwjntr0",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(): string {
  const t = process.env.BRIGHT_DATA_API_TOKEN;
  if (!t) throw new Error("BRIGHT_DATA_API_TOKEN is not set");
  return t;
}

function safeInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function safeFloat(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Trigger a dataset collection and return the snapshot ID */
async function triggerDataset(
  datasetId: string,
  inputs: Record<string, unknown>[],
): Promise<string> {
  const token = getToken();
  const url = `${BASE}/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true&format=json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inputs),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bright Data trigger failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { snapshot_id: string };
  if (!data.snapshot_id) throw new Error("Bright Data: no snapshot_id in trigger response");
  return data.snapshot_id;
}

/** Poll a snapshot until it is ready, then return the rows */
async function pollSnapshot(
  snapshotId: string,
  maxWaitMs = 240_000,
): Promise<unknown[]> {
  const token = getToken();
  const url = `${BASE}/datasets/v3/snapshot/${snapshotId}?format=json`;
  const deadline = Date.now() + maxWaitMs;
  let delay = 5_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 202) {
      // Still collecting
      delay = Math.min(delay * 1.5, 30_000);
      logger.info({ snapshotId, delay }, "Bright Data: snapshot still collecting");
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bright Data snapshot poll failed (${res.status}): ${body}`);
    }

    // 200 → data is ready
    const rows = (await res.json()) as unknown[];
    logger.info({ snapshotId, rowCount: rows.length }, "Bright Data: snapshot ready");
    return rows;
  }

  throw new Error(`Bright Data: snapshot ${snapshotId} not ready within ${maxWaitMs / 1000}s`);
}

// ── TikTok ────────────────────────────────────────────────────────────────────

interface BrightDataTikTokRow {
  url?: string;
  description?: string;
  plays?: number;
  digg_count?: number;
  share_count?: number;
  comment_count?: number;
  create_time?: number;
  author?: { nickname?: string; follower_count?: number };
  cover?: string;
}

export async function fetchBrightDataTikTok(
  hashtags: string[],
  limit: number,
): Promise<RawPost[]> {
  logger.info({ hashtags, limit }, "Bright Data: fetching TikTok posts");

  const inputs = hashtags.slice(0, 5).map((tag) => ({
    hashtag: tag.replace(/^#/, ""),
    num_of_posts: Math.ceil(limit / hashtags.length),
    country: "US",
  }));

  const snapshotId = await triggerDataset(DATASET_IDS.tiktok, inputs);
  const rows = (await pollSnapshot(snapshotId)) as BrightDataTikTokRow[];

  return rows.slice(0, limit).map((r): RawPost => ({
    platform: "tiktok",
    videoUrl: r.url ?? null,
    thumbnailUrl: r.cover ?? null,
    caption: r.description ?? null,
    views: safeInt(r.plays),
    likes: safeInt(r.digg_count),
    comments: safeInt(r.comment_count),
    shares: safeInt(r.share_count),
    creatorUsername: r.author?.nickname ?? "unknown",
    creatorFollowers: safeInt(r.author?.follower_count),
    postedAt: r.create_time ? new Date(r.create_time * 1000) : new Date(),
  }));
}

// ── Instagram ─────────────────────────────────────────────────────────────────

interface BrightDataInstagramRow {
  url?: string;
  description?: string;
  likes?: number;
  comments?: number;
  timestamp?: string;
  owner?: { username?: string; followed_by_count?: number };
  image_url?: string;
}

export async function fetchBrightDataInstagram(
  hashtags: string[],
  limit: number,
): Promise<RawPost[]> {
  logger.info({ hashtags, limit }, "Bright Data: fetching Instagram posts");

  const inputs = hashtags.slice(0, 5).map((tag) => ({
    hashtag: tag.replace(/^#/, ""),
    num_of_posts: Math.ceil(limit / hashtags.length),
    country: "US",
  }));

  const snapshotId = await triggerDataset(DATASET_IDS.instagram, inputs);
  const rows = (await pollSnapshot(snapshotId)) as BrightDataInstagramRow[];

  return rows.slice(0, limit).map((r): RawPost => ({
    platform: "instagram",
    videoUrl: r.url ?? null,
    thumbnailUrl: r.image_url ?? null,
    caption: r.description ?? null,
    views: safeInt(r.likes) * 20,
    likes: safeInt(r.likes),
    comments: safeInt(r.comments),
    shares: 0,
    creatorUsername: r.owner?.username ?? "unknown",
    creatorFollowers: safeInt(r.owner?.followed_by_count),
    postedAt: r.timestamp ? new Date(r.timestamp) : new Date(),
  }));
}

// ── Amazon ────────────────────────────────────────────────────────────────────

interface BrightDataAmazonRow {
  url?: string;
  title?: string;
  price?: number | string;
  rating?: number | string;
  reviews_count?: number | string;
  image?: string;
  asin?: string;
  brand?: string;
  category?: string;
}

export async function fetchBrightDataAmazon(
  keywords: string[],
  limit: number,
): Promise<RawPost[]> {
  logger.info({ keywords, limit }, "Bright Data: fetching Amazon products");

  const inputs = keywords.slice(0, 5).map((kw) => ({
    keyword: kw,
    country: "US",
    domain: "amazon.com",
    num_of_results: Math.ceil(limit / keywords.length),
  }));

  const snapshotId = await triggerDataset(DATASET_IDS.amazon, inputs);
  const rows = (await pollSnapshot(snapshotId)) as BrightDataAmazonRow[];

  return rows.slice(0, limit).map((r): RawPost => {
    const reviewCount = safeInt(r.reviews_count);
    return {
      platform: "amazon",
      videoUrl: null,
      thumbnailUrl: r.image ?? null,
      caption: r.title ?? null,
      views: reviewCount,
      likes: Math.round(reviewCount * safeFloat(r.rating ?? 0)! || 0),
      comments: reviewCount,
      shares: 0,
      creatorUsername: r.brand ?? "Amazon",
      creatorFollowers: 0,
      postedAt: new Date(),
      productName: r.title ?? undefined,
      price: safeFloat(r.price),
      rating: safeFloat(r.rating),
      affiliateUrl: r.url ?? null,
    };
  });
}
