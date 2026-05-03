import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Database, Zap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface IngestionStatus {
  running: boolean;
  lastRanAt: string | null;
  lastResult: {
    platforms?: { tiktok: number; instagram: number; facebook: number };
    productsUpserted?: number;
    postsInserted?: number;
    demoDataCleared?: boolean;
    error?: string;
  } | null;
}

function PlatformStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold text-white capitalize">{label}</span>
      </div>
      <span className="text-sm font-black tabular-nums" style={{ color }}>{count} posts fetched</span>
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
        toast({ title: "Ingestion started", description: "Fetching real data from TikTok, Instagram, and Facebook via Apify. This takes 2–5 minutes." });
        await fetchStatus();
      } else {
        toast({ title: "Failed to start ingestion", variant: "destructive" });
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
        description="Connect to real TikTok, Instagram, and Facebook data via Apify"
      />

      {/* Status card */}
      <div className="rounded-xl border p-6 space-y-5" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Apify Integration</p>
            <p className="text-lg font-black text-white">Social Media Ingestion</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fetches viral posts from TikTok, Instagram & Facebook, extracts product signals, and replaces all demo data with real content.
            </p>
          </div>
          {running ? (
            <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : hasError ? (
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,0,80,0.12)" }}>
              <XCircle className="w-6 h-6 text-[#ff0050]" />
            </div>
          ) : hasResult ? (
            <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.12)" }}>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          ) : (
            <div className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
          )}
        </div>

        {/* Status bar */}
        {running && (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">Ingestion in progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">Apify actors are running — fetching live posts from all 3 platforms. This takes 2–5 minutes.</p>
            </div>
          </div>
        )}

        {hasError && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,0,80,0.06)", border: "1px solid rgba(255,0,80,0.2)" }}
          >
            <p className="text-sm font-bold text-[#ff0050]">Last ingestion failed</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{status?.lastResult?.error}</p>
          </div>
        )}

        {hasResult && !hasError && !running && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <p className="text-sm font-bold text-emerald-400 mb-3">Last sync successful</p>
            {platforms && (
              <div className="space-y-0">
                <PlatformStat label="TikTok" count={platforms.tiktok} color="#ff0050" />
                <PlatformStat label="Instagram" count={platforms.instagram} color="#a855f7" />
                <PlatformStat label="Facebook" count={platforms.facebook} color="#3b82f6" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-2xl font-black tabular-nums text-white">{status?.lastResult?.productsUpserted ?? 0}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Products detected</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-2xl font-black tabular-nums text-white">{status?.lastResult?.postsInserted ?? 0}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Posts indexed</p>
              </div>
            </div>
            {status?.lastRanAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Completed {new Date(status.lastRanAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <button
          onClick={startIngestion}
          disabled={running || isStarting}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: running || isStarting ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #ff0050, #a855f7)" }}
        >
          {running || isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {running ? "Ingestion running…" : "Starting…"}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {hasResult ? "Re-sync Real Data" : "Sync Real Social Media Data"}
            </>
          )}
        </button>
      </div>

      {/* What this does */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">What happens during sync</p>
        <div className="space-y-3">
          {[
            { icon: Database, color: "#ff0050", step: "1", text: "All demo/existing data is deleted from the database" },
            { icon: RefreshCw, color: "#a855f7", step: "2", text: "Apify actors scrape viral posts from TikTok, Instagram, and Facebook using trending hashtags" },
            { icon: Zap, color: "#3b82f6", step: "3", text: "Product signals are extracted from captions (skincare, tech gadgets, fashion, etc.)" },
            { icon: TrendingUp, color: "#10b981", step: "4", text: "Trend scores are computed from real engagement metrics (views, likes, comments, shares)" },
          ].map(({ icon: Icon, color, step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-3 mt-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-white">Note:</span> Each sync costs Apify compute units. A typical run (90 posts) uses ~0.5–1 CU. You can re-sync anytime to refresh with the latest trending content.
          </p>
        </div>
      </div>
    </div>
  );
}
