import { db, productsTable, postsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * TrendSniper Score Engine
 *
 * Recalculates trend scores every tick based on:
 *  - velocity:      how fast views are accumulating (simulated hourly growth)
 *  - engagement:    likes+comments+shares / views
 *  - frequency:     number of posts driving the product
 *  - momentum:      whether the product was already trending (score × 0.85 decay)
 *  - time pattern:  trends spike in evening hours (18:00–23:00)
 *
 * Formula: 0.4×velocity + 0.3×engagement + 0.2×frequency + 0.1×momentum
 */

function timeMultiplier(): number {
  const h = new Date().getHours();
  // Peak hours 18-23: 1.15x, off-peak (0-6): 0.85x, daytime: 1.0x
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

export async function runScoreTick(): Promise<void> {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.trendScore));

    if (products.length === 0) return;

    const tm = timeMultiplier();

    for (const product of products) {
      // Simulate new view + post accumulation this tick
      const baseViewDelta = Math.floor((product.totalViews / 1440) * jitter(1.0, 0.3)); // daily views / minutes
      const newViews = product.totalViews + baseViewDelta;

      // Occasionally a product gets a viral spike (5% chance)
      const hasSpike = Math.random() < 0.05;
      const spikeMultiplier = hasSpike ? jitter(3.5, 0.4) : 1.0;

      // New post count grows slowly
      const newPosts = product.totalPosts + (Math.random() < 0.1 ? 1 : 0);

      // Recalculate velocity (0-100): normalized rate of view accumulation
      const rawVelocity = clamp((baseViewDelta * spikeMultiplier * tm) / (product.totalViews / 1000), 0, 100);
      const newVelocity = clamp(jitter(rawVelocity, 0.1), 0, 100);

      // Engagement rate stays relatively stable with small drift
      const newEngagement = clamp(jitter(product.engagementRate, 0.05), 1, 25);

      // Frequency score (0-100) based on post count
      const frequencyScore = clamp(Math.log10(newPosts + 1) * 30, 0, 100);

      // Momentum from previous score (decays slightly over time)
      const momentum = product.trendScore * 0.92;

      // Final trend score
      const rawScore =
        0.4 * newVelocity +
        0.3 * (newEngagement * 5) + // engagement 0-25% → 0-125, normalized to 0-100
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

      // Check and trigger alerts that haven't been triggered yet
      // (done in a separate pass to avoid circular deps — skipped here for simplicity)
    }

    logger.info({ products: products.length, timeMult: tm }, "Score engine tick complete");
  } catch (err) {
    logger.error({ err }, "Score engine tick failed");
  }
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function startScoreEngine(intervalMs: number = 60_000): void {
  if (tickInterval) return;

  logger.info({ intervalMs }, "Starting score engine");

  // Run immediately on start
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
