import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingUp, Eye, FileText, Zap, ExternalLink, Heart, Share2, Star, ShoppingCart, DollarSign } from "lucide-react";
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

function StarRatingLarge({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4"
          style={{
            fill: i < full ? "#ff9900" : i === full && hasHalf ? "#ff990060" : "transparent",
            color: i < full || (i === full && hasHalf) ? "#ff9900" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
      <span className="text-sm font-black tabular-nums ml-1" style={{ color: "#ff9900" }}>
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground ml-1">out of 5</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  const c = confidence ?? 0;
  const color = c >= 85 ? "#10b981" : c >= 70 ? "#f59e0b" : "#ff0050";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black tabular-nums"
      style={{ color, background: `${color}18` }}
    >
      {c}% source confidence
    </span>
  );
}

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: ["product", id] },
  });

  const pColor = product ? platformColor(product.platform) : "#6366f1";
  const scoreColor = (product?.trendScore ?? 0) >= 80 ? "#10b981" : (product?.trendScore ?? 0) >= 60 ? "#f59e0b" : "#ff0050";
  const isEcom = product?.platform === "amazon" || product?.platform === "shopify";

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
                    {(product?.trendScore ?? 0).toFixed(1)} trend score
                  </span>
                  <ConfidenceBadge confidence={(product as { confidence?: number })?.confidence ?? null} />
                  {/* Price badge — e-commerce only */}
                  {isEcom && product?.price != null && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black tabular-nums"
                      style={{ color: pColor, background: `${pColor}18` }}
                    >
                      <DollarSign className="w-4 h-4" />
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Star rating — e-commerce only */}
                {isEcom && product?.rating != null && (
                  <StarRatingLarge rating={product.rating} />
                )}
              </>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {product?.affiliateUrl && (
              <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs w-full"
                  style={{ background: pColor, color: "#fff" }}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {product.platform === "amazon" ? "Buy on Amazon" : "Buy on Shopify"}
                </Button>
              </a>
            )}
            {!product?.affiliateUrl && !isLoading && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border" disabled>
                <ExternalLink className="w-3.5 h-3.5" />
                View Product
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          [
            { label: "Velocity", value: (product?.velocity ?? 0).toFixed(1), icon: Zap, color: pColor },
            isEcom && product?.price != null
              ? { label: "Price", value: `$${product.price.toFixed(2)}`, icon: DollarSign, color: "#ff9900" }
              : { label: "Engagement", value: `${(product?.engagementRate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: "#10b981" },
            isEcom
              ? { label: "Reviews", value: fmt(product?.totalViews ?? 0), icon: Star, color: "#ff9900" }
              : { label: "Total Posts", value: fmt(product?.totalPosts ?? 0), icon: FileText, color: "#a855f7" },
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

      {/* Rating breakdown — e-commerce only */}
      {!isLoading && isEcom && product?.rating != null && (
        <div
          className="rounded-xl border p-6"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Customer Rating</p>
          <div className="flex items-center gap-8">
            {/* Big number */}
            <div className="text-center shrink-0">
              <p className="text-6xl font-black tabular-nums" style={{ color: "#ff9900" }}>
                {product.rating.toFixed(1)}
              </p>
              <StarRatingLarge rating={product.rating} />
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(product.totalViews)} reviews
              </p>
            </div>
            {/* Bar breakdown */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const r = product.rating ?? 0;
                const pct = star === Math.round(r)
                  ? 45 + (r % 1) * 20
                  : star > Math.round(r)
                    ? Math.max(2, (star - Math.round(r)) * 8)
                    : Math.max(2, (star) * 6);
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{star}</span>
                    <Star className="w-3 h-3 shrink-0" style={{ fill: "#ff9900", color: "#ff9900" }} />
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: "#ff9900" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8">{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {isEcom ? "Product Listings" : "Related Viral Posts"}
          </p>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (product?.recentPosts ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground p-6">No posts found for this product</p>
        ) : (
          <div>
            {(product?.recentPosts ?? []).map((post) => (
              <div
                key={post.id}
                className="px-6 py-4 flex items-start gap-4 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: "hsl(var(--border))", borderLeft: `3px solid ${platformColor(post.platform)}` }}
              >
                <PlatformBadge platform={post.platform} />
                <div className="flex-1 min-w-0">
                  {post.caption && (
                    <p className="text-xs text-white/80 line-clamp-1 mb-1">{post.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-white">{post.creatorUsername}</span>
                    {post.creatorFollowers > 0 && (
                      <>{" · "}{fmt(post.creatorFollowers)} followers</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(post.views)}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(post.likes)}</span>
                  {post.shares > 0 && (
                    <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmt(post.shares)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
