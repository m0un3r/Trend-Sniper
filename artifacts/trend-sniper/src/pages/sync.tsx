import { useState, useEffect, useRef } from "react";
import {
  RefreshCw, Database, Loader2, CheckCircle2, XCircle, Zap, TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]+$/, "");

const PLATFORM_META: Array<{ key: string; label: string; color: string; type: string }> = [
  { key: "tiktok",    label: "TikTok",    color: "#ff0050", type: "social" },
  { key: "instagram", label: "Instagram", color: "#a855f7", type: "social" },
  { key: "facebook",  label: "Facebook",  color: "#3b82f6", type: "social" },
  { key: "amazon",    label: "Amazon",    color: "#ff9900", type: "ecom" },
  { key: "shopify",   label: "Shopify",   color: "#95bf47", type: "ecom" },
];

interface IngestionStatus {
  running: boolean;
  lastRanAt: string | null;
  lastResult: {
    platforms?: Record<string, number>;
    productsUpserted?: number;
    postsInserted?: number;
    demoDataCleared?: boolean;
    error?: string;
    source?: string;
  } | null;
}

type DataSource = "apify" | "brightdata" | "both";

const SOURCE_META: Array<{ value: DataSource; label: string; desc: string; color: string }> = [
  {
    value: "apify",
    label: "Apify",
    desc: "Battle-tested actors for all 5 platforms (TikTok, Instagram, Facebook, Amazon, Shopify).",
    color: "#00b4ff",
  },
  {
    value: "brightdata",
    label: "Bright Data",
    desc: "Dataset API for TikTok, Instagram & Amazon — residential proxy network for higher success rates.",
    color: "#ff6b35",
  },
  {
    value: "both",
    label: "Both Sources",
    desc: "Run Apify + Bright Data in parallel and merge results for maximum coverage.",
    color: "#a855f7",
  },
];

function PlatformRow({
  label, color, type, count,
}: { label: string; color: string; type: string; count: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-sm font-bold text-white w-24">{label}</span>
      <span
        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ background: `${color}18`, color }}
      >
        {type === "social" ? "Social" : "E-com"}
      </span>
      <div className="flex-1 h-1.5 rounded-full mx-2" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, (count / 40) * 100)}%`, background: color }}
        />
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
  const [source, setSource] = useState<DataSource>("apify");
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
      const r = await fetch(`${API_BASE}/api/ingestion/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (r.status === 409) {
        toast({ title: "Ingestion already running", description: "Please wait for it to complete." });
      } else if (r.ok) {
        const srcLabel = SOURCE_META.find((s) => s.value === source)?.label ?? source;
        toast({
          title: "Sync started",
          description: `Fetching data via ${srcLabel}. Takes 3–7 minutes.`,
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
  const lastSource = status?.lastResult?.source;

  const selectedMeta = SOURCE_META.find((s) => s.value === source)!;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Data Sync"
        description="Ingest real trend data from social media and e-commerce platforms"
      />

      {/* Source selector */}
      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Data Source
        </p>
        <div className="grid grid-cols-3 gap-3">
          {SOURCE_META.map((s) => {
            const active = source === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSource(s.value)}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: active ? `${s.color}18` : "rgba(255,255,255,0.03)",
                  border: active ? `1.5px solid ${s.color}60` : "1.5px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-sm font-black" style={{ color: active ? s.color : "white" }}>
                  {s.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main control card */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: selectedMeta.color }}>
              {selectedMeta.label} · {source === "both" ? "5 Platforms" : source === "apify" ? "5 Platforms" : "3 Platforms"}
            </p>
            <p className="text-lg font-black text-white">Multi-Platform Ingestion</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {source === "apify" && "Pulls viral posts from TikTok, Instagram, Facebook plus trending products from Amazon and Shopify — all in one sync via Apify."}
              {source === "brightdata" && "Fetches TikTok, Instagram & Amazon data via Bright Data's residential proxy network and pre-built dataset collectors."}
              {source === "both" && "Runs Apify and Bright Data in parallel, merges results, and deduplicates — maximum coverage across all 5 platforms."}
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
                {status?.lastResult?.source === "brightdata"
                  ? "Bright Data datasets collecting — TikTok, Instagram & Amazon. Takes 3–7 minutes."
                  : status?.lastResult?.source === "both"
                  ? "Apify + Bright Data running in parallel. Takes 3–7 minutes."
                  : "5 Apify actors running in parallel — TikTok, Instagram, Facebook, Amazon, Shopify. Takes 3–7 minutes."}
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-emerald-400">Last sync successful</p>
              {lastSource && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: `${SOURCE_META.find((s) => s.value === lastSource)?.color ?? "#10b981"}20`,
                    color: SOURCE_META.find((s) => s.value === lastSource)?.color ?? "#10b981",
                  }}
                >
                  via {SOURCE_META.find((s) => s.value === lastSource)?.label ?? lastSource}
                </span>
              )}
            </div>

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
              : source === "apify"
              ? "linear-gradient(135deg, #00b4ff 0%, #0066cc 100%)"
              : source === "brightdata"
              ? "linear-gradient(135deg, #ff6b35 0%, #e63000 100%)"
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
              {hasResult
                ? `Re-sync via ${selectedMeta.label}`
                : `Sync via ${selectedMeta.label}`}
            </>
          )}
        </button>
      </div>

      {/* Data sources info */}
      <div
        className="rounded-xl border p-6 space-y-5"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Platform Coverage
        </p>

        <div className="space-y-4">
          {/* Apify */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#00b4ff]" />
              <p className="text-xs font-bold text-white">Apify</p>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { color: "#ff0050", label: "TikTok", desc: "#tiktokmademebuyit · #viralproduct · #amazonfinds · #skincare · #gadgets" },
                { color: "#a855f7", label: "Instagram", desc: "#instashop · #beautytips · #techgadgets · #outfitoftheday" },
                { color: "#3b82f6", label: "Facebook", desc: "viral product 2025 · trending gadget · fashion must have" },
                { color: "#ff9900", label: "Amazon", desc: "Best Sellers in Beauty, Electronics, Fashion, Sports, Home & Kitchen" },
                { color: "#95bf47", label: "Shopify", desc: "Gymshark, SKIMS, Fashion Nova, Ruggable" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
                  <div>
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bright Data */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#ff6b35]" />
              <p className="text-xs font-bold text-white">Bright Data</p>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { color: "#ff0050", label: "TikTok", desc: "Dataset API — hashtag-based post collection via residential proxies" },
                { color: "#a855f7", label: "Instagram", desc: "Dataset API — hashtag post collector with owner follower data" },
                { color: "#ff9900", label: "Amazon", desc: "Dataset API — keyword product search with price, rating & ASIN" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
                  <div>
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
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
            { icon: RefreshCw, color: "#a855f7", text: "Selected data source(s) run in parallel across all supported platforms" },
            { icon: Zap, color: "#ff9900", text: "Amazon bestsellers and Shopify trending products are pulled as product listings with price & rating" },
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
      </div>
    </div>
  );
}
