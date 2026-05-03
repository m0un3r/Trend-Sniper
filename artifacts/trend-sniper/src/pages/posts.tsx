import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge } from "@/components/platform-badge";
import { PageHeader } from "@/components/page-header";
import { useListPosts } from "@workspace/api-client-react";

const PLATFORMS = ["all", "tiktok", "instagram", "facebook"] as const;
type Platform = (typeof PLATFORMS)[number];

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

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function Posts() {
  const [platform, setPlatform] = useState<Platform>("all");

  const { data, isLoading } = useListPosts(
    {
      platform: platform === "all" ? undefined : platform,
      limit: 30,
    },
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
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-platform">
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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No posts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="bg-card border-card-border hover:border-primary/30 transition-colors"
              data-testid={`post-row-${post.id}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <PlatformBadge platform={post.platform} />
                      <TrendScoreBadge score={post.trendScore} />
                      {post.productId && (
                        <Link
                          href={`/products/${post.productId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View product
                        </Link>
                      )}
                    </div>
                    {post.caption && (
                      <p className="text-sm text-foreground line-clamp-2">{post.caption}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{post.creatorUsername}</span>
                      <span>·</span>
                      <span>{formatNum(post.creatorFollowers)} followers</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1.5 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span className="tabular-nums">{formatNum(post.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span className="tabular-nums">{formatNum(post.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span className="tabular-nums">{formatNum(post.comments)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      <span className="tabular-nums">{formatNum(post.shares)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
