import { Badge } from "@/components/ui/badge";

export function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  
  if (p === "tiktok") {
    return <Badge variant="outline" className="bg-[#ff0050]/10 text-[#ff0050] border-[#ff0050]/20 font-medium">TikTok</Badge>;
  }
  if (p === "instagram") {
    return <Badge variant="outline" className="bg-gradient-to-r from-purple-500/10 to-orange-500/10 text-purple-400 border-purple-500/20 font-medium">Instagram</Badge>;
  }
  if (p === "facebook") {
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-medium">Facebook</Badge>;
  }
  
  return <Badge variant="outline" className="capitalize">{platform}</Badge>;
}
