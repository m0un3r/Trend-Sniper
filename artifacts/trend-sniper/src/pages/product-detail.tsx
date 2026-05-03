import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingUp, Eye, FileText, Zap, ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform-badge";
import { useGetProduct } from "@workspace/api-client-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: ["product", id] },
  });

  const trendColor =
    (product?.trendScore ?? 0) >= 80
      ? "#34d399"
      : (product?.trendScore ?? 0) >= 60
        ? "#fbbf24"
        : "#f87171";

  if (!isLoading && !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <p className="text-lg font-semibold text-foreground">Product not found</p>
        <Link href="/products" className="text-sm text-primary hover:underline mt-2">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Products
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{product?.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <PlatformBadge platform={product?.platform ?? ""} />
                <span className="text-xs text-muted-foreground capitalize">{product?.category}</span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold tabular-nums"
                  style={{ color: trendColor, background: `${trendColor}18` }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {product?.trendScore.toFixed(1)}
                </span>
              </div>
            </>
          )}
        </div>
        {product?.affiliateUrl && (
          <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
              View Product
            </Button>
          </a>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <MetricCard label="Velocity" value={product?.velocity.toFixed(0) ?? "—"} icon={Zap} />
            <MetricCard label="Engagement" value={`${product?.engagementRate.toFixed(1)}%` ?? "—"} icon={TrendingUp} />
            <MetricCard label="Total Posts" value={formatNum(product?.totalPosts ?? 0)} icon={FileText} />
            <MetricCard label="Total Views" value={formatNum(product?.totalViews ?? 0)} icon={Eye} />
          </>
        )}
      </div>

      {/* Trend History Chart */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            14-Day Trend History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={product?.trendHistory ?? []}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.slice(5)}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={trendColor}
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Related Posts */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Related Viral Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (product?.recentPosts ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground p-5">No posts found</p>
          ) : (
            <div className="divide-y divide-border">
              {(product?.recentPosts ?? []).map((post) => (
                <div key={post.id} className="px-5 py-3 flex items-start gap-4" data-testid={`related-post-${post.id}`}>
                  <PlatformBadge platform={post.platform} />
                  <div className="flex-1 min-w-0">
                    {post.caption && (
                      <p className="text-xs text-foreground line-clamp-1">{post.caption}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {post.creatorUsername} · {formatNum(post.creatorFollowers)} followers
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNum(post.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNum(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {formatNum(post.shares)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
