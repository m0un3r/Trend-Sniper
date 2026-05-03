import { Router } from "express";
import { db, alertsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAlertBody, DeleteAlertParams } from "@workspace/api-zod";

const router = Router();

router.get("/alerts", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: alertsTable.id,
      productId: alertsTable.productId,
      threshold: alertsTable.threshold,
      triggered: alertsTable.triggered,
      createdAt: alertsTable.createdAt,
      productName: productsTable.name,
    })
    .from(alertsTable)
    .leftJoin(productsTable, eq(alertsTable.productId, productsTable.id))
    .orderBy(alertsTable.createdAt);

  res.json({
    alerts: rows.map((r) => ({ ...r, productName: r.productName ?? "Unknown" })),
  });
});

router.post("/alerts", async (req, res): Promise<void> => {
  const body = CreateAlertBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, body.data.productId));

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const triggered = product.trendScore >= body.data.threshold;

  const [alert] = await db
    .insert(alertsTable)
    .values({ ...body.data, triggered })
    .returning();

  res.status(201).json({ ...alert, productName: product.name });
});

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const params = DeleteAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid params" });
    return;
  }

  await db.delete(alertsTable).where(eq(alertsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
