import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

/**
 * GET /trends/live
 * Returns real-time status: last score update timestamps and top movers.
 */
router.get("/trends/live", async (_req, res): Promise<void> => {
  const topMovers = await db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.velocity))
    .limit(5);

  const [{ latestUpdate }] = await db
    .select({ latestUpdate: sql<string>`MAX(updated_at)` })
    .from(productsTable);

  res.json({
    lastUpdatedAt: latestUpdate,
    topMovers,
  });
});

export default router;
