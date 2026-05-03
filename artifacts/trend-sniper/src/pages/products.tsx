import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Eye, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge, platformColor } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import { useListProducts } from "@workspace/api-client-react";

function TrendScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ff0050";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums"
      style={{ color, background: `${color}18` }}
    >
      <TrendingUp className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  );
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

const PLATFORMS = ["all", "tiktok", "instagram", "facebook"] as const;
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
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
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
            return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div
                  className="rounded-xl border overflow-hidden cursor-pointer hover:border-white/20 transition-all group h-full flex flex-col"
                  style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
                >
                  {/* Platform color bar at top */}
                  <div className="h-1 w-full" style={{ background: pColor }} />
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate group-hover:text-white/90 transition-colors text-base">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{product.category}</p>
                      </div>
                      <TrendScoreBadge score={product.trendScore} />
                    </div>

                    <div>
                      <PlatformBadge platform={product.platform} />
                    </div>

                    {/* Velocity bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>VELOCITY</span>
                        <span className="tabular-nums">{product.velocity.toFixed(1)}</span>
                      </div>
                      <VelocityBar velocity={product.velocity} color={pColor} />
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Engage</p>
                        <p className="text-sm font-bold tabular-nums text-white">{product.engagementRate.toFixed(1)}%</p>
                      </div>
                      <div className="text-center border-x" style={{ borderColor: "hsl(var(--border))" }}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {product.totalPosts >= 1000 ? `${(product.totalPosts / 1000).toFixed(1)}K` : product.totalPosts}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {product.totalViews >= 1_000_000 ? `${(product.totalViews / 1_000_000).toFixed(0)}M` : `${(product.totalViews / 1000).toFixed(0)}K`}
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
