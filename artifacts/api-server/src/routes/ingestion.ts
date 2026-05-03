import { Router } from "express";
import { runIngestion } from "../lib/ingestionEngine";
import { logger } from "../lib/logger";

const router = Router();

let ingestionRunning = false;
let lastResult: Record<string, unknown> | null = null;
let lastRanAt: string | null = null;

router.get("/ingestion/status", (_req, res): void => {
  res.json({ running: ingestionRunning, lastResult, lastRanAt });
});

router.post("/ingestion/run", async (req, res): Promise<void> => {
  if (ingestionRunning) {
    res.status(409).json({ message: "Ingestion already running" });
    return;
  }

  ingestionRunning = true;
  res.json({ message: "Ingestion started — this takes 2–5 minutes while Apify actors run. Poll /api/ingestion/status for completion." });

  try {
    const result = await runIngestion();
    lastResult = result as unknown as Record<string, unknown>;
    lastRanAt = new Date().toISOString();
    logger.info(result, "Ingestion route: completed");
  } catch (err) {
    lastResult = { error: String(err) };
    logger.error({ err }, "Ingestion route: failed");
  } finally {
    ingestionRunning = false;
  }
});

export default router;
