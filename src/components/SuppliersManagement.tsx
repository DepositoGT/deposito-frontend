import { useState, useEffect, useMemo, useRef } from "react";
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
  Building,
  Star,
  Package,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Users
  ,Printer
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useStatuses } from "@/hooks/useStatuses";
import { useCreateSupplier } from "@/hooks/useCreateSupplier";
import { useSupplier } from "@/hooks/useSupplier";
import { useUpdateSupplier } from "@/hooks/useUpdateSupplier";
import { useDeleteSupplier } from "@/hooks/useDeleteSupplier";

const SuppliersManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  const { data: suppliersData, isLoading, isError } = useSuppliers();
  const suppliers: Supplier[] = suppliersData ?? [];
  const { data: categoriesData } = useCategories();
  const { data: paymentTermsData } = usePaymentTerms();
  const { data: statusesData } = useStatuses();

  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const paymentTerms = useMemo(() => paymentTermsData ?? [], [paymentTermsData]);
  const statuses = useMemo(() => statusesData ?? [], [statusesData]);

  const { toast } = useToast();

  // determine if current user is admin (support returning full role or only role_id)
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth:user') : null;
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const isAdmin = parsedUser ? (parsedUser.role?.name === 'admin' || String(parsedUser.role_id) === '1') : false;

  const stats: SupplierStats = {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter((s) => String(s.status) === "active").length,
    totalProducts: suppliers.reduce((sum, s) => sum + ((s.productsList?.length ?? s.products) || 0), 0),
    avgRating: suppliers.length
      ? (
          suppliers.reduce((sum, s) => sum + (Number.isFinite(s.rating) ? s.rating : 0), 0) /
          suppliers.length
        ).toFixed(1)
      : "0.0",
  };

  // form state for new supplier
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string | undefined>(undefined);
  const [newPaymentTermId, setNewPaymentTermId] = useState<string | undefined>(undefined);
  const [newAddress, setNewAddress] = useState("");

  const createSupplierMutation = useCreateSupplier();
  const { mutateAsync: createMutateAsync, isLoading: createIsLoading } = (createSupplierMutation as unknown) as { mutateAsync: (payload: unknown) => Promise<unknown>; isLoading: boolean };

  const [editStatusId, setEditStatusId] = useState<string | undefined>(undefined);
  // edit form fields (controlled)
  const [editName, setEditName] = useState<string>("");
  const [editContact, setEditContact] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);
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
    setEditCategoryId(supplierData.category_id ? String(supplierData.category_id) : undefined);
    setEditPaymentTermId(supplierData.payment_terms_id ? String(supplierData.payment_terms_id) : undefined);
    setEditStatusId(supplierData.status_id ? String(supplierData.status_id) : undefined);
  }, [supplierData]);

  // If statuses list loads after supplierData, ensure the select value is set once both are available
  useEffect(() => {
    if (!supplierData) return;
    if (!statuses || statuses.length === 0) return;
    // only set if we don't already have a value (avoid clobbering manual edits)
    if (!editStatusId && supplierData.status_id != null) {
      setEditStatusId(String(supplierData.status_id));
    }
  }, [supplierData, statuses, editStatusId]);

  // update mutation
  const updateMutation = useUpdateSupplier();
  const { mutateAsync: updateMutateAsync, isLoading: updateIsLoading } = (updateMutation as unknown) as { mutateAsync: (opts: { id: string; payload: Record<string, unknown> }) => Promise<unknown>; isLoading: boolean };

  const handleCreateSupplier = async () => {
    // Validaciones de campos requeridos
    if (!newName || newName.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El nombre de la empresa es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    if (!newContact || newContact.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "La persona de contacto es obligatoria",
        variant: "destructive" 
      });
      return;
    }

    if (!newPhone || newPhone.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El teléfono es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    if (!newEmail || newEmail.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El email es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ 
        title: "Email inválido", 
        description: "Por favor ingrese un email válido",
        variant: "destructive" 
      });
      return;
    }

    if (!newAddress || newAddress.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "La dirección es obligatoria",
        variant: "destructive" 
      });
      return;
    }

    if (!newCategoryId) {
      toast({ 
        title: "Campo requerido", 
        description: "La categoría es obligatoria",
        variant: "destructive" 
      });
      return;
    }

    try {
      await createMutateAsync({
        name: newName.trim(),
        contact: newContact.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        address: newAddress.trim(),
        category_id: Number(newCategoryId),
        payment_terms_id: newPaymentTermId ? Number(newPaymentTermId) : undefined,
      });
  setIsNewSupplierOpen(false);
      // reset form
      setNewName("");
      setNewContact("");
      setNewPhone("");
      setNewEmail("");
      setNewCategoryId(undefined);
      setNewPaymentTermId(undefined);
      setNewAddress("");
  toast({ title: "Proveedor agregado", description: "Proveedor creado correctamente" });
    } catch (err: unknown) {
      let message = "No se pudo crear el proveedor";
        if (err && typeof err === "object" && "message" in err) {
          const m = (err as { message?: unknown }).message;
          if (m !== undefined) message = String(m) || message;
        }
  toast({ title: "Error", description: message });
    }
  };

  const viewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewOpen(true);
  };

  const editSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
  // status will be populated when the supplier details are fetched (useSupplier -> useEffect)
    setIsEditOpen(true);
  };

  const deleteMutation = useDeleteSupplier();
  const { mutateAsync: deleteMutateAsync, isLoading: deleteIsLoading } = (deleteMutation as unknown) as { mutateAsync: (id: string) => Promise<unknown>; isLoading: boolean };

  const deleteSupplier = async (supplierId: string) => {
    try {
      await deleteMutateAsync(supplierId);
      toast({ title: "Proveedor eliminado", description: "El proveedor ha sido eliminado correctamente" });
    } catch (err: unknown) {
      let message = "No se pudo eliminar el proveedor";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message?: unknown }).message;
        if (m !== undefined) message = String(m) || message;
      }
      toast({ title: "Error", description: message });
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-liquor-gold fill-liquor-gold' : 'text-muted-foreground'}`} 
      />
    ));
  };

  const getStatusBadge = (status: string | undefined) => {
    return status === "active" 
      ? <Badge className="bg-liquor-gold text-liquor-bronze">Activo</Badge>
      : <Badge variant="secondary">Inactivo</Badge>;
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(supplier.category).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Proveedores</h2>
          <p className="text-muted-foreground">Administra tus socios comerciales</p>
        </div>
        
        <Dialog open={isNewSupplierOpen} onOpenChange={setIsNewSupplierOpen}>
          <DialogTrigger asChild>
            <Button className="bg-liquor-amber hover:bg-liquor-amber/90 text-white" disabled={!isAdmin}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre de la Empresa</Label>
                  <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Diageo Guatemala" />
                </div>
                <div>
                  <Label htmlFor="contact">Persona de Contacto</Label>
                  <Input id="contact" value={newContact} onChange={(e) => setNewContact(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+502 2345-6789" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="contacto@empresa.com" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newCategoryId} onValueChange={(v) => setNewCategoryId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((c) => (
                          <SelectItem key={String(c.id)} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="1">Whisky/Licores Premium</SelectItem>
                          <SelectItem value="2">Vinos</SelectItem>
                          <SelectItem value="3">Cervezas</SelectItem>
                          <SelectItem value="4">Rones</SelectItem>
                          <SelectItem value="5">Vodkas/Ginebras</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="terms">Términos de Pago</Label>
                  <Select value={newPaymentTermId} onValueChange={(v) => setNewPaymentTermId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar términos" />
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
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea id="address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Dirección completa" rows={3} />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsNewSupplierOpen(false)} disabled={createIsLoading}>
                Cancelar
              </Button>
              <Button className="bg-liquor-amber hover:bg-liquor-amber/90 text-white" disabled={!isAdmin || createIsLoading} onClick={handleCreateSupplier}>
                {createIsLoading ? (
                  <svg className="animate-spin w-4 h-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : (
                  <Building className="w-4 h-4 mr-2" />
                )}
                {createIsLoading ? 'Creando...' : 'Agregar Proveedor'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
              </div>
              <Star className="w-8 h-8 text-liquor-gold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, contacto o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSuppliers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay proveedores para mostrar.
              </CardContent>
            </Card>
          ) : (
            filteredSuppliers.map((supplier, index) => (
              <Card 
                key={supplier.id} 
                className="animate-bounce-in hover:shadow-card transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-foreground">{supplier.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{String(supplier.category)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(String(supplier.status))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información de contacto */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 text-muted-foreground mr-2" />
                      <span className="text-foreground">{supplier.contact}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground mr-2" />
                      <span className="text-foreground">{supplier.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground mr-2" />
                      <span className="text-foreground">{supplier.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
                      <span className="text-foreground">{supplier.address}</span>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{supplier.productsList?.length ?? supplier.products}</p>
                      <p className="text-xs text-muted-foreground">Productos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">Q {supplier.totalPurchases.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Compras</p>
                    </div>
                  </div>

                  {/* Calificación y términos */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1">
                      {getRatingStars(supplier.rating)}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">Pago: {supplier.paymentTerms}</p>
                      <p className="text-xs text-muted-foreground">Último pedido: {supplier.lastOrder}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewSupplier(supplier)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => editSupplier(supplier)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal Ver Proveedor */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between w-full">
                <DialogTitle>Información del Proveedor</DialogTitle>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    // print only the modal content referenced by printRef
                    if (!printRef.current) return;
                    const content = printRef.current.innerHTML;
                    const w = window.open('', '_blank', 'width=800,height=600');
                    if (!w) return;
                    w.document.write(`<!doctype html><html><head><title>Imprimir Proveedor</title><style>body{font-family:Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;} .text-foreground{color:#0f172a} .text-muted-foreground{color:#64748b}</style></head><body>${content}</body></html>`);
                    w.document.close();
                    w.focus();
                    setTimeout(() => { w.print(); w.close(); }, 300);
                  }}>
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div ref={printRef}>
              {selectedSupplier && (
                <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre de la Empresa</Label>
                    <p className="text-foreground font-medium">{selectedSupplier.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Persona de Contacto</Label>
                    <p className="text-foreground font-medium">{selectedSupplier.contact}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Teléfono</Label>
                    <p className="text-foreground font-medium">{selectedSupplier.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-foreground font-medium">{selectedSupplier.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Categoría</Label>
                    <p className="text-foreground font-medium">{String(selectedSupplier.category)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getStatusBadge(String(selectedSupplier.status))}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Términos de Pago</Label>
                    <p className="text-foreground font-medium">{selectedSupplier.paymentTerms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Calificación</Label>
                    <div className="flex items-center space-x-1 mt-1">
                      {getRatingStars(selectedSupplier.rating)}
                      <span className="text-muted-foreground ml-2">({selectedSupplier.rating}/5)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Productos del Proveedor */}
              <div className="space-y-3">
                <Label className="text-lg font-medium">Productos que Suministra</Label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {selectedSupplier.productsList && selectedSupplier.productsList.length > 0 ? (
                    <div className="space-y-2 p-3">
                      {selectedSupplier.productsList.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Stock: {product.stock} unidades</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">Q {product.price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay productos asociados a este proveedor
                    </div>
                  )}
                </div>
              </div>
              
              {/* Dirección */}
              <div>
                <Label className="text-muted-foreground">Dirección</Label>
                <p className="text-foreground font-medium">{selectedSupplier.address}</p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedSupplier.productsList?.length ?? selectedSupplier.products}</p>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">Q {selectedSupplier.totalPurchases.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Compras</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedSupplier.lastOrder}</p>
                  <p className="text-sm text-muted-foreground">Último Pedido</p>
                </div>
              </div>
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>

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
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select value={editCategoryId} onValueChange={(v) => setEditCategoryId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((c) => (
                          <SelectItem key={String(c.id)} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="1">Whisky/Licores Premium</SelectItem>
                          <SelectItem value="2">Vinos</SelectItem>
                          <SelectItem value="3">Cervezas</SelectItem>
                          <SelectItem value="4">Rones/Licores Nacionales</SelectItem>
                          <SelectItem value="5">Vodkas/Ginebras</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
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
                  <Select value={editStatusId} onValueChange={(v) => setEditStatusId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.length > 0 ? (
                        statuses.map((s) => (
                          <SelectItem key={String(s.id)} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="1">Activo</SelectItem>
                          <SelectItem value="2">Inactivo</SelectItem>
                        </>
                      )}
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
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

                if (!editCategoryId) {
                  toast({ 
                    title: "Campo requerido", 
                    description: "La categoría es obligatoria",
                    variant: "destructive" 
                  });
                  return;
                }

                try {
                  await updateMutateAsync({ id: selectedSupplier.id, payload: {
                    name: editName.trim(),
                    contact: editContact.trim(),
                    phone: editPhone.trim(),
                    email: editEmail.trim(),
                    address: editAddress.trim(),
                    category_id: Number(editCategoryId),
                    payment_terms_id: editPaymentTermId ? Number(editPaymentTermId) : undefined,
                    status_id: editStatusId ? Number(editStatusId) : undefined,
                  } });
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
              disabled={updateIsLoading}
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