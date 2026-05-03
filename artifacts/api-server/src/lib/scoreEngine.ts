import { db, productsTable, alertsTable } from "@workspace/db";
import { and, desc, eq, lt, not } from "drizzle-orm";
import { logger } from "./logger";

/**
 * TrendSniper Score Engine
 *
 * Recalculates trend scores every tick based on:
 *  - velocity:      how fast views are accumulating (simulated hourly growth)
 *  - engagement:    likes+comments+shares / views
 *  - frequency:     number of posts driving the product
 *  - momentum:      whether the product was already trending (score × 0.92 decay)
 *  - time pattern:  trends spike in evening hours (18:00–23:00)
 *
 * Formula: 0.4×velocity + 0.3×engagement + 0.2×frequency + 0.1×momentum
 */

function timeMultiplier(): number {
  const h = new Date().getHours();
  if (h >= 18 && h <= 23) return 1.15;
  if (h >= 0 && h <= 6) return 0.85;
  return 1.0;
}

function jitter(base: number, pct: number = 0.12): number {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Check every untriggered alert; fire any whose product's score now meets the threshold. */
async function triggerAlerts(): Promise<void> {
  const untriggered = await db
    .select({
      alertId: alertsTable.id,
      threshold: alertsTable.threshold,
      productId: alertsTable.productId,
      trendScore: productsTable.trendScore,
      productName: productsTable.name,
    })
    .from(alertsTable)
    .innerJoin(productsTable, eq(alertsTable.productId, productsTable.id))
    .where(not(alertsTable.triggered));

  let fired = 0;
  for (const row of untriggered) {
    if (row.trendScore >= row.threshold) {
      await db
        .update(alertsTable)
        .set({ triggered: true })
        .where(eq(alertsTable.id, row.alertId));

      logger.info(
        { alertId: row.alertId, product: row.productName, score: row.trendScore, threshold: row.threshold },
        "Alert triggered: trend score crossed threshold",
      );
      fired++;
    }
  }

  if (fired > 0) {
    logger.info({ fired }, "Alerts fired this tick");
  }
}

export async function runScoreTick(): Promise<void> {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.trendScore));

    if (products.length === 0) return;

    const tm = timeMultiplier();

    for (const product of products) {
      const baseViewDelta = Math.floor((product.totalViews / 1440) * jitter(1.0, 0.3));
      const newViews = product.totalViews + baseViewDelta;

      // 5% chance of a viral spike each tick
      const hasSpike = Math.random() < 0.05;
      const spikeMultiplier = hasSpike ? jitter(3.5, 0.4) : 1.0;

      if (hasSpike) {
        logger.info({ product: product.name, spikeMultiplier }, "Viral spike detected");
      }

      const newPosts = product.totalPosts + (Math.random() < 0.1 ? 1 : 0);

      const rawVelocity = clamp((baseViewDelta * spikeMultiplier * tm) / (product.totalViews / 1000), 0, 100);
      const newVelocity = clamp(jitter(rawVelocity, 0.1), 0, 100);

      const newEngagement = clamp(jitter(product.engagementRate, 0.05), 1, 25);

      const frequencyScore = clamp(Math.log10(newPosts + 1) * 30, 0, 100);

      const momentum = product.trendScore * 0.92;

      const rawScore =
        0.4 * newVelocity +
        0.3 * (newEngagement * 5) +
        0.2 * frequencyScore +
        0.1 * momentum;

      const newScore = clamp(jitter(rawScore, 0.03), 0, 100);

      await db
        .update(productsTable)
        .set({
          trendScore: Math.round(newScore * 10) / 10,
          velocity: Math.round(newVelocity * 10) / 10,
          engagementRate: Math.round(newEngagement * 10) / 10,
          totalViews: newViews,
          totalPosts: newPosts,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, product.id));
    }

    // Fire any alerts whose threshold is now crossed
    await triggerAlerts();

    logger.info({ products: products.length, timeMult: tm }, "Score engine tick complete");
  } catch (err) {
    logger.error({ err }, "Score engine tick failed");
  }
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function startScoreEngine(intervalMs: number = 60_000): void {
  if (tickInterval) return;

  logger.info({ intervalMs }, "Starting score engine");

  runScoreTick().catch((err) => logger.error({ err }, "Initial score tick failed"));

  tickInterval = setInterval(() => {
    runScoreTick().catch((err) => logger.error({ err }, "Score tick failed"));
  }, intervalMs);
}

export function stopScoreEngine(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}
