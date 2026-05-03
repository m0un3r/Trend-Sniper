import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge, platformColor } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import { useListPosts } from "@workspace/api-client-react";

const PLATFORMS = ["all", "tiktok", "instagram", "facebook", "amazon", "shopify"] as const;
type Platform = (typeof PLATFORMS)[number];

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

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function Posts() {
  const [platform, setPlatform] = useState<Platform>("all");

  const { data, isLoading } = useListPosts(
    { platform: platform === "all" ? undefined : platform, limit: 30 },
    { query: { queryKey: ["posts", platform] } }
  );

  const posts = data?.posts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viral Posts"
        description={`${data?.total ?? 0} posts analyzed`}
        action={
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="w-36 h-8 text-xs border-border bg-muted">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No posts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const pColor = platformColor(post.platform);
            return (
              <div
                key={post.id}
                className="rounded-xl border overflow-hidden hover:border-white/15 transition-all"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--card-border))",
                  borderLeft: `3px solid ${pColor}`,
                }}
                data-testid={`post-row-${post.id}`}
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <PlatformBadge platform={post.platform} />
                        <TrendScoreBadge score={post.trendScore} />
                        {post.productId && (
                          <Link href={`/products/${post.productId}`} className="text-xs font-medium hover:underline" style={{ color: pColor }}>
                            View product →
                          </Link>
                        )}
                      </div>
                      {post.caption && (
                        <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">{post.caption}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-bold text-white">{post.creatorUsername}</span>
                        <span>·</span>
                        <span>{fmt(post.creatorFollowers)} followers</span>
                      </div>
                    </div>

                    {/* Metrics column */}
                    <div className="flex sm:flex-col gap-4 sm:gap-2 text-xs shrink-0">
                      {[
                        { icon: Eye, value: fmt(post.views) },
                        { icon: Heart, value: fmt(post.likes) },
                        { icon: MessageCircle, value: fmt(post.comments) },
                        { icon: Share2, value: fmt(post.shares) },
                      ].map(({ icon: Icon, value }) => (
                        <div key={value} className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="tabular-nums font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
