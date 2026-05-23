/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Detalle de pedido — confirmar, cancelar, entrega parcial, venta.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Loader2, Receipt, ShoppingCart, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuthPermissions } from "@/hooks/useAuthPermissions";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { formatMoney, formatDateTime } from "@/utils/formatters";
import {
  cancelOrder,
  confirmOrder,
  convertOrderToSale,
  fetchOrderById,
  num,
  orderStatusLabel,
  pendingOrderLineQty,
  type OrderStatus,
} from "@/services/orderService";

function statusBadgeVariant(status: OrderStatus): "default" | "secondary" | "outline" {
  if (status === "CONFIRMED") return "outline";
  if (status === "PARTIALLY_FULFILLED") return "secondary";
  if (status === "FULFILLED") return "default";
  return "secondary";
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthPermissions();
  const { locale, currencyCode } = useSystemSettings();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const fmt = (n: number) => formatMoney(n, locale, currencyCode);

  const canManage = hasPermission("orders.manage");
  const canSell = hasPermission("sales.create");

  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState("");
  const [saleQtys, setSaleQtys] = useState<Record<string, string>>({});

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrderById(id!),
    enabled: Boolean(id),
  });

  const hasSales = (order?.documentSales?.length ?? 0) > 0;
  const canRegisterSale =
    order && ["CONFIRMED", "PARTIALLY_FULFILLED"].includes(order.status) && order.lines.some((l) => pendingOrderLineQty(l) > 0);

  const saleTotal = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((acc, line) => {
      const q = Number(saleQtys[line.id] || 0);
      if (!Number.isFinite(q) || q <= 0) return acc;
      return acc + q * num(line.unit_price);
    }, 0);
  }, [order, saleQtys]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const openSaleDialog = () => {
    if (!order) return;
    const init: Record<string, string> = {};
    for (const line of order.lines) {
      const pending = pendingOrderLineQty(line);
      if (pending > 0) init[line.id] = String(pending);
    }
    setSaleQtys(init);
    setSaleDialogOpen(true);
  };

  const confirmMutation = useMutation({
    mutationFn: () => confirmOrder(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", id], updated);
      invalidate();
      toast({ title: "Pedido confirmado", description: "Stock reservado." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", id], updated);
      invalidate();
      toast({ title: "Pedido cancelado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: () => {
      const lines = Object.entries(saleQtys)
        .map(([line_id, raw]) => ({ line_id, qty: Number(raw) }))
        .filter((x) => Number.isFinite(x.qty) && x.qty > 0);
      return convertOrderToSale(id!, {
        payment_method_id: Number(paymentMethodId),
        amount_received: amountReceived ? Number(amountReceived) : undefined,
        lines,
      });
    },
    onSuccess: (result) => {
      invalidate();
      setSaleDialogOpen(false);
      const saleRef = (result.sale as { reference?: string; id?: string })?.reference;
      toast({ title: "Venta registrada", description: saleRef ?? "OK" });
      const saleId = (result.sale as { id?: string })?.id;
      if (saleId) navigate(`/ventas/${saleId}/factura`);
      else queryClient.setQueryData(["order", id], result.order);
    },
    onError: (e: Error) => toast({ title: "Error al vender", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="p-6 text-muted-foreground">Cargando pedido…</p>;
  if (isError || !order) return <p className="p-6 text-destructive">Pedido no encontrado.</p>;

  const isCash =
    paymentMethods.find((p) => String(p.id) === paymentMethodId)?.name?.toLowerCase() === "efectivo";
  const total = num(order.total);

  return (
    <div className="p-3 sm:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold">{order.reference ?? order.id.slice(0, 8)}</h1>
              <Badge variant={statusBadgeVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.customer || order.customerContact?.name || "Sin cliente"}
              {order.convertedFrom?.reference ? ` · Cot. ${order.convertedFrom.reference}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "DRAFT" && canManage && (
            <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirmar pedido
            </Button>
          )}
          {["DRAFT", "CONFIRMED", "PARTIALLY_FULFILLED"].includes(order.status) && canManage && !hasSales && (
            <Button variant="secondary" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          {canRegisterSale && canManage && canSell && (
            <>
              <Button variant="outline" onClick={() => navigate(`/ventas/nueva?pedido=${encodeURIComponent(order.reference ?? order.id)}`)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Abrir en POS
              </Button>
              <Button onClick={openSaleDialog}>
                <Receipt className="h-4 w-4 mr-2" />
                Registrar venta
              </Button>
            </>
          )}
        </div>
      </div>

      {order.documentSales && order.documentSales.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas vinculadas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {order.documentSales.map((ds) =>
              ds.sale?.id ? (
                <Button
                  key={ds.id}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/ventas/${ds.sale!.id}/factura`)}
                >
                  {ds.sale.reference ?? ds.sale.id.slice(0, 8)}
                </Button>
              ) : null
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="text-muted-foreground">Nombre:</span> {order.customer || order.customerContact?.name || "—"}</p>
            <p><span className="text-muted-foreground">Vigencia reserva:</span>{" "}
              {order.valid_until ? formatDateTime(order.valid_until, undefined, locale) : "—"}</p>
            {order.confirmed_at && (
              <p><span className="text-muted-foreground">Confirmado:</span>{" "}
                {formatDateTime(order.confirmed_at, undefined, locale)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Total pedido</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{fmt(total)}</p>
            {["CONFIRMED", "PARTIALLY_FULFILLED"].includes(order.status) && (
              <p className="text-xs text-muted-foreground mt-2">
                {order.stock_reservations?.length ?? 0} reserva(s) activa(s)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                <TableHead className="text-right">Entregado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">P. unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line) => {
                const pending = pendingOrderLineQty(line);
                const fulfilled = Number(line.qty_fulfilled || 0);
                return (
                  <TableRow key={line.id}>
                    <TableCell>{line.product?.name ?? line.product_id}</TableCell>
                    <TableCell className="text-right">{line.qty}</TableCell>
                    <TableCell className="text-right">{fulfilled}</TableCell>
                    <TableCell className="text-right">{pending}</TableCell>
                    <TableCell className="text-right">{fmt(num(line.unit_price))}</TableCell>
                    <TableCell className="text-right">{fmt(num(line.line_total))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar venta (entrega parcial)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Indica cuántas unidades entregar en esta venta. Total parcial: <strong>{fmt(saleTotal)}</strong>
            </p>
            {order.lines
              .filter((l) => pendingOrderLineQty(l) > 0)
              .map((line) => {
                const pending = pendingOrderLineQty(line);
                return (
                  <div key={line.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{line.product?.name ?? line.product_id}</span>
                    <Input
                      type="number"
                      min={0}
                      max={pending}
                      className="w-20"
                      value={saleQtys[line.id] ?? ""}
                      onChange={(e) => setSaleQtys((s) => ({ ...s, [line.id]: e.target.value }))}
                    />
                    <span className="text-muted-foreground w-16 text-right">/ {pending}</span>
                  </div>
                );
              })}
            <div className="space-y-2 pt-2">
              <Label>Método de pago</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCash && (
              <div className="space-y-2">
                <Label htmlFor="received">Monto recibido</Label>
                <Input id="received" type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialogOpen(false)}>Cerrar</Button>
            <Button
              disabled={!paymentMethodId || convertMutation.isPending || saleTotal <= 0}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
