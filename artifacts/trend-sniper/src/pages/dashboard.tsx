import { useState, useEffect } from "react";
import { Link } from "wouter";
import { TrendingUp, Package, Activity, BarChart2, Zap, ArrowUpRight, Flame, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformBadge, platformColor } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import {
  useGetDashboardSummary,
  useGetTopProducts,
  useGetPlatformBreakdown,
  useListPosts,
  useGetLiveTrends,
} from "@workspace/api-client-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const REFETCH_INTERVAL_MS = 30_000;

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function TrendScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ff0050";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tabular-nums"
      style={{ color, background: `${color}18` }}
    >
      <TrendingUp className="w-3 h-3" />
      {s.toFixed(1)}
    </span>
  );
}

function VelocityBar({ velocity, color }: { velocity: number; color?: string }) {
  const pct = Math.min(100, velocity);
  const barColor = color ?? (pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#475569");
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
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
      setAgo(diff < 60 ? `${diff}s ago` : `${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-emerald-400 font-bold tracking-wide">LIVE</span>
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
  accent = "#6366f1",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex items-start justify-between"
      style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-20 mt-1" />
        ) : (
          <p className="text-4xl font-black tabular-nums text-white">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
      <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${accent}20` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const opts = { refetchInterval: REFETCH_INTERVAL_MS };
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary(undefined, opts);
  const { data: topProducts, isLoading: productsLoading } = useGetTopProducts({ limit: 8 }, opts);
  const { data: platformBreakdown, isLoading: platformLoading } = useGetPlatformBreakdown(undefined, opts);
  const { data: posts, isLoading: postsLoading } = useListPosts({ limit: 6 }, opts);
  const { data: live } = useGetLiveTrends(opts);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">TrendSniper</p>
          <h1 className="text-3xl font-black tracking-tight text-white">Trend Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time intelligence across TikTok, Instagram, and Facebook</p>
        </div>
        <LiveBadge lastUpdatedAt={live?.lastUpdatedAt} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Products Tracked" value={summary?.totalProductsTracked ?? 0} icon={Package} loading={summaryLoading} accent="#ff0050" />
        <StatCard label="Trending Now" value={summary?.trendingNow ?? 0} icon={Zap} sub="Score above 70" loading={summaryLoading} accent="#a855f7" />
        <StatCard
          label="Posts Analyzed"
          value={summary ? fmt(summary.totalPostsAnalyzed) : 0}
          icon={Activity}
          loading={summaryLoading}
          accent="#3b82f6"
        />
        <StatCard
          label="Avg Trend Score"
          value={summary ? `${summary.avgTrendScore ?? 0}` : "0"}
          icon={BarChart2}
          sub={`Top: ${summary?.topPlatform ?? "—"}`}
          loading={summaryLoading}
          accent="#f59e0b"
        />
      </div>

      {/* Top Movers */}
      {live && live.topMovers.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "linear-gradient(135deg, rgba(255,0,80,0.05) 0%, hsl(var(--card)) 60%)", borderColor: "rgba(255,0,80,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#ff0050]" />
            <span className="text-[10px] font-bold text-[#ff0050] uppercase tracking-widest">Velocity Spikes · Top Movers</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {live.topMovers.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all hover:border-white/20"
                style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))" }}
              >
                <PlatformBadge platform={p.platform} />
                <span className="text-sm font-semibold text-white max-w-[110px] truncate">{p.name}</span>
                <VelocityBar velocity={p.velocity} color={platformColor(p.platform)} />
                <TrendScoreBadge score={p.trendScore} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border overflow-hidden" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top Trending Products</span>
              <Link href="/products" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {productsLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div>
                {(topProducts?.products ?? []).map((product, idx) => {
                  const pColor = platformColor(product.platform);
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors border-b last:border-0"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <span className="text-xs font-black tabular-nums w-5 shrink-0" style={{ color: pColor }}>
                        {idx + 1}
                      </span>
                      <div
                        className="w-0.5 h-8 rounded-full shrink-0"
                        style={{ background: pColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <PlatformBadge platform={product.platform} />
                          <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                        <VelocityBar velocity={product.velocity} color={pColor} />
                        <span className="hidden sm:block tabular-nums">{product.totalPosts.toLocaleString()} posts</span>
                        <TrendScoreBadge score={product.trendScore} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="rounded-xl border flex flex-col" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Platform Breakdown</span>
          </div>
          <div className="p-5 flex-1">
            {platformLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-5">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={platformBreakdown?.platforms ?? []} barCategoryGap="30%">
                    <XAxis
                      dataKey="platform"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1, 2)}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#0d0f17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }}
                      formatter={(val: number) => [val, "Products"]}
                    />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {(platformBreakdown?.platforms ?? []).map((p) => (
                        <rect key={p.platform} fill={platformColor(p.platform)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {(platformBreakdown?.platforms ?? []).map((p) => (
                    <div key={p.platform} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: platformColor(p.platform) }} />
                          <span className="font-semibold text-white capitalize">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{p.count} products</span>
                          <span className="font-bold tabular-nums text-white">{p.avgScore}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(p.count / 12) * 100}%`,
                            background: platformColor(p.platform),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Viral Posts */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Viral Posts</span>
          <Link href="/posts" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {postsLoading ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {(posts?.posts ?? []).map((post, i) => {
              const pColor = platformColor(post.platform);
              return (
                <div
                  key={post.id}
                  className="p-5 border-r border-b last:border-r-0 space-y-2.5"
                  style={{
                    borderColor: "hsl(var(--border))",
                    borderLeft: `3px solid ${pColor}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <PlatformBadge platform={post.platform} />
                    <TrendScoreBadge score={post.trendScore} />
                  </div>
                  {post.caption && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{post.creatorUsername}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{(post.views / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
