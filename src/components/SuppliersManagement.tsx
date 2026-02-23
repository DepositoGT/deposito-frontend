/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Package,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Users,
  FileUp,
  LayoutGrid,
  List,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Supplier, SupplierStats } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
import { useSupplier } from "@/hooks/useSupplier";
import { useUpdateSupplier } from "@/hooks/useUpdateSupplier";
import { useDeleteSupplier } from "@/hooks/useDeleteSupplier";
import { SupplierImportDialog } from "@/components/suppliers/SupplierImportDialog";
import { Pagination } from "@/components/shared/Pagination";
import { useAuthPermissions } from "@/hooks/useAuthPermissions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SuppliersManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: suppliersData, isLoading, isError } = useSuppliers({
    page: currentPage,
    pageSize,
    search: searchTerm || undefined,
  });
  
  const suppliers: Supplier[] = suppliersData?.items ?? [];
  const totalItems = suppliersData?.totalItems ?? 0;
  const totalPages = suppliersData?.totalPages ?? 1;
  const { data: categoriesData } = useCategories();
  const { data: paymentTermsData } = usePaymentTerms();

  const categories = useMemo(() => {
    if (!categoriesData) return [] as Array<{ id: number | string; name: string }>;
    if (Array.isArray(categoriesData)) {
      return categoriesData as Array<{ id: number | string; name: string }>;
    }
    return (categoriesData as { items?: Array<{ id: number | string; name: string }> }).items ?? [];
  }, [categoriesData]);
  const paymentTerms = useMemo(() => {
    if (Array.isArray(paymentTermsData)) {
      return paymentTermsData;
    }
    return paymentTermsData?.items ?? [];
  }, [paymentTermsData]);

  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();
  const location = useLocation();

  const canCreate = hasPermission("suppliers.create");
  const canEdit = hasPermission("suppliers.edit");
  const canDelete = hasPermission("suppliers.delete");
  const canImport = hasPermission("suppliers.import");

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Abrir modal de edición si venimos desde el detalle con un id específico
  useEffect(() => {
    if (!canEdit) return;
    const state = location.state as { editSupplierId?: string } | null;
    const editId = state?.editSupplierId;
    if (!editId || !suppliers.length) return;
    const supplierToEdit = suppliers.find((s) => String(s.id) === String(editId));
    if (supplierToEdit) {
      editSupplier(supplierToEdit);
    }
  }, [location.state, suppliers, canEdit]);

  const stats: SupplierStats = {
    totalSuppliers: totalItems,
    activeSuppliers: suppliers.filter((s) => String(s.status) === "active").length,
    totalProducts: suppliers.reduce((sum, s) => sum + ((s.productsList?.length ?? s.products) || 0), 0),
    avgRating: "0.0",
  };

  const [editEstado, setEditEstado] = useState<number>(1);
  // edit form fields (controlled)
  const [editName, setEditName] = useState<string>("");
  const [editContact, setEditContact] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);
  const [editPaymentTermId, setEditPaymentTermId] = useState<string | undefined>(undefined);
  const [editAddress, setEditAddress] = useState<string>("");

  // fetch supplier details when editing
  const supplierIdToLoad = selectedSupplier?.id;
  const { data: supplierData, isLoading: supplierLoading } = useSupplier(supplierIdToLoad);

  // sync fetched supplier into edit fields
  useEffect(() => {
    if (!supplierData) return;
    setEditName(supplierData.name ?? "");
    setEditContact(supplierData.contact ?? "");
    setEditPhone(supplierData.phone ?? "");
    setEditEmail(supplierData.email ?? "");
    setEditAddress(supplierData.address ?? "");
    const anySupplier = supplierData as unknown as {
      categories?: Array<{ id: number | string }>;
      category_id?: number | string;
    };

    if (Array.isArray(anySupplier.categories) && anySupplier.categories.length > 0) {
      setEditCategoryIds(anySupplier.categories.map((c) => String(c.id)));
    } else if (anySupplier.category_id) {
      setEditCategoryIds([String(anySupplier.category_id)]);
    } else {
      setEditCategoryIds([]);
    }
    setEditPaymentTermId(supplierData.payment_terms_id ? String(supplierData.payment_terms_id) : undefined);
    const raw = supplierData as { estado?: number };
    setEditEstado(raw.estado !== undefined && raw.estado !== null ? Number(raw.estado) : 1);
  }, [supplierData]);

  // update mutation (TanStack Query v5 uses isPending, not isLoading)
  const updateMutation = useUpdateSupplier();
  const updateMutateAsync = updateMutation.mutateAsync;
  const updateIsLoading = updateMutation.isPending;

  const viewSupplier = (supplier: Supplier) => {
    navigate(`/proveedores/${supplier.id}`);
  };

  const editSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    // status will be populated when the supplier details are fetched (useSupplier -> useEffect)
    setIsEditOpen(true);
  };

  const deleteMutation = useDeleteSupplier();
  const deleteMutateAsync = deleteMutation.mutateAsync;
  const deleteIsLoading = deleteMutation.isPending;

  const deleteSupplier = async (supplierId: string) => {
    try {
      await deleteMutateAsync(supplierId);
      toast({ title: "Proveedor eliminado", description: "El proveedor ha sido eliminado correctamente" });
      
      // If current page becomes empty after deletion, go to previous page
      if (suppliers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err: unknown) {
      let message = "No se pudo eliminar el proveedor";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message?: unknown }).message;
        if (m !== undefined) message = String(m) || message;
      }
      toast({ title: "Error", description: message });
    }
  };


  const getStatusBadge = (status: string | undefined) => {
    return status === "active"
      ? <Badge className="bg-liquor-gold text-liquor-bronze">Activo</Badge>
      : <Badge variant="secondary">Inactivo</Badge>;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Proveedores</h2>
          <p className="text-muted-foreground">Administra tus socios comerciales</p>
        </div>

        <div className="flex gap-2">
          {canImport && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <SupplierImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
            </>
          )}
          {canCreate && (
            <Button className="bg-liquor-amber hover:bg-liquor-amber/90 text-white" onClick={() => navigate("/proveedores/nuevo")}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proveedores</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSuppliers}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Proveedores Activos</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeSuppliers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-liquor-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productos Disponibles</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, contacto o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center border rounded-md bg-background/80">
              <Button
                type="button"
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode("table")}
                aria-label="Vista de tabla"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode("cards")}
                aria-label="Vista de cuadros"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Proveedores */}
      {isLoading && (
        <div className="p-6 text-muted-foreground">Cargando proveedores...</div>
      )}
      {isError && !isLoading && (
        <div className="p-6 text-destructive">Error al cargar proveedores.</div>
      )}
      {!isLoading && !isError && (
        <>
          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay proveedores para mostrar.
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Proveedor</th>
                        <th className="text-left p-4 font-medium">Categoría</th>
                        <th className="text-left p-4 font-medium">Contacto</th>
                        <th className="text-left p-4 font-medium">Teléfono</th>
                        <th className="text-left p-4 font-medium">Email</th>
                        <th className="text-left p-4 font-medium">Dirección</th>
                        <th className="text-left p-4 font-medium">Estado</th>
                        <th className="text-right p-4 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((supplier) => (
                        <tr key={supplier.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{supplier.name}</div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">
                              {supplier.categoriesLabel || String(supplier.category)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{supplier.contact}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{supplier.phone}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{supplier.email}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{supplier.address}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(String(supplier.status))}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewSupplier(supplier)}
                                disabled={deleteIsLoading || updateIsLoading}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deleteIsLoading}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar Proveedor?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor "{supplier.name}" y toda su información asociada.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={deleteIsLoading}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteSupplier(supplier.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deleteIsLoading}
                                    >
                                      {deleteIsLoading ? (
                                        <>
                                          <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                          </svg>
                                          Eliminando...
                                        </>
                                      ) : (
                                        "Eliminar"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {suppliers.map((supplier, index) => (
              <Card
                key={supplier.id}
                className="animate-bounce-in hover:shadow-card transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base text-foreground">{supplier.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {supplier.categoriesLabel || String(supplier.category)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(String(supplier.status))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {/* Información de contacto */}
                  <div className="space-y-1.5">
                    <div className="flex items-center text-xs">
                      <Users className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
                      <span className="text-foreground truncate">{supplier.contact}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
                      <span className="text-foreground truncate">{supplier.phone}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
                      <span className="text-foreground truncate">{supplier.email}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
                      <span className="text-foreground truncate">{supplier.address}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewSupplier(supplier)}
                      className="h-7 text-xs"
                      disabled={deleteIsLoading || updateIsLoading}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 text-xs"
                          disabled={deleteIsLoading}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar Proveedor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor "{supplier.name}" y toda su información asociada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleteIsLoading}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSupplier(supplier.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteIsLoading}
                          >
                            {deleteIsLoading ? (
                              <>
                                <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                Eliminando...
                              </>
                            ) : (
                              "Eliminar"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
          {totalPages > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              hasNextPage={suppliersData?.nextPage !== null}
              hasPrevPage={suppliersData?.prevPage !== null}
              loading={isLoading}
            />
          )}
        </>
      )}

      {/* Modal Editar Proveedor */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nombre de la Empresa</Label>
                  <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Persona de Contacto</Label>
                  <Input id="edit-contact" value={editContact} onChange={(e) => setEditContact(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-category">Categorías</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <span className="truncate text-left">
                          {editCategoryIds.length === 0
                            ? "Seleccionar categorías"
                            : `${editCategoryIds.length} categoría(s) seleccionada(s)`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar categoría..." />
                        <CommandList>
                          <CommandEmpty>Sin resultados.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="max-h-64">
                              {categories.map((c) => {
                                const id = String(c.id);
                                const selected = editCategoryIds.includes(id);
                                return (
                                  <CommandItem
                                    key={id}
                                    value={c.name}
                                    onSelect={() => {
                                      setEditCategoryIds((prev) =>
                                        prev.includes(id)
                                          ? prev.filter((v) => v !== id)
                                          : [...prev, id]
                                      );
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {c.name}
                                  </CommandItem>
                                );
                              })}
                              {categories.length === 0 && (
                                <div className="px-2 py-3 text-xs text-muted-foreground">
                                  Configura categorías en catálogos primero.
                                </div>
                              )}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {editCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {categories
                        .filter((c) => editCategoryIds.includes(String(c.id)))
                        .map((c) => (
                          <Badge
                            key={String(c.id)}
                            variant="secondary"
                            className="text-xs"
                          >
                            {c.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-terms">Términos de Pago</Label>
                  <Select value={editPaymentTermId} onValueChange={(v) => setEditPaymentTermId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTerms.length > 0 ? (
                        paymentTerms.map((t) => (
                          <SelectItem key={String(t.id)} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="1">7 días</SelectItem>
                          <SelectItem value="2">15 días</SelectItem>
                          <SelectItem value="3">30 días</SelectItem>
                          <SelectItem value="4">45 días</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select value={String(editEstado)} onValueChange={(v) => setEditEstado(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Activo</SelectItem>
                      <SelectItem value="0">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-address">Dirección</Label>
                  <Textarea id="edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} rows={3} />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateIsLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
              disabled={updateIsLoading}
              onClick={async () => {
                if (!selectedSupplier) return;

                // Validaciones de campos requeridos
                if (!editName || editName.trim() === "") {
                  toast({
                    title: "Campo requerido",
                    description: "El nombre de la empresa es obligatorio",
                    variant: "destructive"
                  });
                  return;
                }

                if (!editContact || editContact.trim() === "") {
                  toast({
                    title: "Campo requerido",
                    description: "La persona de contacto es obligatoria",
                    variant: "destructive"
                  });
                  return;
                }

                if (!editPhone || editPhone.trim() === "") {
                  toast({
                    title: "Campo requerido",
                    description: "El teléfono es obligatorio",
                    variant: "destructive"
                  });
                  return;
                }

                if (!editEmail || editEmail.trim() === "") {
                  toast({
                    title: "Campo requerido",
                    description: "El email es obligatorio",
                    variant: "destructive"
                  });
                  return;
                }

                // Validar formato de email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(editEmail)) {
                  toast({
                    title: "Email inválido",
                    description: "Por favor ingrese un email válido",
                    variant: "destructive"
                  });
                  return;
                }

                if (!editAddress || editAddress.trim() === "") {
                  toast({
                    title: "Campo requerido",
                    description: "La dirección es obligatoria",
                    variant: "destructive"
                  });
                  return;
                }

                if (!editCategoryIds || editCategoryIds.length === 0) {
                  toast({
                    title: "Campo requerido",
                    description: "Debes seleccionar al menos una categoría",
                    variant: "destructive"
                  });
                  return;
                }

                try {
                  await updateMutateAsync({
                    id: selectedSupplier.id, payload: {
                      name: editName.trim(),
                      contact: editContact.trim(),
                      phone: editPhone.trim(),
                      email: editEmail.trim(),
                      address: editAddress.trim(),
                      category_ids: editCategoryIds.map((id) => Number(id)),
                      payment_terms_id: editPaymentTermId ? Number(editPaymentTermId) : undefined,
                      estado: editEstado,
                    }
                  });
                  setIsEditOpen(false);
                  toast({ title: "Proveedor Actualizado", description: "Los datos del proveedor han sido actualizados exitosamente" });
                } catch (err: unknown) {
                  let message = "No se pudo actualizar el proveedor";
                  if (err && typeof err === "object" && "message" in err) {
                    const m = (err as { message?: unknown }).message;
                    if (m !== undefined) message = String(m) || message;
                  }
                  toast({ title: "Error", description: message });
                }
              }}
            >
              {updateIsLoading ? (
                <svg className="animate-spin w-4 h-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <Edit className="w-4 h-4 mr-2" />
              )}
              {updateIsLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersManagement;