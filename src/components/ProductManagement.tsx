import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  ScanLine,
  Download,
  MoreVertical,
  QrCode,
  Package,
  DollarSign,
  PackagePlus,
  PackageMinus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Product, NewProductForm, ProductCategory, StockStatus, Supplier } from "@/types";
import { useProducts, PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCategories } from "@/hooks/useCategories";
import { useCreateProduct } from "@/hooks/useCreateProduct";
import { useDeleteProduct } from "@/hooks/useDeleteProduct";
import useUpdateProduct from "@/hooks/useUpdateProduct";
import useAdjustStock from "@/hooks/useAdjustStock";

const ProductManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isViewProductOpen, setIsViewProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [stockAdjustment, setStockAdjustment] = useState({ amount: "", reason: "", type: "add" as "add" | "remove" });
  const { toast } = useToast();
  // import function lazy to avoid circular deps at module-top
  const handleExport = async () => {
    try {
      // dynamic import to keep bundle small
      const svc = await import("@/services/productService");
      await svc.exportProductsPdf();
      toast({ title: "Exportado", description: "El reporte PDF se descargó correctamente" });
    } catch (err: unknown) {
      let message = "No se pudo descargar el reporte";
      if (err && typeof err === "object" && "message" in err) message = String((err as { message?: unknown }).message) || message;
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const { data: productsData, isLoading, isError } = useProducts();
  const { data: suppliersData } = useSuppliers();
  const suppliers = useMemo(() => suppliersData ?? [], [suppliersData]);
  const createProductMutation = useCreateProduct();

  // New Product Form State (client-only for create/edit modals)
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: "",
    category: "",
    brand: "",
    size: "",
    price: "",
    cost: "",
    stock: "",
    minStock: "",
    supplier: "",
    barcode: "",
    description: "",
  });

  // use categories from backend when available; fall back to heuristics
  const { data: categoriesData } = useCategories();
  const categories = useMemo(() => {
    const base = ["all"] as string[];
    if (Array.isArray(categoriesData) && categoriesData.length) {
      return base.concat(categoriesData.map((c) => String(c.name)));
    }
    if (productsData && productsData.length) {
      const set = new Set<string>();
      productsData.forEach((p) => {
        if (p.category) set.add(String(p.category));
      });
      return base.concat(Array.from(set));
    }
    return base.concat(["Whisky", "Vinos", "Cervezas", "Rones", "Vodkas", "Tequilas", "Ginebras"]);
  }, [categoriesData, productsData]);

  const products = useMemo(() => productsData ?? [], [productsData]);
  console.log(products)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // reset page when filters/search change
  useEffect(() => setCurrentPage(1), [searchTerm, categoryFilter, productsData]);

  const getStatusBadge = (product: Product) => {
    if (product.stock === 0 || product.status === "out_of_stock") {
      return <Badge variant="destructive">Sin Stock</Badge>;
    } else if (product.stock <= product.minStock || product.status === "low_stock") {
      return <Badge className="bg-liquor-amber text-liquor-bronze">Stock Bajo</Badge>;
    } else {
      return <Badge className="bg-liquor-gold text-liquor-bronze">Disponible</Badge>;
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        (product.brand || "").toLowerCase().includes(term) ||
        (product.barcode || "").includes(searchTerm);
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Functions
  const generateBarcode = (): string => {
    const code = Date.now().toString().slice(-10);
    setNewProduct((prev) => ({ ...prev, barcode: code }));
    return code;
  };

  const resetForm = () => {
    setNewProduct({
      name: "",
      category: "",
      brand: "",
      size: "",
      price: "",
      cost: "",
      stock: "",
      minStock: "",
      supplier: "",
      barcode: "",
      description: "",
    });
  };

  // The following actions (save/edit/delete/adjust) remain client-side placeholders until backend endpoints exist
  const saveProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price) {
      toast({ title: "Error", description: "Complete los campos requeridos", variant: "destructive" });
      return;
    }

    // prepare payload mapping form values to API shape
    const payload = {
      name: newProduct.name,
      category_id: Number(newProduct.category) || newProduct.category,
      brand: newProduct.brand || undefined,
      size: newProduct.size || undefined,
      stock: newProduct.stock ? Number(newProduct.stock) : 0,
      min_stock: newProduct.minStock ? Number(newProduct.minStock) : 0,
      price: newProduct.price ? Number(newProduct.price) : 0,
      cost: newProduct.cost ? Number(newProduct.cost) : 0,
      supplier_id: newProduct.supplier || undefined,
      barcode: newProduct.barcode || undefined,
      description: newProduct.description || undefined,
      status_id: 1,
    };

    createProductMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Producto creado", description: "El producto fue creado correctamente" });
        resetForm();
        setIsNewProductOpen(false);
      },
      onError: (err: unknown) => {
        let message = "No se pudo crear el producto";
        if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message?: unknown }).message) || message;
        }
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    });
  };

  const viewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewProductOpen(true);
  };

  const editProduct = (product: Product) => {
    setSelectedProduct(product);
    // try to set supplier as supplier id when possible (server provides names in product.supplier)
    let supplierValue: string = String(product.supplier ?? "");
    if (Array.isArray(suppliers) && suppliers.length) {
      const match = suppliers.find((s) => String(s.name).toLowerCase() === String(product.supplier ?? "").toLowerCase());
      if (match) supplierValue = String(match.id);
    }
    // map category name -> category id when categoriesData is present
    let categoryValue: string = String(product.category ?? "");
    if (Array.isArray(categoriesData) && categoriesData.length) {
      const matchCat = categoriesData.find((c) => String(c.name).toLowerCase() === String(product.category ?? "").toLowerCase());
  if (matchCat && (matchCat as { id?: unknown }).id !== undefined) categoryValue = String((matchCat as { id?: unknown }).id);
    }

    setNewProduct({
      name: product.name,
      category: categoryValue,
      brand: product.brand,
      size: product.size,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      supplier: supplierValue,
      barcode: product.barcode,
      description: product.description || "",
    });
    setIsEditProductOpen(true);
  };

  const updateMutation = useUpdateProduct();

  const updateProduct = async () => {
    if (!selectedProduct) return;
    try {
      const payload = {
        id: selectedProduct.id,
        name: newProduct.name,
        category_id: Number(newProduct.category) || newProduct.category,
        brand: newProduct.brand || undefined,
        size: newProduct.size || undefined,
        stock: newProduct.stock ? Number(newProduct.stock) : 0,
        min_stock: newProduct.minStock ? Number(newProduct.minStock) : 0,
        price: newProduct.price ? Number(newProduct.price) : 0,
        cost: newProduct.cost ? Number(newProduct.cost) : 0,
        supplier_id: newProduct.supplier || undefined,
        barcode: newProduct.barcode || undefined,
        description: newProduct.description || undefined,
        status_id: 1,
      };

      await updateMutation.mutateAsync({ id: selectedProduct.id, payload });
      toast({ title: "Producto actualizado", description: "El producto fue actualizado correctamente" });
      resetForm();
      setIsEditProductOpen(false);
      setSelectedProduct(null);
    } catch (err: unknown) {
      let message = "No se pudo actualizar el producto";
      if (err && typeof err === "object" && "message" in err) {
        message = String((err as { message?: unknown }).message) || message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const deleteMutation = useDeleteProduct();
  const { mutateAsync: deleteMutateAsync, isLoading: deleteIsLoading } = (deleteMutation as unknown) as { mutateAsync: (id: string) => Promise<unknown>; isLoading: boolean };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteMutateAsync(productId);
      toast({ title: "Producto eliminado", description: `Producto ${productId} eliminado correctamente` });
    } catch (err: unknown) {
      let message = "No se pudo eliminar el producto";
      if (err && typeof err === "object" && "message" in err) {
        message = String((err as { message?: unknown }).message) || message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // delete confirmation dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const searchByBarcode = () => {
    if (!scannedCode) return;

    const product = products.find((p) => p.barcode === scannedCode);
    if (product) {
      viewProduct(product);
      setIsScannerOpen(false);
      setScannedCode("");
    } else {
      toast({
        title: "Producto No Encontrado",
        description: "No se encontró un producto con ese código",
        variant: "destructive",
      });
    }
  };

  const openStockAdjust = (product: Product) => {
    setSelectedProduct(product);
    setStockAdjustment({ amount: "", reason: "", type: "add" });
    setIsStockAdjustOpen(true);
  };

  const adjustStock = () => {
    if (!selectedProduct || !stockAdjustment.amount || !stockAdjustment.reason) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
      return;
    }
    const amount = parseInt(stockAdjustment.amount);
    if (Number.isNaN(amount)) return;
    // build payload according to backend contract
    const payload: {
      type: "add" | "remove";
      amount: number;
      reason: string;
      supplier_id?: string;
      cost?: number;
    } = {
      type: stockAdjustment.type,
      amount,
      reason: stockAdjustment.reason,
    };

    // include supplier_id and cost when adding stock and supplier is selected
    if (stockAdjustment.type === "add") {
      if (newProduct.supplier) payload.supplier_id = newProduct.supplier;
      if (newProduct.cost) payload.cost = Number(newProduct.cost) || undefined;
    }

    adjustStockMutation.mutate({ id: selectedProduct.id, payload }, {
      onSuccess: () => {
        toast({ title: "Ajuste realizado", description: "El stock fue ajustado correctamente" });
        setIsStockAdjustOpen(false);
        setStockAdjustment({ amount: "", reason: "", type: "add" });
      },
      onError: (err: unknown) => {
        let message = "No se pudo ajustar el stock";
        if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message?: unknown }).message) || message;
        }
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    });
  };

  const adjustStockMutation = useAdjustStock();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Productos</h2>
          <p className="text-muted-foreground">Administra tu catálogo de productos</p>
        </div>
          <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ScanLine className="w-4 h-4 mr-2" />
                Escanear
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, marca o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "Todas las categorías" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="p-6 text-muted-foreground">Cargando productos...</div>
          )}
          {isError && !isLoading && (
            <div className="p-6 text-destructive">Error al cargar productos.</div>
          )}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Producto</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Precio</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No hay productos para mostrar.
                      </td>
                    </tr>
                  ) : (
                    // compute paginated slice
                    (() => {
                      const total = filteredProducts.length;
                      const totalPages = Math.max(1, Math.ceil(total / pageSize));
                      const page = Math.min(currentPage, totalPages);
                      const start = (page - 1) * pageSize;
                      const end = start + pageSize;
                      const paginated = filteredProducts.slice(start, end);
                      return paginated.map((product, index) => (
                      <tr
                        key={product.id}
                        className="border-b border-border hover:bg-muted transition-colors animate-slide-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-foreground">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.brand} • {product.size}
                            </div>
                            <div className="text-xs text-muted-foreground">Código: {product.id}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{String(product.category)}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="font-medium text-foreground">{product.stock}</div>
                          <div className="text-xs text-muted-foreground">Min: {product.minStock}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-medium text-foreground">Q {product.price.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">Costo: Q {product.cost.toFixed(2)}</div>
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(product)}</td>
                        <td className="p-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem className="hover:bg-muted" onClick={() => viewProduct(product)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-muted" onClick={() => editProduct(product)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-muted" onClick={() => openStockAdjust(product)}>
                                <PackagePlus className="w-4 h-4 mr-2" />
                                Ajustar Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-muted" onClick={() => viewProduct(product)}>
                                <ScanLine className="w-4 h-4 mr-2" />
                                Ver Código
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive hover:bg-destructive/10" onClick={() => { setDeleteTargetId(product.id); setIsDeleteDialogOpen(true); }}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      ))
                    })()
                  )}
                </tbody>
              </table>
              {/* Pagination controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Mostrar</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="border rounded px-2 py-1 bg-background text-foreground"
                  >
                    {[5,10,20,50].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span>de {filteredProducts.length} productos</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    className="p-2 rounded border bg-background hover:bg-muted"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* page numbers with simple truncation */}
                  <div className="hidden sm:flex items-center space-x-1">
                    {(() => {
                      const total = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
                      const pages: (number | "...")[] = [];
                      if (total <= 7) {
                        for (let i = 1; i <= total; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        const left = Math.max(2, currentPage - 1);
                        const right = Math.min(total - 1, currentPage + 1);
                        if (left > 2) pages.push("...");
                        for (let i = left; i <= right; i++) pages.push(i);
                        if (right < total - 1) pages.push("...");
                        pages.push(total);
                      }
                      return pages.map((p, idx) => (
                        p === "..." ? (
                          <span key={`dots-${idx}`} className="px-2 text-muted-foreground">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(Number(p))}
                            className={`px-3 py-1 rounded ${currentPage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            {p}
                          </button>
                        )
                      ));
                    })()}
                  </div>

                  <button
                    className="p-2 rounded border bg-background hover:bg-muted"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= Math.ceil(filteredProducts.length / pageSize)}
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escáner de Códigos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <QrCode className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingrese el código de barras manualmente</p>
            </div>
            <div>
              <Label htmlFor="scannedCode">Código de Barras</Label>
              <Input
                id="scannedCode"
                placeholder="7501001234567"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchByBarcode()}
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsScannerOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={searchByBarcode}>
                Buscar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteTargetId(null); setIsDeleteDialogOpen(false); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTargetId) return;
                try {
                  await deleteMutateAsync(deleteTargetId);
                  setIsDeleteDialogOpen(false);
                  setDeleteTargetId(null);
                  toast({ title: "Producto eliminado", description: "El producto fue eliminado correctamente" });
                } catch (err: unknown) {
                  let message = "No se pudo eliminar el producto";
                  if (err && typeof err === "object" && "message" in err) {
                    message = String((err as { message?: unknown }).message) || message;
                  }
                  toast({ title: "Error", description: message, variant: "destructive" });
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Product Dialog */}
      <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  placeholder="Whisky Buchanans 18..."
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select value={newProduct.category} onValueChange={(value) => setNewProduct((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(categoriesData) && categoriesData.length ? (
                      categoriesData.map((c) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))
                    ) : (
                      categories.filter((c) => c !== "all").map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  placeholder="Buchanans"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, brand: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="size">Tamaño</Label>
                <Input
                  id="size"
                  placeholder="750ml"
                  value={newProduct.size}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, size: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="price">Precio de Venta *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                    className="pl-10"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cost">Costo</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    placeholder="0.00"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, cost: e.target.value }))}
                    className="pl-10"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stock">Stock Inicial</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="stock"
                    type="number"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="minStock">Stock Mínimo</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="minStock"
                    type="number"
                    placeholder="0"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, minStock: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="supplier">Proveedor</Label>
              {Array.isArray(suppliersData) && suppliersData.length ? (
                <Select value={newProduct.supplier} onValueChange={(v) => setNewProduct((prev) => ({ ...prev, supplier: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersData.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="supplier"
                  placeholder="Diageo Guatemala"
                  value={newProduct.supplier}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, supplier: e.target.value }))}
                />
              )}
            </div>
            <div>
              <Label htmlFor="barcode">Código de Barras</Label>
              <div className="flex space-x-2">
                <Input
                  id="barcode"
                  placeholder="7501001234567"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, barcode: e.target.value }))}
                />
                <Button type="button" variant="outline" onClick={generateBarcode}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generar
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del producto..."
                value={newProduct.description}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsNewProductOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={saveProduct}>
                Guardar Producto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editName">Nombre del Producto *</Label>
                <Input id="editName" value={newProduct.name} onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="editCategory">Categoría *</Label>
                <Select value={newProduct.category} onValueChange={(value) => setNewProduct((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(categoriesData) && categoriesData.length ? (
                      categoriesData.map((c) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))
                    ) : (
                      categories.filter((c) => c !== "all").map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editBrand">Marca</Label>
                <Input id="editBrand" value={newProduct.brand} onChange={(e) => setNewProduct((prev) => ({ ...prev, brand: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="editSize">Tamaño</Label>
                <Input id="editSize" value={newProduct.size} onChange={(e) => setNewProduct((prev) => ({ ...prev, size: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="editPrice">Precio de Venta *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="editPrice" type="number" value={newProduct.price} onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))} className="pl-10" step="0.01" />
                </div>
              </div>
              <div>
                <Label htmlFor="editCost">Costo</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="editCost" type="number" value={newProduct.cost} onChange={(e) => setNewProduct((prev) => ({ ...prev, cost: e.target.value }))} className="pl-10" step="0.01" />
                </div>
              </div>
              <div>
                <Label htmlFor="editStock">Stock Actual</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="editStock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="editMinStock">Stock Mínimo</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="editMinStock" type="number" value={newProduct.minStock} onChange={(e) => setNewProduct((prev) => ({ ...prev, minStock: e.target.value }))} className="pl-10" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="editSupplier">Proveedor</Label>
              {Array.isArray(suppliersData) && suppliersData.length ? (
                <Select value={newProduct.supplier} onValueChange={(v) => setNewProduct((prev) => ({ ...prev, supplier: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersData.map((s) => (
                      <SelectItem key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="editSupplier" value={newProduct.supplier} onChange={(e) => setNewProduct((prev) => ({ ...prev, supplier: e.target.value }))} />
              )}
            </div>
            <div>
              <Label htmlFor="editBarcode">Código de Barras</Label>
              <Input id="editBarcode" value={newProduct.barcode} onChange={(e) => setNewProduct((prev) => ({ ...prev, barcode: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="editDescription">Descripción</Label>
              <Textarea id="editDescription" value={newProduct.description} onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditProductOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={updateProduct}>
                Actualizar Producto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Producto</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <div className="font-medium">{selectedProduct.name}</div>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <div>
                    <Badge variant="outline">{String(selectedProduct.category)}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Marca</Label>
                  <div className="font-medium">{selectedProduct.brand}</div>
                </div>
                <div>
                  <Label>Tamaño</Label>
                  <div className="font-medium">{selectedProduct.size}</div>
                </div>
                <div>
                  <Label>Precio de Venta</Label>
                  <div className="font-medium text-primary">Q {selectedProduct.price.toFixed(2)}</div>
                </div>
                <div>
                  <Label>Costo</Label>
                  <div className="font-medium">Q {selectedProduct.cost.toFixed(2)}</div>
                </div>
                <div>
                  <Label>Stock Actual</Label>
                  <div className="font-medium">{selectedProduct.stock} unidades</div>
                </div>
                <div>
                  <Label>Stock Mínimo</Label>
                  <div className="font-medium">{selectedProduct.minStock} unidades</div>
                </div>
              </div>

              <div>
                <Label>Proveedor</Label>
                <div className="font-medium">{selectedProduct.supplier}</div>
              </div>

              <div>
                <Label>Código de Barras</Label>
                <div className="flex items-center space-x-2">
                  <code className="bg-muted px-2 py-1 rounded">{selectedProduct.barcode}</code>
                  <QrCode className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>

              {selectedProduct.description && (
                <div>
                  <Label>Descripción</Label>
                  <div className="text-muted-foreground">{selectedProduct.description}</div>
                </div>
              )}

              <div>
                <Label>Estado</Label>
                <div>{getStatusBadge(selectedProduct)}</div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Margen de Ganancia:</span>
                    <div className="font-medium">
                      Q {(selectedProduct.price - selectedProduct.cost).toFixed(2)} (
                      {(((selectedProduct.price - selectedProduct.cost) / selectedProduct.price) * 100).toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor de Inventario:</span>
                    <div className="font-medium">Q {(selectedProduct.stock * selectedProduct.cost).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockAdjustOpen} onOpenChange={setIsStockAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium">{selectedProduct.name}</h3>
                <p className="text-sm text-muted-foreground">Stock actual: {selectedProduct.stock} unidades</p>
              </div>

              <div>
                <Label>Tipo de Ajuste</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant={stockAdjustment.type === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockAdjustment((prev) => ({ ...prev, type: "add" }))}
                    className="flex-1"
                  >
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                  <Button
                    variant={stockAdjustment.type === "remove" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStockAdjustment((prev) => ({ ...prev, type: "remove" }))}
                    className="flex-1"
                  >
                    <PackageMinus className="w-4 h-4 mr-2" />
                    Quitar
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Cantidad</Label>
                <Input id="amount" type="number" placeholder="Ingrese cantidad" value={stockAdjustment.amount} onChange={(e) => setStockAdjustment((prev) => ({ ...prev, amount: e.target.value }))} />
              </div>

              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Textarea id="reason" placeholder="Ej: Recepción de mercancía, producto dañado, etc." value={stockAdjustment.reason} onChange={(e) => setStockAdjustment((prev) => ({ ...prev, reason: e.target.value }))} rows={3} />
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsStockAdjustOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={adjustStock}>
                  Confirmar Ajuste
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;