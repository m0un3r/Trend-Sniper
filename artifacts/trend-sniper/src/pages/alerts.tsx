import { useState } from "react";
import { Bell, Trash2, Plus, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useListAlerts, useCreateAlert, useDeleteAlert, useListProducts, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { data, isLoading } = useListAlerts();
  const { data: products } = useListProducts({ limit: 50 });
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [threshold, setThreshold] = useState<string>("80");

  const alerts = data?.alerts ?? [];

  function handleCreate() {
    if (!selectedProductId || !threshold) return;
    createAlert.mutate(
      { data: { productId: parseInt(selectedProductId), threshold: parseFloat(threshold) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
          toast({ title: "Alert created" });
          setOpen(false);
          setSelectedProductId("");
          setThreshold("80");
        },
        onError: () => toast({ title: "Failed to create alert", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteAlert.mutate(
      { id },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() }); toast({ title: "Alert deleted" }); } }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Get notified when a product trend spikes above your threshold"
        action={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-[#ff0050] hover:bg-[#cc0040] text-white border-0"
            onClick={() => setOpen(true)}
            data-testid="button-create-alert"
          >
            <Plus className="w-3.5 h-3.5" />
            New Alert
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 opacity-30" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">No alerts configured</p>
          <p className="text-xs text-muted-foreground">Create an alert to monitor a product trend score</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border p-5 flex items-center gap-4 transition-all"
              style={{
                background: "hsl(var(--card))",
                borderColor: alert.triggered ? "rgba(16,185,129,0.3)" : "hsl(var(--card-border))",
                borderLeft: `3px solid ${alert.triggered ? "#10b981" : "#f59e0b"}`,
              }}
              data-testid={`alert-card-${alert.id}`}
            >
              <div
                className="p-2.5 rounded-xl shrink-0"
                style={{ background: alert.triggered ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)" }}
              >
                {alert.triggered ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{alert.productName}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>
                    Threshold:{" "}
                    <span className="font-bold text-white tabular-nums">{alert.threshold}</span>
                  </span>
                  <span>·</span>
                  {alert.triggered ? (
                    <span className="font-bold text-emerald-400">Triggered</span>
                  ) : (
                    <span className="font-bold text-amber-400">Watching</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(alert.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                data-testid={`button-delete-alert-${alert.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md border-border" style={{ background: "hsl(var(--card))" }}>
          <DialogHeader>
            <DialogTitle className="text-white font-black">Create Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="product" className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product" className="border-border bg-muted" data-testid="select-alert-product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {(products?.products ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold" className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Trend Score Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 80"
                className="border-border bg-muted"
                data-testid="input-threshold"
              />
              <p className="text-xs text-muted-foreground">Alert auto-triggers when live score crosses this value</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!selectedProductId || !threshold || createAlert.isPending}
              className="bg-[#ff0050] hover:bg-[#cc0040] text-white border-0"
              data-testid="button-confirm-alert"
            >
              {createAlert.isPending ? "Creating..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
