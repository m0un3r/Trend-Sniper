import { Router } from "express";
import { db, postsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ListPostsQueryParams, GetPostParams } from "@workspace/api-zod";

const router = Router();

router.get("/posts", async (req, res): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: "Invalid query params" });
    return;
  }

  const { platform, productId, limit, offset } = query.data;

  const conditions = [];
  if (platform && platform !== "all") {
    conditions.push(eq(postsTable.platform, platform));
  }
  if (productId != null) {
    conditions.push(eq(postsTable.productId, productId));
  }

  const posts = await db
    .select()
    .from(postsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(postsTable.trendScore))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: db.$count(postsTable) })
    .from(postsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ posts, total: Number(count) });
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid params" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.json(post);
});

export default router;
