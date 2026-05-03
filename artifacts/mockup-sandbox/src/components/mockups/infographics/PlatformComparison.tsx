import { TrendingUp, Eye, FileText, Zap, Star } from "lucide-react";

const PLATFORM_COLORS = {
  tiktok: { primary: "#ff0050", light: "#ff005015", text: "#ff0050", label: "TikTok" },
  instagram: { primary: "#a855f7", light: "#a855f715", text: "#a855f7", label: "Instagram" },
  facebook: { primary: "#3b82f6", light: "#3b82f615", text: "#3b82f6", label: "Facebook" },
};

const platforms = [
  {
    key: "tiktok",
    products: 6,
    avgScore: 38.9,
    avgEngagement: 10.6,
    totalViews: 588446847,
    totalPosts: 13455,
    avgVelocity: 0.7,
    peakScore: 46.7,
    viewShare: 56.6,
    productShare: 50,
  },
  {
    key: "instagram",
    products: 4,
    avgScore: 37.0,
    avgEngagement: 9.4,
    totalViews: 357160492,
    totalPosts: 7465,
    avgVelocity: 1.5,
    peakScore: 43.5,
    viewShare: 34.4,
    productShare: 33,
  },
  {
    key: "facebook",
    products: 2,
    avgScore: 27.6,
    avgEngagement: 4.5,
    totalViews: 93213062,
    totalPosts: 2000,
    avgVelocity: 0.7,
    peakScore: 30.2,
    viewShare: 9.0,
    productShare: 17,
  },
] as const;

const TOTAL_VIEWS = 1_038_820_401;
const TOTAL_PRODUCTS = 12;
const TOTAL_POSTS = 22920;

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function DonutSlice({
  percent,
  color,
  index,
  total,
}: {
  percent: number;
  color: string;
  index: number;
  total: number;
}) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;

  // Compute cumulative start offset
  const allShares = [56.6, 34.4, 9.0];
  let startPct = 0;
  for (let i = 0; i < index; i++) startPct += allShares[i]!;

  const dashArray = (percent / 100) * circumference;
  const dashOffset = circumference - (startPct / 100) * circumference;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="20"
      strokeDasharray={`${dashArray} ${circumference - dashArray}`}
      strokeDashoffset={dashOffset}
      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
    />
  );
}

function ScoreBar({ value, max = 50, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function PlatformComparison() {
  return (
    <div className="w-[1000px] min-h-screen bg-[#0a0a0f] text-white p-10 font-sans">

      {/* Header */}
      <header className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">TrendSniper Intelligence Report</p>
            <h1 className="text-4xl font-black text-white mb-2">Platform Comparison</h1>
            <p className="text-slate-400 text-base">TikTok · Instagram · Facebook — Trend performance across 12 tracked products</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Views</p>
            <p className="text-3xl font-black text-white">1.04B</p>
            <p className="text-xs text-slate-500 mt-1">across all platforms</p>
          </div>
        </div>
      </header>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Products Tracked", value: TOTAL_PRODUCTS, icon: Star, color: "#f59e0b" },
          { label: "Total Posts Analyzed", value: fmt(TOTAL_POSTS), icon: FileText, color: "#a855f7" },
          { label: "Combined Views", value: fmt(TOTAL_VIEWS), icon: Eye, color: "#3b82f6" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ background: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main comparison grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {platforms.map((p) => {
          const c = PLATFORM_COLORS[p.key];
          return (
            <div
              key={p.key}
              className="rounded-xl border p-6 flex flex-col gap-5"
              style={{ background: c.light, borderColor: `${c.primary}30` }}
            >
              {/* Platform header */}
              <div className="flex items-center justify-between">
                <div
                  className="px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: c.primary, color: "#fff" }}
                >
                  {c.label}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums" style={{ color: c.primary }}>
                    {p.products}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">products</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                {[
                  { label: "Avg Trend Score", value: p.avgScore, max: 50 },
                  { label: "Peak Score", value: p.peakScore, max: 50 },
                ].map(({ label, value, max }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      <span>{label}</span>
                    </div>
                    <ScoreBar value={value} max={max} color={c.primary} />
                  </div>
                ))}
              </div>

              {/* View share */}
              <div className="rounded-lg bg-slate-900/60 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">View Share</p>
                <p className="text-3xl font-black tabular-nums" style={{ color: c.primary }}>
                  {p.viewShare}%
                </p>
                <p className="text-xs text-slate-500 mt-1">{fmt(p.totalViews)} views</p>
              </div>

              {/* Engagement & velocity */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Engagement</p>
                  <p className="text-lg font-bold" style={{ color: c.primary }}>{p.avgEngagement}%</p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Velocity</p>
                  <p className="text-lg font-bold" style={{ color: c.primary }}>{p.avgVelocity}</p>
                </div>
              </div>

              {/* Posts */}
              <div className="text-center pt-1 border-t border-slate-800/50">
                <p className="text-xs text-slate-500">{fmt(p.totalPosts)} posts driving trends</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Views donut chart + breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-8">

        {/* Donut chart */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">View Share Distribution</p>
          <div className="flex items-center gap-8">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#1e293b" strokeWidth="20" />
              {platforms.map((p, i) => (
                <DonutSlice
                  key={p.key}
                  percent={p.viewShare}
                  color={PLATFORM_COLORS[p.key].primary}
                  index={i}
                  total={3}
                />
              ))}
              <text x="80" y="76" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">1.04B</text>
              <text x="80" y="92" textAnchor="middle" fill="#64748b" fontSize="9">total views</text>
            </svg>
            <div className="flex flex-col gap-3">
              {platforms.map((p) => {
                const c = PLATFORM_COLORS[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: c.primary }} />
                    <div>
                      <p className="text-sm font-bold text-white">{c.label}</p>
                      <p className="text-xs text-slate-500">{p.viewShare}% · {fmt(p.totalViews)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Metric comparison table */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Head-to-Head Metrics</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="text-left pb-3 font-medium">Metric</th>
                {platforms.map((p) => (
                  <th key={p.key} className="text-right pb-3 font-medium" style={{ color: PLATFORM_COLORS[p.key].primary }}>
                    {PLATFORM_COLORS[p.key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                { label: "Avg Score", values: platforms.map((p) => p.avgScore), suffix: "" },
                { label: "Engagement", values: platforms.map((p) => p.avgEngagement), suffix: "%" },
                { label: "Velocity", values: platforms.map((p) => p.avgVelocity), suffix: "" },
                { label: "Peak Score", values: platforms.map((p) => p.peakScore), suffix: "" },
                { label: "Products", values: platforms.map((p) => p.products), suffix: "" },
                { label: "Posts", values: platforms.map((p) => fmt(p.totalPosts)), suffix: "" },
              ].map(({ label, values, suffix }) => {
                const maxVal = typeof values[0] === "number" ? Math.max(...(values as number[])) : null;
                return (
                  <tr key={label}>
                    <td className="py-2.5 text-slate-400 text-xs">{label}</td>
                    {values.map((val, i) => {
                      const isMax = typeof val === "number" && val === maxVal;
                      return (
                        <td
                          key={i}
                          className="py-2.5 text-right font-bold tabular-nums text-xs"
                          style={{ color: isMax ? PLATFORM_COLORS[platforms[i]!.key].primary : "#94a3b8" }}
                        >
                          {val}{suffix}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key insight */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 mb-8 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Key Insight</p>
          <p className="text-white font-semibold text-base">
            TikTok dominates with 56.6% of total views and highest engagement (10.6%), but Instagram leads in velocity (1.5× faster trend growth) — signaling it as the rising platform for early trend discovery.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 pt-5 text-xs text-slate-600 flex justify-between">
        <span>Source: TrendSniper — 12 tracked products across 3 platforms</span>
        <span>May 2026 · Live score data</span>
      </footer>

    </div>
  );
}
