import { useState, useEffect } from "react";
import { Link } from "wouter";
import { TrendingUp, Package, Activity, BarChart2, Zap, ArrowUpRight, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformBadge } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import {
  useGetDashboardSummary,
  useGetTopProducts,
  useGetPlatformBreakdown,
  useListPosts,
  useGetLiveTrends,
} from "@workspace/api-client-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const REFETCH_INTERVAL_MS = 30_000;

function TrendScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-400/10"
      : score >= 60
        ? "text-amber-400 bg-amber-400/10"
        : "text-red-400 bg-red-400/10";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums ${color}`}
      data-testid="trend-score"
    >
      <TrendingUp className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  );
}

function VelocityBar({ velocity }: { velocity: number }) {
  const pct = Math.min(100, velocity);
  const color =
    pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">
        {Math.round(pct)}
      </span>
    </div>
  );
}

function LiveBadge({ lastUpdatedAt }: { lastUpdatedAt?: string | null }) {
  const [ago, setAgo] = useState<string>("—");

  useEffect(() => {
    if (!lastUpdatedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / 1000);
      if (diff < 60) setAgo(`${diff}s ago`);
      else setAgo(`${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-emerald-400 font-semibold">LIVE</span>
      {lastUpdatedAt && (
        <span className="text-muted-foreground">· updated {ago}</span>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card border-card-border" data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const queryOpts = { refetchInterval: REFETCH_INTERVAL_MS };

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary(undefined, queryOpts);
  const { data: topProducts, isLoading: productsLoading } = useGetTopProducts({ limit: 8 }, queryOpts);
  const { data: platformBreakdown, isLoading: platformLoading } = useGetPlatformBreakdown(undefined, queryOpts);
  const { data: posts, isLoading: postsLoading } = useListPosts({ limit: 6 }, queryOpts);
  const { data: live } = useGetLiveTrends(queryOpts);

  const platformColors: Record<string, string> = {
    tiktok: "#ff0050",
    instagram: "#a855f7",
    facebook: "#3b82f6",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trend Dashboard"
        description="Real-time intelligence across TikTok, Instagram, and Facebook"
      />

      {/* Live status bar */}
      <div className="flex items-center justify-between px-1">
        <LiveBadge lastUpdatedAt={live?.lastUpdatedAt} />
        <span className="text-xs text-muted-foreground">
          Scores refresh every 30s
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Products Tracked"
          value={summary?.totalProductsTracked ?? 0}
          icon={Package}
          loading={summaryLoading}
        />
        <StatCard
          label="Trending Now"
          value={summary?.trendingNow ?? 0}
          icon={Zap}
          sub="Score above 70"
          loading={summaryLoading}
        />
        <StatCard
          label="Posts Analyzed"
          value={
            summary
              ? summary.totalPostsAnalyzed >= 1000
                ? `${(summary.totalPostsAnalyzed / 1000).toFixed(1)}K`
                : summary.totalPostsAnalyzed
              : 0
          }
          icon={Activity}
          loading={summaryLoading}
        />
        <StatCard
          label="Avg Trend Score"
          value={summary ? `${summary.avgTrendScore}` : "0"}
          icon={BarChart2}
          sub={`Top: ${summary?.topPlatform ?? "—"}`}
          loading={summaryLoading}
        />
      </div>

      {/* Top Movers banner */}
      {live && live.topMovers.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-950/60 to-card border-emerald-800/40">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 text-emerald-400">
              <Flame className="w-3.5 h-3.5" />
              Velocity Spikes · Top Movers
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-3">
              {live.topMovers.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="flex items-center gap-3 bg-card/60 border border-emerald-800/30 rounded-lg px-3 py-2 hover:bg-card/90 transition-colors"
                >
                  <PlatformBadge platform={p.platform} />
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{p.name}</span>
                  <VelocityBar velocity={p.velocity} />
                  <TrendScoreBadge score={p.trendScore} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Top Trending Products
                </CardTitle>
                <Link href="/products" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {(topProducts?.products ?? []).map((product, idx) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                      data-testid={`product-row-${product.id}`}
                    >
                      <span className="text-xs font-bold text-muted-foreground w-5 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <PlatformBadge platform={product.platform} />
                          <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <VelocityBar velocity={product.velocity} />
                        <span className="hidden sm:block tabular-nums">
                          {product.totalPosts.toLocaleString()} posts
                        </span>
                        <TrendScoreBadge score={product.trendScore} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Platform Breakdown */}
        <div>
          <Card className="bg-card border-card-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Platform Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={platformBreakdown?.platforms ?? []}>
                      <XAxis
                        dataKey="platform"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                        formatter={(val: number) => [val, "Products"]}
                      />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        fill="hsl(var(--primary))"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {(platformBreakdown?.platforms ?? []).map((p) => (
                      <div key={p.platform} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: platformColors[p.platform] ?? "hsl(var(--primary))",
                            }}
                          />
                          <span className="capitalize text-foreground">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{p.count} products</span>
                          <span className="font-semibold text-foreground tabular-nums">{p.avgScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Viral Posts */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Recent Viral Posts
            </CardTitle>
            <Link href="/posts" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {postsLoading ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {(posts?.posts ?? []).map((post) => (
                <div
                  key={post.id}
                  className="p-4 space-y-2"
                  data-testid={`post-card-${post.id}`}
                >
                  <div className="flex items-center justify-between">
                    <PlatformBadge platform={post.platform} />
                    <TrendScoreBadge score={post.trendScore} />
                  </div>
                  {post.caption && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{post.creatorUsername}</span>
                    <span>{(post.views / 1_000_000).toFixed(1)}M views</span>
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
