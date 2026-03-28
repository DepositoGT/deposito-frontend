/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Crear sesión de inventariado e iniciar conteo.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useAllSuppliers } from "@/hooks/useSuppliers";
import { createInventorySession, startInventorySession } from "@/services/inventoryCountService";

type ScopeMode = "full" | "filtered";

export default function InventoryCountNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("full");
  const [selCategories, setSelCategories] = useState<Set<number>>(new Set());
  const [selSuppliers, setSelSuppliers] = useState<Set<string>>(new Set());

  const { data: categoriesRaw, isLoading: catLoading } = useCategories();
  const { data: suppliersRaw, isLoading: supLoading } = useAllSuppliers();

  const categories = useMemo(() => {
    const list = categoriesRaw ?? [];
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [categoriesRaw]);

  const suppliers = useMemo(() => {
    const list = suppliersRaw ?? [];
    return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [suppliersRaw]);

  useEffect(() => {
    if (scopeMode === "full") {
      setSelCategories(new Set());
      setSelSuppliers(new Set());
    }
  }, [scopeMode]);

  const filteredReady =
    scopeMode === "full" || selCategories.size > 0 || selSuppliers.size > 0;

  const createMut = useMutation({
    mutationFn: async () => {
      if (scopeMode === "filtered" && !selCategories.size && !selSuppliers.size) {
        throw new Error("Seleccione al menos una categoría o un proveedor.");
      }
      const scope =
        scopeMode === "full"
          ? {}
          : {
              categoryIds: selCategories.size ? [...selCategories] : undefined,
              supplierIds: selSuppliers.size ? [...selSuppliers] : undefined,
            };
      const session = await createInventorySession({
        name: name.trim() || undefined,
        scope,
        notes: notes.trim() || undefined,
      });
      await startInventorySession(session.id);
      return session.id;
    },
    onSuccess: (id) => {
      toast({ title: "Inventariado iniciado", description: "Redirigiendo al conteo…" });
      navigate(`/inventario/inventariado/${id}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo crear la sesión";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/inventario/inventariado")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al listado
      </Button>

      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Nuevo inventariado</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alcance del conteo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elija si el conteo cubre todo el catálogo activo o solo un subconjunto por categoría y/o
            proveedor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">¿Qué productos entran en este inventario?</Label>
            <RadioGroup
              value={scopeMode}
              onValueChange={(v) => setScopeMode(v as ScopeMode)}
              className="grid gap-3"
            >
              <label
                htmlFor="scope-full"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="full" id="scope-full" className="mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium leading-none">Todo el inventario</span>
                  <p className="text-xs text-muted-foreground">
                    Todos los productos activos (no eliminados), sin filtrar por categoría ni
                    proveedor.
                  </p>
                </div>
              </label>
              <label
                htmlFor="scope-filtered"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="filtered" id="scope-filtered" className="mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium leading-none">Acotar alcance</span>
                  <p className="text-xs text-muted-foreground">
                    Solo productos que coincidan con las categorías y/o proveedores que marque abajo
                    (se combinan como filtro).
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ic-name">Nombre (opcional)</Label>
            <Input
              id="ic-name"
              placeholder="Ej. Inventario semanal marzo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ic-notes">Notas (opcional)</Label>
            <Input
              id="ic-notes"
              placeholder="Observaciones para el equipo"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {scopeMode === "filtered" && (
            <div className="space-y-2">
              {!filteredReady && (
                <p className="text-sm text-amber-700 dark:text-amber-500">
                  Marque al menos una categoría o un proveedor para continuar.
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categorías</Label>
                  {catLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                  ) : (
                    <ScrollArea className="h-48 rounded border p-2">
                      <div className="space-y-2 pr-2">
                        {categories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selCategories.has(Number(c.id))}
                              onCheckedChange={(v) => {
                                const next = new Set(selCategories);
                                if (v) next.add(Number(c.id));
                                else next.delete(Number(c.id));
                                setSelCategories(next);
                              }}
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Proveedores</Label>
                  {supLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                  ) : (
                    <ScrollArea className="h-48 rounded border p-2">
                      <div className="space-y-2 pr-2">
                        {suppliers.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selSuppliers.has(String(s.id))}
                              onCheckedChange={(v) => {
                                const next = new Set(selSuppliers);
                                if (v) next.add(String(s.id));
                                else next.delete(String(s.id));
                                setSelSuppliers(next);
                              }}
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full sm:w-auto"
            disabled={createMut.isPending || !filteredReady}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Creando…" : "Crear e iniciar conteo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
