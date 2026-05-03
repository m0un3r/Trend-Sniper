import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  platform: text("platform").notNull(),
  trendScore: real("trend_score").notNull().default(0),
  velocity: real("velocity").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  totalPosts: integer("total_posts").notNull().default(0),
  totalViews: integer("total_views").notNull().default(0),
  imageUrl: text("image_url"),
  affiliateUrl: text("affiliate_url"),
  price: real("price"),
  rating: real("rating"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
