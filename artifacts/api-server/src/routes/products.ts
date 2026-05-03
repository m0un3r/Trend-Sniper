import { Router } from "express";
import { db, productsTable, postsTable } from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: "Invalid query params" });
    return;
  }

  const { platform, category, limit, offset } = query.data;

  const conditions = [];
  if (platform && platform !== "all") {
    conditions.push(eq(productsTable.platform, platform));
  }
  if (category && category !== "all") {
    conditions.push(eq(productsTable.category, category));
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.trendScore))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: db.$count(productsTable) })
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ products, total: Number(count) });
});

router.post("/products", async (req, res): Promise<void> => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      ...body.data,
      detectedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  res.status(201).json(product);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid params" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const recentPosts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.productId, params.data.id))
    .orderBy(desc(postsTable.trendScore))
    .limit(10);

  // Generate synthetic trend history from the last 14 days
  const trendHistory = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const factor = 0.5 + (i / 13) * 0.6 + (Math.random() * 0.2 - 0.1);
    return {
      date: date.toISOString().split("T")[0],
      score: Math.round(product.trendScore * factor * 100) / 100,
      views: Math.round((product.totalViews / 14) * factor * (0.8 + Math.random() * 0.4)),
    };
  });

  res.json({ ...product, recentPosts, trendHistory });
});

export default router;
