import { Router } from "express";
import { runIngestion, type DataSource } from "../lib/ingestionEngine";
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

  const validSources: DataSource[] = ["apify", "brightdata", "both"];
  const requestedSource = req.body?.source as string | undefined;
  const source: DataSource = validSources.includes(requestedSource as DataSource)
    ? (requestedSource as DataSource)
    : "apify";

  ingestionRunning = true;
  // Store source in lastResult so UI can display which source is running
  lastResult = { source } as Record<string, unknown>;
  res.json({ message: `Ingestion started via ${source}. Poll /api/ingestion/status for completion.` });

  try {
    const result = await runIngestion(source);
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
