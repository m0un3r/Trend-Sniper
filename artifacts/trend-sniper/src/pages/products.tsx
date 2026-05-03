import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Eye, ArrowUpRight, Star, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge, platformColor } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import { useListProducts } from "@workspace/api-client-react";

function TrendScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ff0050";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums shrink-0"
      style={{ color, background: `${color}18` }}
    >
      <TrendingUp className="w-3 h-3" />
      {s.toFixed(1)}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            fill: i < full ? "#ff9900" : i === full && hasHalf ? "#ff990080" : "transparent",
            color: i < full || (i === full && hasHalf) ? "#ff9900" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
      <span className="text-[10px] font-bold tabular-nums ml-1" style={{ color: "#ff9900" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PriceTag({ price, platform, affiliateUrl }: { price: number; platform: string; affiliateUrl?: string | null }) {
  const color = platform === "amazon" ? "#ff9900" : "#95bf47";
  const tag = (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black tabular-nums"
      style={{ color, background: `${color}18` }}
    >
      <ShoppingCart className="w-3 h-3" />
      ${price.toFixed(2)}
    </span>
  );
  if (affiliateUrl) {
    return (
      <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {tag}
      </a>
    );
  }
  return tag;
}

function VelocityBar({ velocity, color }: { velocity: number; color: string }) {
  const pct = Math.min(100, velocity);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">{Math.round(pct)}</span>
    </div>
  );
}

const PLATFORMS = ["all", "tiktok", "instagram", "facebook", "amazon", "shopify"] as const;
const CATEGORIES = ["all", "beauty", "tech", "fashion", "fitness", "home", "food"] as const;
type Platform = (typeof PLATFORMS)[number];
type Category = (typeof CATEGORIES)[number];

export default function Products() {
  const [platform, setPlatform] = useState<Platform>("all");
  const [category, setCategory] = useState<Category>("all");

  const { data, isLoading } = useListProducts(
    { platform: platform === "all" ? undefined : platform, category: category === "all" ? undefined : category, limit: 50 },
    { query: { queryKey: ["products", platform, category] } }
  );

  const products = data?.products ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${data?.total ?? 0} trending products detected`}
        action={
          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger className="w-36 h-8 text-xs border-border bg-muted">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">
                    {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="w-36 h-8 text-xs border-border bg-muted">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">
                    {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No products found for these filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const pColor = platformColor(product.platform);
            const isEcom = product.platform === "amazon" || product.platform === "shopify";
            return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div
                  className="rounded-xl border overflow-hidden cursor-pointer hover:border-white/20 transition-all group h-full flex flex-col"
                  style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
                >
                  {/* Platform color bar */}
                  <div className="h-1 w-full" style={{ background: pColor }} />

                  <div className="p-5 flex flex-col gap-3.5 flex-1">
                    {/* Name + score */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate group-hover:text-white/90 transition-colors text-base">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{product.category}</p>
                      </div>
                      <TrendScoreBadge score={product.trendScore} />
                    </div>

                    {/* Platform badge + e-commerce signals */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlatformBadge platform={product.platform} />
                      {isEcom && product.price != null && (
                        <PriceTag price={product.price} platform={product.platform} affiliateUrl={product.affiliateUrl} />
                      )}
                    </div>

                    {/* Star rating — amazon/shopify only */}
                    {isEcom && product.rating != null && (
                      <StarRating rating={product.rating} />
                    )}

                    {/* Velocity bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>VELOCITY</span>
                        <span className="tabular-nums">{(product.velocity ?? 0).toFixed(1)}</span>
                      </div>
                      <VelocityBar velocity={product.velocity ?? 0} color={pColor} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {isEcom ? "Reviews" : "Engage"}
                        </p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {isEcom
                            ? product.totalViews >= 1000
                              ? `${(product.totalViews / 1000).toFixed(0)}K`
                              : product.totalViews
                            : `${(product.engagementRate ?? 0).toFixed(1)}%`}
                        </p>
                      </div>
                      <div className="text-center border-x" style={{ borderColor: "hsl(var(--border))" }}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {isEcom ? "Listings" : "Posts"}
                        </p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {product.totalPosts >= 1000 ? `${(product.totalPosts / 1000).toFixed(1)}K` : product.totalPosts}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {product.totalViews >= 1_000_000
                            ? `${(product.totalViews / 1_000_000).toFixed(0)}M`
                            : `${(product.totalViews / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-auto flex items-center justify-end text-xs font-semibold gap-1 pt-1"
                      style={{ color: pColor }}
                    >
                      Details <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
