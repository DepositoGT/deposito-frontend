import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Calendar,
  DollarSign,
  User,
  Package,
  Receipt,
  Eye,
  Edit,
  Trash2,
  X,
  Calculator,
  Minus
} from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Sale, CartProduct, AvailableProduct, PaymentMethod, SaleStatus } from "@/types";
import { useSalesByStatus } from "@/hooks/useSales";

const SalesManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [isViewSaleOpen, setIsViewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // New Sale Form States
  const [customer, setCustomer] = useState("");
  const [customerNit, setCustomerNit] = useState("");
  const [isFinalConsumer, setIsFinalConsumer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const { toast } = useToast();

  const availableProducts: AvailableProduct[] = [
    { id: "P001", name: "Whisky Buchanans 18 Años", price: 850.00, stock: 15, barcode: "7501001234567" },
    { id: "P002", name: "Vino Tinto Reserva", price: 280.00, stock: 8, barcode: "8410001234568" },
    { id: "P003", name: "Cerveza Gallo 355ml", price: 8.50, stock: 120, barcode: "7501234567890" },
    { id: "P004", name: "Ron Zacapa 23", price: 950.00, stock: 5, barcode: "7501987654321" },
    { id: "P005", name: "Vodka Absolut", price: 320.00, stock: 28, barcode: "7591234567801" }
  ];

  // No local mock sales: data is fetched per-status from the API
  // per-status page state for backend pagination
  const [pages, setPages] = useState<Record<string, number>>({
    pending: 1,
    paid: 1,
    completed: 1,
    cancelled: 1,
  });

  const statusesMap: { key: string; dbName: string }[] = [
  { key: 'paid', dbName: 'Pagado' },
  { key: 'pending', dbName: 'Pendiente' },
  { key: 'completed', dbName: 'Completada' },
  { key: 'cancelled', dbName: 'Cancelada' },
  ];

  // Explicit hooks per status (must be top-level hooks)
  const completedQuery = useSalesByStatus('Completada', { period: selectedPeriod, page: pages.completed, pageSize: 10 });
  const pendingQuery = useSalesByStatus('Pendiente', { period: selectedPeriod, page: pages.pending, pageSize: 10 });
  const cancelledQuery = useSalesByStatus('Cancelada', { period: selectedPeriod, page: pages.cancelled, pageSize: 10 });
  const paidQuery = useSalesByStatus('Pagado', { period: selectedPeriod, page: pages.paid, pageSize: 10 });

  // Typed shape for the paginated response from /api/sales
  type PaginatedSales = {
    items: Sale[];
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    nextPage?: number;
    prevPage?: number;
  };

  const completedData = completedQuery.data as PaginatedSales | undefined;
  const pendingData = pendingQuery.data as PaginatedSales | undefined;
  const cancelledData = cancelledQuery.data as PaginatedSales | undefined;
  const paidData = paidQuery.data as PaginatedSales | undefined;

  // Normalize raw API sale object to frontend `Sale` shape
  const mapStatusNameToKey = (name?: string) => {
    if (!name) return 'pending';
    const n = name.toLowerCase();
    if (n.includes('complet')) return 'completed';
    if (n.includes('pend')) return 'pending';
    if (n.includes('cancel')) return 'cancelled';
    if (n.includes('pag')) return 'paid';
    return 'pending';
  };

  const normalizeRawSale = (raw: unknown): Sale => {
    const r = raw as Record<string, unknown>;
    const saleItems = Array.isArray(r.sale_items) ? r.sale_items : [];
    const products = saleItems.map((si: unknown) => {
      const s = si as Record<string, unknown>;
      const prod = (s.product as Record<string, unknown>) ?? {};
      const id = s.product_id ?? s.id ?? prod.id ?? '';
      const name = prod.name ?? s.name ?? s.product_name ?? 'Producto';
      const priceRaw = s.price ?? s.unit_price ?? prod.price ?? 0;
      const price = parseFloat(String(priceRaw)) || 0;
      const qty = (s.qty ?? s.quantity ?? s.amount ?? 1) as number;
      return {
        id: String(id),
        name: String(name),
        price,
        qty,
      };
    });

  const totalRaw = r.total ?? r.total_amount ?? '0';
  const totalNum = typeof totalRaw === 'number' ? totalRaw : parseFloat(String(totalRaw)) || 0;

    const paymentObj = r.payment_method as Record<string, unknown> | undefined;
    const statusObj = r.status as Record<string, unknown> | undefined;

    return {
      id: String(r.id ?? ''),
      date: String(r.sold_at ?? r.date ?? ''),
      customer: String(r.customer ?? ''),
      customerNit: r.customer_nit ?? r.customerNit ?? undefined,
      isFinalConsumer: Boolean(r.is_final_consumer ?? r.isFinalConsumer ?? false),
      total: totalNum,
      items: r.items ?? products.length,
      payment: String(paymentObj?.name ?? r.payment_method ?? r.payment) as PaymentMethod,
      status: mapStatusNameToKey(String(statusObj?.name ?? r.status ?? r.status_id)) as SaleStatus,
      amountReceived: parseFloat(String(r.amount_received ?? r.amountReceived ?? '0')) || 0,
      change: parseFloat(String(r.change ?? '0')) || 0,
      products,
    } as Sale;
  };

  console.log(completedData)

  const todaysStats = {
    totalSales: 2445.00,
    transactions: 12,
    avgTicket: 203.75,
    topPayment: "Efectivo"
  };

  const formatMoney = (value: unknown) => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : NaN);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pendiente</Badge>;
      case "paid":
        return <Badge className="bg-blue-500 text-white">Pagado</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  // Product search for new sale
  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.barcode.includes(productSearch)
  );

  // Sales filtering
  const filterClient = (items: Sale[] = []) => items.filter((sale) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      String(sale.id).toLowerCase().includes(term) ||
      String(sale.customer || '').toLowerCase().includes(term) ||
      String(sale.customerNit || '').toLowerCase().includes(term)
    );
    const matchesPayment = paymentFilter === 'all' || sale.payment === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  // Build salesByStatus from API responses and apply client-side search/payment filters
  const salesByStatus: Record<string, Sale[]> = {
    pending: filterClient((pendingData?.items ?? []).map(normalizeRawSale)),
    paid: filterClient((paidData?.items ?? []).map(normalizeRawSale)),
    completed: filterClient((completedData?.items ?? []).map(normalizeRawSale)),
    cancelled: filterClient((cancelledData?.items ?? []).map(normalizeRawSale)),
  };

  const pageInfoByStatus = {
    pending: { page: pendingData?.page ?? pages.pending, totalPages: pendingData?.totalPages ?? 1 },
    paid: { page: paidData?.page ?? pages.paid, totalPages: paidData?.totalPages ?? 1 },
    completed: { page: completedData?.page ?? pages.completed, totalPages: completedData?.totalPages ?? 1 },
    cancelled: { page: cancelledData?.page ?? pages.cancelled, totalPages: cancelledData?.totalPages ?? 1 },
  };

  const setPageFor = (key: string, newPage: number) => {
    setPages(prev => ({ ...prev, [key]: newPage }));
  };

  const statusLabels = {
    pending: "Pendientes",
    paid: "Pagadas", 
    completed: "Completadas",
    cancelled: "Canceladas"
  };

  // Calculate totals
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const changeAmount = paymentMethod === "cash" && amountReceived ? 
    Math.max(0, parseFloat(amountReceived) - cartTotal) : 0;

  // Functions
  const addToCart = (product: AvailableProduct) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id 
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, qty: 1 }]);
    }
    setProductSearch("");
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.id === productId ? { ...item, qty: newQty } : item
      ));
    }
  };

  const processSale = () => {
    toast({
      title: "Funcionalidad en progreso",
      description: "La creación de ventas aún no está implementada en la API. Pronto estará disponible.",
      variant: "default",
    });
    setIsNewSaleOpen(false);
  };

  const updateSaleStatus = (saleId: string, newStatus: SaleStatus) => {
    toast({
      title: "Funcionalidad en progreso",
      description: "Actualizar el estado de una venta requiere llamada a la API. Implementación pendiente.",
      variant: "default",
    });
  };

  const viewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsViewSaleOpen(true);
  };

  const deleteSale = (saleId: string) => {
    toast({
      title: "Funcionalidad en progreso",
      description: "Eliminar ventas requiere llamada a la API. Implementación pendiente.",
      variant: "default",
    });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Ventas</h2>
          <p className="text-muted-foreground">Control completo de transacciones</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Venta</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Customer and Payment Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer">Cliente *</Label>
                      <Input 
                        id="customer" 
                        placeholder="Nombre del cliente"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment">Método de Pago *</Label>
                      <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* NIT and CF fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerNit">NIT del Cliente</Label>
                      <Input 
                        id="customerNit" 
                        placeholder="12345678-9"
                        value={customerNit}
                        onChange={(e) => setCustomerNit(e.target.value)}
                        disabled={isFinalConsumer}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="isFinalConsumer"
                        checked={isFinalConsumer}
                        onChange={(e) => {
                          setIsFinalConsumer(e.target.checked);
                          if (e.target.checked) {
                            setCustomerNit("");
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isFinalConsumer" className="text-sm">
                        Consumidor Final (CF)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Product Search */}
                <div>
                  <Label>Buscar Productos</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o código de barras..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {productSearch && (
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                      {filteredProducts.map(product => (
                        <div key={product.id} className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                             onClick={() => addToCart(product)}>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">Q {product.price.toFixed(2)} • Stock: {product.stock}</div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Items */}
                <div>
                  <Label>Productos en Venta ({cartItems.length})</Label>
                  <div className="border rounded-lg">
                    {cartItems.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No hay productos agregados
                      </div>
                    ) : (
                      <div className="divide-y">
                        {cartItems.map(item => (
                          <div key={item.id} className="p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">Q {item.price.toFixed(2)} c/u</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.qty - 1)}>
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center">{item.qty}</span>
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.qty + 1)}>
                                <Plus className="w-4 h-4" />
                              </Button>
                              <div className="w-20 text-right font-medium">Q {(item.price * item.qty).toFixed(2)}</div>
                              <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Calculation */}
                {cartItems.length > 0 && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>Q {cartTotal.toFixed(2)}</span>
                    </div>
                    
                    {paymentMethod === "cash" && (
                      <>
                        <div>
                          <Label htmlFor="amountReceived">Monto Recibido</Label>
                          <div className="relative">
                            <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="amountReceived"
                              type="number"
                              placeholder="0.00"
                              value={amountReceived}
                              onChange={(e) => setAmountReceived(e.target.value)}
                              className="pl-10"
                              step="0.01"
                            />
                          </div>
                        </div>
                        {amountReceived && parseFloat(amountReceived) >= cartTotal && (
                          <div className="flex justify-between text-lg font-bold text-primary">
                            <span>Vuelto:</span>
                            <span>Q {changeAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewSaleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-gradient-primary"
                    onClick={processSale}
                    disabled={cartItems.length === 0}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Procesar Venta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                <p className="text-2xl font-bold text-foreground">Q {todaysStats.totalSales.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-liquor-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold text-foreground">{todaysStats.transactions}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-2xl font-bold text-foreground">Q {todaysStats.avgTicket.toFixed(2)}</p>
              </div>
              <Receipt className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pago Preferido</p>
                <p className="text-2xl font-bold text-foreground">{todaysStats.topPayment}</p>
              </div>
              <User className="w-8 h-8 text-liquor-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente o NIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={(value: SaleStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={paymentFilter} onValueChange={(value: PaymentMethod | "all") => setPaymentFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ventas por Estado (API-driven, paginadas por estado) */}
      <div className="space-y-6">
  {(['paid','pending','completed','cancelled'] as const).map((key) => {
          const salesInStatus = salesByStatus[key];
          const info = pageInfoByStatus[key as keyof typeof pageInfoByStatus];
          const isLoading = {
            completed: completedQuery.isLoading,
            pending: pendingQuery.isLoading,
            cancelled: cancelledQuery.isLoading,
            paid: paidQuery.isLoading,
          }[key];

          return (
            <Card key={key} className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(key as SaleStatus)}
                    <span>{statusLabels[key as keyof typeof statusLabels]} ({salesInStatus.length})</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{isLoading ? 'Cargando...' : `Página ${info.page}/${info.totalPages}`}</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesInStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ventas {statusLabels[key as keyof typeof statusLabels].toLowerCase()}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-medium text-muted-foreground">ID Venta</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Fecha/Hora</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Items</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Pago</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesInStatus.map((sale, index) => (
                          <tr 
                            key={sale.id} 
                            className="border-b border-border hover:bg-muted transition-colors animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="p-3">
                              <span className="font-medium text-primary">{sale.id}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-foreground">{sale.date}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-foreground">{sale.customer}</div>
                              <div className="text-xs text-muted-foreground">
                                {sale.isFinalConsumer ? "CF" : sale.customerNit}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-foreground">{sale.items}</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-medium text-foreground">Q {formatMoney(sale.total)}</span>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">{sale.payment}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Select value={sale.status} onValueChange={(value: SaleStatus) => updateSaleStatus(sale.id, value)}>
                                <SelectTrigger className="w-32">
                                  {getStatusBadge(sale.status)}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendiente</SelectItem>
                                  <SelectItem value="paid">Pagado</SelectItem>
                                  <SelectItem value="completed">Completado</SelectItem>
                                  <SelectItem value="cancelled">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => viewSale(sale)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSale(sale.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <div className="flex justify-end items-center gap-2 p-4">
                <Button
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                  onClick={() => setPageFor(key, Math.max(1, info.page - 1))}
                  disabled={info.page <= 1}
                  aria-label={`Anterior ${key}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                  onClick={() => setPageFor(key, Math.min(info.totalPages, info.page + 1))}
                  disabled={info.page >= info.totalPages}
                  aria-label={`Siguiente ${key}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* View Sale Detail Dialog */}
      <Dialog open={isViewSaleOpen} onOpenChange={setIsViewSaleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta {selectedSale?.id}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <div className="font-medium">{selectedSale.customer}</div>
                </div>
                <div>
                  <Label>NIT / Tipo</Label>
                  <div className="font-medium">
                    {selectedSale.isFinalConsumer ? "Consumidor Final" : selectedSale.customerNit}
                  </div>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <div className="font-medium">{selectedSale.date}</div>
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <div className="font-medium">{selectedSale.payment}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div>{getStatusBadge(selectedSale.status)}</div>
                </div>
              </div>
              
              <div>
                <Label>Productos</Label>
                <div className="border rounded-lg divide-y">
                  {selectedSale.products.map((product: CartProduct, index: number) => (
                    <div key={index} className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">Cantidad: {product.qty}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">Q {(product.price * product.qty).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Q {product.price.toFixed(2)} c/u</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Q {formatMoney(selectedSale.total)}</span>
                </div>
                {selectedSale.payment === "Efectivo" && (
                  <>
                    <div className="flex justify-between">
                      <span>Monto Recibido:</span>
                      <span>Q {formatMoney(selectedSale.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Vuelto:</span>
                      <span>Q {formatMoney(selectedSale.change)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>Q {formatMoney(selectedSale.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesManagement;