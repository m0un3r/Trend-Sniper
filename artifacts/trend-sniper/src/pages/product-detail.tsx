import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingUp, Eye, FileText, Zap, ExternalLink, Heart, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlatformBadge, platformColor } from "@/components/platform-badge";
import { useGetProduct } from "@workspace/api-client-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";

function fmt(n: number) {
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

  const pColor = product ? platformColor(product.platform) : "#6366f1";
  const scoreColor = (product?.trendScore ?? 0) >= 80 ? "#10b981" : (product?.trendScore ?? 0) >= 60 ? "#f59e0b" : "#ff0050";

  if (!isLoading && !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <p className="text-lg font-bold text-white">Product not found</p>
        <Link href="/products" className="text-sm text-primary hover:underline mt-2">← Back to products</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Products
      </Link>

      {/* Hero header */}
      <div
        className="rounded-2xl border p-7"
        style={{
          background: `linear-gradient(135deg, ${pColor}12 0%, hsl(var(--card)) 60%)`,
          borderColor: `${pColor}30`,
          borderLeft: `4px solid ${pColor}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-40" />
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pColor }}>
                  {product?.platform} · {product?.category}
                </p>
                <h1 className="text-3xl font-black text-white tracking-tight">{product?.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <PlatformBadge platform={product?.platform ?? ""} />
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black tabular-nums"
                    style={{ color: scoreColor, background: `${scoreColor}18` }}
                  >
                    <TrendingUp className="w-4 h-4" />
                    {product?.trendScore.toFixed(1)} trend score
                  </span>
                </div>
              </>
            )}
          </div>
          {product?.affiliateUrl && (
            <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
                View Product
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          [
            { label: "Velocity", value: product?.velocity.toFixed(1) ?? "—", icon: Zap, color: pColor },
            { label: "Engagement", value: `${product?.engagementRate.toFixed(1)}%`, icon: TrendingUp, color: "#10b981" },
            { label: "Total Posts", value: fmt(product?.totalPosts ?? 0), icon: FileText, color: "#a855f7" },
            { label: "Total Views", value: fmt(product?.totalViews ?? 0), icon: Eye, color: "#3b82f6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border p-5"
              style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-3xl font-black tabular-nums text-white">{value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trend history chart */}
      <div
        className="rounded-xl border p-6"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-5">14-Day Trend History</p>
        {isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={product?.trendHistory ?? []}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={scoreColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={scoreColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
                interval={2}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ background: "#0d0f17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2} fill="url(#trendGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Related posts */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Related Viral Posts</p>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (product?.recentPosts ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground p-6">No posts found for this product</p>
        ) : (
          <div>
            {(product?.recentPosts ?? []).map((post, i) => (
              <div
                key={post.id}
                className="px-6 py-4 flex items-start gap-4 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: "hsl(var(--border))", borderLeft: `3px solid ${platformColor(post.platform)}` }}
                data-testid={`related-post-${post.id}`}
              >
                <PlatformBadge platform={post.platform} />
                <div className="flex-1 min-w-0">
                  {post.caption && (
                    <p className="text-xs text-white/80 line-clamp-1 mb-1">{post.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-white">{post.creatorUsername}</span>
                    {" · "}
                    {fmt(post.creatorFollowers)} followers
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(post.views)}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(post.likes)}</span>
                  <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmt(post.shares)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
