/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Detalle de sesión: conteo, envío a revisión, aprobación, informes.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthPermissions } from "@/hooks/useAuthPermissions";
import { PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { formatMoney } from "@/utils";
import {
  getInventorySession,
  startInventorySession,
  listInventorySessionLines,
  updateInventoryLine,
  submitInventorySession,
  approveInventorySession,
  cancelInventorySession,
  downloadInventorySessionReport,
  statusLabel,
} from "@/services/inventoryCountService";

export default function InventoryCountSessionPage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthPermissions();
  const { locale, currencyCode } = useSystemSettings();
  const fmt = (n: number) => formatMoney(n, locale, currencyCode);

  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ]);

  const canCount = hasPermission("inventory_count.count");
  const canSubmit = hasPermission("inventory_count.submit");
  const canApprove = hasPermission("inventory_count.approve");
  const canCancel = hasPermission("inventory_count.cancel");
  const canExport = hasPermission("inventory_count.export", "reports.view");
  const canStart = hasPermission("inventory_count.create");

  const sessionQuery = useQuery({
    queryKey: ["inventory-session", sessionId],
    queryFn: () => getInventorySession(sessionId),
    enabled: Boolean(sessionId),
  });

  const linesQuery = useQuery({
    queryKey: ["inventory-lines", sessionId, debouncedQ, page],
    queryFn: () =>
      listInventorySessionLines(sessionId, {
        q: debouncedQ || undefined,
        offset: page * pageSize,
        limit: pageSize,
      }),
    enabled: Boolean(sessionId) && sessionQuery.data?.status !== "DRAFT",
  });

  const startMut = useMutation({
    mutationFn: () => startInventorySession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-lines", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] });
      toast({ title: "Conteo iniciado" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error al iniciar";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const saveLine = useCallback(
    async (lineId: string, qty: number) => {
      await updateInventoryLine(sessionId, lineId, { qty_counted: Math.max(0, Math.floor(qty)) });
      queryClient.invalidateQueries({ queryKey: ["inventory-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-lines", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] });
    },
    [sessionId, queryClient]
  );

  const submitMut = useMutation({
    mutationFn: () => submitInventorySession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] });
      toast({ title: "Enviado a revisión" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo enviar";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const approveMut = useMutation({
    mutationFn: () => approveInventorySession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast({ title: "Inventario aprobado", description: "Stock actualizado según conteo." });
      setApproveOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo aprobar";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelInventorySession(sessionId, cancelReason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] });
      toast({ title: "Sesión cancelada" });
      setCancelOpen(false);
      setCancelReason("");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo cancelar";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const session = sessionQuery.data;
  const lines = linesQuery.data?.data ?? [];
  const linesTotal = linesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(linesTotal / pageSize));

  if (sessionQuery.isLoading || !session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {sessionQuery.isError ? "Sesión no encontrada." : "Cargando…"}
      </div>
    );
  }

  const isDraft = session.status === "DRAFT";
  const inProgress = session.status === "IN_PROGRESS";
  const inReview = session.status === "IN_REVIEW";
  const locked = !inProgress || !canCount;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/inventario/inventariado")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Listado
      </Button>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <ClipboardList className="h-7 w-7 text-primary shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              {session.name?.trim() || `Sesión ${session.id.slice(0, 8)}`}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary">{statusLabel(session.status)}</Badge>
              {session.progress && (
                <span className="text-xs text-muted-foreground">
                  {session.progress.countedLines}/{session.progress.totalLines} líneas contadas (
                  {session.progress.pct}%)
                </span>
              )}
              {session.totals && inReview && (
                <span className="text-xs text-muted-foreground">
                  Valor aprox. diferencias: {fmt(Number(session.totals.valueDeltaApprox) || 0)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft && session._count?.lines === 0 && canStart && (
            <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              Iniciar conteo
            </Button>
          )}
          {canExport && session.status !== "DRAFT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await downloadInventorySessionReport(sessionId, "pdf");
                  } catch (e) {
                    toast({
                      title: "Error",
                      description: e instanceof Error ? e.message : "PDF",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await downloadInventorySessionReport(sessionId, "csv");
                  } catch (e) {
                    toast({
                      title: "Error",
                      description: e instanceof Error ? e.message : "CSV",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </>
          )}
          {inProgress && canSubmit && (
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
              <Send className="h-4 w-4 mr-2" />
              Enviar a revisión
            </Button>
          )}
          {inReview && canApprove && (
            <Button onClick={() => setApproveOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar y aplicar stock
            </Button>
          )}
          {(isDraft || inProgress || inReview) && canCancel && (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {isDraft && session._count?.lines === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Esta sesión está en borrador sin líneas. Pulse «Iniciar conteo» para generar el listado
            según el alcance definido al crearla.
          </CardContent>
        </Card>
      )}

      {!isDraft && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center gap-2">
              <span>Líneas</span>
              <Input
                placeholder="Buscar producto o código…"
                className="max-w-xs sm:ml-auto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CardTitle>
            {inProgress && (
              <p className="text-xs text-muted-foreground">
                Stock teórico congelado al iniciar el conteo. Diferencia = contado − teórico (faltante
                si es negativa).
              </p>
            )}
          </CardHeader>
          <CardContent>
            {linesQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando líneas…</p>}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Teórico</TableHead>
                    <TableHead className="text-right w-28">Contado</TableHead>
                    <TableHead className="text-right">Diff.</TableHead>
                    <TableHead className="text-right">Valor diff.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((row) => (
                    <LineRow
                      key={row.id}
                      row={row}
                      locked={locked}
                      fmt={fmt}
                      onSave={(qty) => saveLine(row.id, qty)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-3 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-muted-foreground">
                  Página {page + 1} de {totalPages} ({linesTotal} líneas)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar inventariado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizará el stock de cada producto al valor contado. Esta acción no se puede
              deshacer desde aquí (requeriría un nuevo ajuste o inventario).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
              Confirmar aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar sesión</AlertDialogTitle>
            <AlertDialogDescription>
              No se aplicarán cambios al stock. Indique el motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
              className="mt-1"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej. Conteo incompleto, reagendar…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!cancelReason.trim()) {
                  toast({ title: "Indique un motivo", variant: "destructive" });
                  return;
                }
                cancelMut.mutate();
              }}
              disabled={cancelMut.isPending}
            >
              Cancelar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LineRow({
  row,
  locked,
  fmt,
  onSave,
}: {
  row: import("@/services/inventoryCountService").InventoryCountLineRow;
  locked: boolean;
  fmt: (n: number) => string;
  onSave: (qty: number) => Promise<void>;
}) {
  const [val, setVal] = useState<string>(
    row.qty_counted != null ? String(row.qty_counted) : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(row.qty_counted != null ? String(row.qty_counted) : "");
  }, [row.qty_counted, row.id]);

  const diff = row.difference;
  const vd = row.valueDifference;

  const commit = async () => {
    const n = val === "" ? NaN : Number(val);
    if (!Number.isFinite(n) || n < 0) {
      return;
    }
    setSaving(true);
    try {
      await onSave(n);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium max-w-[180px] truncate" title={row.product.name}>
        {row.product.name}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.product.barcode || "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{row.stock_snapshot}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Input
            type="number"
            min={0}
            className="w-20 h-8 text-right"
            disabled={locked}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
          {!locked && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2"
              disabled={saving}
              onClick={() => commit()}
            >
              OK
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell
        className={`text-right tabular-nums ${diff != null && diff < 0 ? "text-amber-700 dark:text-amber-400" : ""} ${diff != null && diff > 0 ? "text-emerald-700 dark:text-emerald-400" : ""}`}
      >
        {diff != null ? diff : "—"}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {vd != null ? fmt(Number(vd)) : "—"}
      </TableCell>
    </TableRow>
  );
}
