import { Router } from "express";
import { db, productsTable, postsTable } from "@workspace/db";
import { desc, avg, count, max } from "drizzle-orm";
import { GetTopProductsQueryParams } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [productStats] = await db
    .select({
      total: count(productsTable.id),
      avgScore: avg(productsTable.trendScore),
    })
    .from(productsTable);

  const [postStats] = await db
    .select({ total: count(postsTable.id) })
    .from(postsTable);

  // Products with score > 70 are "trending now"
  const [trendingNow] = await db
    .select({ count: count(productsTable.id) })
    .from(productsTable)
    .where(sql`${productsTable.trendScore} > 70`);

  // Products detected in last 7 days
  const [newThisWeek] = await db
    .select({ count: count(productsTable.id) })
    .from(productsTable)
    .where(sql`${productsTable.detectedAt} > NOW() - INTERVAL '7 days'`);

  // Top category by count
  const topCategoryRows = await db
    .select({
      category: productsTable.category,
      cnt: count(productsTable.id),
    })
    .from(productsTable)
    .groupBy(productsTable.category)
    .orderBy(desc(count(productsTable.id)))
    .limit(1);

  // Top platform by count
  const topPlatformRows = await db
    .select({
      platform: productsTable.platform,
      cnt: count(productsTable.id),
    })
    .from(productsTable)
    .groupBy(productsTable.platform)
    .orderBy(desc(count(productsTable.id)))
    .limit(1);

  res.json({
    totalProductsTracked: Number(productStats.total),
    trendingNow: Number(trendingNow.count),
    newThisWeek: Number(newThisWeek.count),
    totalPostsAnalyzed: Number(postStats.total),
    avgTrendScore: Math.round(Number(productStats.avgScore ?? 0) * 10) / 10,
    topCategory: topCategoryRows[0]?.category ?? "N/A",
    topPlatform: topPlatformRows[0]?.platform ?? "N/A",
  });
});

router.get("/dashboard/top-products", async (req, res): Promise<void> => {
  const query = GetTopProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: "Invalid query params" });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.trendScore))
    .limit(query.data.limit);

  const [{ total }] = await db
    .select({ total: count(productsTable.id) })
    .from(productsTable);

  res.json({ products, total: Number(total) });
});

router.get("/dashboard/platform-breakdown", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      platform: productsTable.platform,
      count: count(productsTable.id),
      avgScore: avg(productsTable.trendScore),
    })
    .from(productsTable)
    .groupBy(productsTable.platform)
    .orderBy(desc(count(productsTable.id)));

  res.json({
    platforms: rows.map((r) => ({
      platform: r.platform,
      count: Number(r.count),
      avgScore: Math.round(Number(r.avgScore ?? 0) * 10) / 10,
    })),
  });
});

export default router;
