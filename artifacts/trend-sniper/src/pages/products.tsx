import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Eye, FileText, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import { useListProducts } from "@workspace/api-client-react";

function TrendScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-400/10"
      : score >= 60
        ? "text-amber-400 bg-amber-400/10"
        : "text-red-400 bg-red-400/10";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums ${color}`}>
      <TrendingUp className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
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
    {
      platform: platform === "all" ? undefined : platform,
      category: category === "all" ? undefined : category,
      limit: 50,
    },
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
              <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-platform">
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
              <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-category">
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
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No products found for these filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} data-testid={`product-card-${product.id}`}>
              <Card className="bg-card border-card-border hover:border-primary/40 transition-colors cursor-pointer group h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{product.category}</p>
                    </div>
                    <TrendScoreBadge score={product.trendScore} />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <PlatformBadge platform={product.platform} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Velocity</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {product.velocity.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Engagement</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {product.engagementRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Posts</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {product.totalPosts >= 1000
                          ? `${(product.totalPosts / 1000).toFixed(1)}K`
                          : product.totalPosts}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>
                        {product.totalViews >= 1_000_000
                          ? `${(product.totalViews / 1_000_000).toFixed(0)}M`
                          : `${(product.totalViews / 1000).toFixed(0)}K`}{" "}
                        views
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      Details <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
