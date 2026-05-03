import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Package, MessageSquare, Bell, Settings, Zap, RefreshCw } from "lucide-react";

const PLATFORM_DOTS = [
  { color: "#ff0050", label: "TikTok" },
  { color: "#a855f7", label: "Instagram" },
  { color: "#3b82f6", label: "Facebook" },
  { color: "#ff9900", label: "Amazon" },
  { color: "#95bf47", label: "Shopify" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "Posts", href: "/posts", icon: MessageSquare },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Data Sync", href: "/sync", icon: RefreshCw },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff0050] via-[#a855f7] to-[#3b82f6] flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base tracking-tight text-white">
              Trend<span className="text-[#ff0050]">Sniper</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-0.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
            Intelligence
          </div>
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                  isActive
                    ? "bg-white/8 text-white font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 w-0.5 h-6 rounded-r bg-[#ff0050]" />
                )}
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#ff0050]" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Platform legend */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Platforms</p>
          <div className="flex flex-col gap-2">
            {PLATFORM_DOTS.map((p) => (
              <div key={p.label} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-xs text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="px-3 pb-4">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-all">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-0 overflow-y-auto">
        {/* Top bar */}
        <div className="h-16 border-b border-border flex items-center px-8 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-[#ff0050]" />
            <span>TrendSniper Intelligence Platform</span>
            <span className="mx-2 text-border">·</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-medium">Live</span>
          </div>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
