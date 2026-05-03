import app from "./app";
import { logger } from "./lib/logger";
import { startScoreEngine, stopScoreEngine } from "./lib/scoreEngine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start the score engine — ticks every 30s in dev, 60s in prod
  const tickMs = process.env.NODE_ENV === "production" ? 60_000 : 30_000;
  startScoreEngine(tickMs);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  stopScoreEngine();
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down");
  stopScoreEngine();
  server.close(() => process.exit(0));
});
