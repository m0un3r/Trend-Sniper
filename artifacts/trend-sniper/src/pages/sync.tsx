import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Database, Zap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface IngestionStatus {
  running: boolean;
  lastRanAt: string | null;
  lastResult: {
    platforms?: {
      tiktok: number;
      instagram: number;
      facebook: number;
      amazon: number;
      shopify: number;
    };
    productsUpserted?: number;
    postsInserted?: number;
    demoDataCleared?: boolean;
    error?: string;
  } | null;
}

const PLATFORM_META = [
  { key: "tiktok",    label: "TikTok",    color: "#ff0050", type: "Social" },
  { key: "instagram", label: "Instagram", color: "#a855f7", type: "Social" },
  { key: "facebook",  label: "Facebook",  color: "#3b82f6", type: "Social" },
  { key: "amazon",    label: "Amazon",    color: "#ff9900", type: "E-commerce" },
  { key: "shopify",   label: "Shopify",   color: "#95bf47", type: "E-commerce" },
] as const;

function PlatformRow({
  label, color, count, type,
}: { label: string; color: string; count: number; type: string }) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold text-white">{label}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
          style={{ color, background: `${color}18` }}
        >
          {type}
        </span>
      </div>
      <span className="text-sm font-black tabular-nums" style={{ color }}>
        {count} items
      </span>
    </div>
  );
}

export default function Sync() {
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  async function fetchStatus() {
    try {
      const r = await fetch(`${API_BASE}/api/ingestion/status`);
      if (r.ok) setStatus(await r.json());
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function startIngestion() {
    setIsStarting(true);
    try {
      const r = await fetch(`${API_BASE}/api/ingestion/run`, { method: "POST" });
      if (r.status === 409) {
        toast({ title: "Ingestion already running", description: "Please wait for it to complete." });
      } else if (r.ok) {
        toast({
          title: "Sync started",
          description: "Fetching real data from TikTok, Instagram, Facebook, Amazon & Shopify. Takes 3–7 minutes.",
        });
        await fetchStatus();
      } else {
        toast({ title: "Failed to start sync", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  }

  const running = status?.running ?? false;
  const hasResult = status?.lastResult != null;
  const hasError = status?.lastResult?.error != null;
  const platforms = status?.lastResult?.platforms;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Data Sync"
        description="Ingest real data from social media and e-commerce platforms via Apify"
      />

      {/* Main control card */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Apify Integration · 5 Platforms
            </p>
            <p className="text-lg font-black text-white">Multi-Platform Ingestion</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Pulls viral posts from TikTok, Instagram, Facebook plus trending products from Amazon bestsellers and Shopify stores — all in one sync.
            </p>
          </div>
          {running ? (
            <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : hasError ? (
            <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(255,0,80,0.12)" }}>
              <XCircle className="w-6 h-6 text-[#ff0050]" />
            </div>
          ) : hasResult ? (
            <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          ) : (
            <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
          )}
        </div>

        {/* Running state */}
        {running && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-400">Sync in progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                5 Apify actors running in parallel — TikTok, Instagram, Facebook, Amazon, Shopify. Takes 3–7 minutes.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {hasError && !running && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,0,80,0.06)", border: "1px solid rgba(255,0,80,0.2)" }}
          >
            <p className="text-sm font-bold text-[#ff0050]">Last sync failed</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
              {status?.lastResult?.error}
            </p>
          </div>
        )}

        {/* Success state */}
        {hasResult && !hasError && !running && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <p className="text-sm font-bold text-emerald-400 mb-4">Last sync successful</p>

            {/* Per-platform breakdown */}
            {platforms && (
              <div className="mb-4">
                {PLATFORM_META.map(({ key, label, color, type }) => (
                  <PlatformRow
                    key={key}
                    label={label}
                    color={color}
                    type={type}
                    count={platforms[key] ?? 0}
                  />
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-2xl font-black tabular-nums text-white">
                  {status?.lastResult?.productsUpserted ?? 0}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Products detected
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-2xl font-black tabular-nums text-white">
                  {status?.lastResult?.postsInserted ?? 0}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Posts / listings indexed
                </p>
              </div>
            </div>

            {status?.lastRanAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Completed {new Date(status.lastRanAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={startIngestion}
          disabled={running || isStarting}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: running || isStarting
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #ff0050 0%, #a855f7 50%, #ff9900 100%)",
          }}
        >
          {running || isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {running ? "Sync running…" : "Starting…"}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {hasResult ? "Re-sync All Platforms" : "Sync Real Data from All Platforms"}
            </>
          )}
        </button>
      </div>

      {/* What gets scraped */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Data sources
        </p>

        <div className="space-y-4">
          {/* Social */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">Social Media</p>
            <div className="space-y-2">
              {[
                { color: "#ff0050", label: "TikTok", desc: "#tiktokmademebuyit · #viralproduct · #amazonfinds · #skincare · #gadgets" },
                { color: "#a855f7", label: "Instagram", desc: "#instashop · #beautytips · #techgadgets · #outfitoftheday" },
                { color: "#3b82f6", label: "Facebook", desc: "viral product 2025 · trending gadget · fashion must have" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: color }} />
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E-commerce */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">E-commerce</p>
            <div className="space-y-2">
              {[
                {
                  color: "#ff9900", label: "Amazon",
                  desc: "Best Sellers in Beauty, Electronics, Fashion, Sports & Outdoors, Home & Kitchen",
                },
                {
                  color: "#95bf47", label: "Shopify",
                  desc: "Gymshark, SKIMS, Fashion Nova, Ruggable — trending product collections",
                },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: color }} />
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">What happens during sync</p>
        <div className="space-y-3">
          {[
            { icon: Database, color: "#ff0050", text: "All existing data is cleared from the database" },
            { icon: RefreshCw, color: "#a855f7", text: "5 Apify actors run in parallel — 3 social + 2 e-commerce" },
            { icon: Zap, color: "#ff9900", text: "Amazon bestsellers and Shopify trending products are pulled directly as product listings" },
            { icon: TrendingUp, color: "#10b981", text: "Trend scores are computed from real engagement, review counts, and sales signals" },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div
          className="rounded-lg p-3 mt-2"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-white">Cost estimate:</span> A full 5-platform sync uses ~1.5–2 Apify CUs. You can re-sync anytime to refresh with the latest data.
          </p>
        </div>
      </div>
    </div>
  );
}
