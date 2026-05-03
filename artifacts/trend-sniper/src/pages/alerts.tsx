import { useState } from "react";
import { Bell, Trash2, Plus, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
          toast({ title: "Alert created successfully" });
          setOpen(false);
          setSelectedProductId("");
          setThreshold("80");
        },
        onError: () => {
          toast({ title: "Failed to create alert", variant: "destructive" });
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteAlert.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
          toast({ title: "Alert deleted" });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Get notified when a product trend spikes"
        action={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bell className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm mb-1">No alerts configured</p>
          <p className="text-xs">Create an alert to monitor a product trend</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`bg-card border-card-border ${alert.triggered ? "border-emerald-500/30" : ""}`}
              data-testid={`alert-card-${alert.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      alert.triggered ? "bg-emerald-400/10" : "bg-muted"
                    }`}
                  >
                    {alert.triggered ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{alert.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Threshold: <span className="font-semibold text-foreground">{alert.threshold}</span>
                      {" · "}
                      {alert.triggered ? (
                        <span className="text-emerald-400 font-medium">Triggered</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Watching</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    data-testid={`button-delete-alert-${alert.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="product" className="text-xs">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product" data-testid="select-alert-product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {(products?.products ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold" className="text-xs">Trend Score Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 80"
                data-testid="input-threshold"
              />
              <p className="text-xs text-muted-foreground">Alert triggers when trend score exceeds this value</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!selectedProductId || !threshold || createAlert.isPending}
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
