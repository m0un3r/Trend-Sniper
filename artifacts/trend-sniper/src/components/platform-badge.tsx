export function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();

  if (p === "tiktok") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white" style={{ background: "#ff0050" }}>
        TikTok
      </span>
    );
  }
  if (p === "instagram") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white" style={{ background: "#a855f7" }}>
        Instagram
      </span>
    );
  }
  if (p === "facebook") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white" style={{ background: "#3b82f6" }}>
        Facebook
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-muted-foreground capitalize">
      {platform}
    </span>
  );
}

export function platformColor(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "tiktok") return "#ff0050";
  if (p === "instagram") return "#a855f7";
  if (p === "facebook") return "#3b82f6";
  return "#6366f1";
}
