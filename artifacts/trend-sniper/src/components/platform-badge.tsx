const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  tiktok:    { label: "TikTok",    color: "#ff0050" },
  instagram: { label: "Instagram", color: "#a855f7" },
  facebook:  { label: "Facebook",  color: "#3b82f6" },
  amazon:    { label: "Amazon",    color: "#ff9900" },
  shopify:   { label: "Shopify",   color: "#95bf47" },
};

export function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform.toLowerCase()];
  if (cfg) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white shrink-0"
        style={{ background: cfg.color }}
      >
        {cfg.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-muted-foreground capitalize shrink-0">
      {platform}
    </span>
  );
}

export function platformColor(platform: string): string {
  return PLATFORM_CONFIG[platform.toLowerCase()]?.color ?? "#6366f1";
}

export const ALL_PLATFORMS = Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => ({
  key,
  label: cfg.label,
  color: cfg.color,
}));
