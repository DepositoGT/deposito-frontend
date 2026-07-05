/**
 * Sección de lotes con existencia (FEFO) en el detalle de producto.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, PackageOpen } from "lucide-react";
import { apiFetch } from "@/services/api";

type ProductLot = {
  id: string;
  lot_code: string | null;
  expiry_date: string | null;
  qty_remaining: number;
  received_at: string;
};

type Props = {
  productId: string;
  tracksExpiry: boolean;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-GT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

const daysToExpiry = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86400000);

export function ProductLotsSection({ productId, tracksExpiry }: Props) {
  const [lots, setLots] = useState<ProductLot[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ lots: ProductLot[] }>(`/api/products/${productId}/lots`)
      .then((data) => {
        if (!cancelled) setLots(data.lots);
      })
      .catch(() => {
        if (!cancelled) setLots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!loading && (!lots || lots.length === 0) && !tracksExpiry) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-5 h-5 text-liquor-amber" />
          Lotes y caducidad
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando lotes…</p>
        ) : !lots || lots.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin lotes con existencia registrados.</p>
            <p className="text-xs mt-1">Se crean al registrar un ingreso de mercancía para este producto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Caducidad</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => {
                  const days = lot.expiry_date ? daysToExpiry(lot.expiry_date) : null;
                  const expired = days != null && days < 0;
                  const expiringSoon = days != null && days >= 0 && days <= 30;
                  return (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.lot_code || "—"}</TableCell>
                      <TableCell>{lot.expiry_date ? formatDate(lot.expiry_date) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{lot.qty_remaining}</TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : expiringSoon ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15">
                            Por vencer
                          </Badge>
                        ) : (
                          <Badge variant="outline">Vigente</Badge>
                        )}
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
  );
}

export default ProductLotsSection;
