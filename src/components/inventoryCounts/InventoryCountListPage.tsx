/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Lista de sesiones de inventariado.
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthPermissions } from "@/hooks/useAuthPermissions";
import {
  listInventorySessions,
  statusLabel,
  type InventoryCountSessionSummary,
} from "@/services/inventoryCountService";

export default function InventoryCountListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthPermissions();

  const canCreate = hasPermission("inventory_count.create");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-sessions", statusFilter],
    queryFn: () =>
      listInventorySessions({
        limit: 80,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const sessions = data?.data ?? [];

  const badgeVariant = (s: InventoryCountSessionSummary["status"]) => {
    if (s === "APPROVED") return "default" as const;
    if (s === "CANCELLED") return "secondary" as const;
    if (s === "IN_REVIEW") return "outline" as const;
    return "secondary" as const;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Inventariado</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Conteos físicos y ajuste de stock tras aprobación
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => navigate("/inventario/inventariado/nuevo")} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo inventariado
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Sesiones</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal">
              Haz clic en una fila para abrir la sesión. En borrador, use «Iniciar conteo» en el detalle.
            </p>
          </div>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="IN_PROGRESS">En conteo</SelectItem>
              <SelectItem value="IN_REVIEW">En revisión</SelectItem>
              <SelectItem value="APPROVED">Aprobado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {isError && (
            <p className="text-sm text-destructive">No se pudieron cargar las sesiones.</p>
          )}
          {!isLoading && !sessions.length && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay sesiones. Cree una nueva para comenzar un conteo.
            </p>
          )}
          {sessions.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre / ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Progreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((row) => {
                    const prog = row.progress;
                    const label = row.name?.trim() || row.id.slice(0, 8);
                    const go = () => navigate(`/inventario/inventariado/${row.id}`);
                    return (
                      <TableRow
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={go}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            go();
                          }
                        }}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate" title={row.id}>
                          {label}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {prog
                            ? `${prog.countedLines}/${prog.totalLines} (${prog.pct}%)`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
