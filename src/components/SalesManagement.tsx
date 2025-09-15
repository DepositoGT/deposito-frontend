import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Search, ShoppingCart, Calendar, DollarSign, User, Receipt, Eye, Trash2, X, Calculator, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Sale, CartProduct, PaymentMethod, SaleStatus } from '@/types';
import type { Product } from '@/types/product';
import { useProducts } from '@/hooks/useProducts';
import { useSalesByStatus } from '@/hooks/useSales';
import { createSale } from '@/services/saleService';
import { updateSaleStatus as apiUpdateSaleStatus } from '@/services/salesService';
import { useRealtimeSales } from '@/hooks/useRealtimeSales';
import { useAuth } from '@/context/useAuth';

const SalesManagement = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isViewSaleOpen, setIsViewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // New sale form
  const [customer, setCustomer] = useState('');
  const [customerNit, setCustomerNit] = useState('');
  const [isFinalConsumer, setIsFinalConsumer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  // Data
  const productsQuery = useProducts();
  const availableProducts = productsQuery.data ?? [];

  const [pages, setPages] = useState<Record<string, number>>({
    pending: 1,
    paid: 1,
    completed: 1,
    cancelled: 1,
  });

  const statusesMap: { key: string; dbName: string }[] = useMemo(() => ([
    { key: 'paid', dbName: 'Pagado' },
    { key: 'pending', dbName: 'Pendiente' },
    { key: 'completed', dbName: 'Completada' },
    { key: 'cancelled', dbName: 'Cancelada' },
  ]), []);

  // Queries per status
  const completedQuery = useSalesByStatus('Completada', { period: selectedPeriod, page: pages.completed, pageSize: 10 });
  const pendingQuery = useSalesByStatus('Pendiente', { period: selectedPeriod, page: pages.pending, pageSize: 10 });
  const cancelledQuery = useSalesByStatus('Cancelada', { period: selectedPeriod, page: pages.cancelled, pageSize: 10 });
  const paidQuery = useSalesByStatus('Pagado', { period: selectedPeriod, page: pages.paid, pageSize: 10 });

  const refreshSales = () => {
    completedQuery.refetch?.();
    pendingQuery.refetch?.();
    paidQuery.refetch?.();
    cancelledQuery.refetch?.();
  };

  type RealtimeSale = { id: string; customer?: string | null; total?: number | string };
  useRealtimeSales((newSale: RealtimeSale) => {
    if (!isAuthenticated) return;
    toast({
      title: 'Nueva venta registrada',
      description: `Cliente: ${newSale.customer || 'Consumidor Final'} | Total: Q ${parseFloat(String(newSale.total || 0)).toFixed(2)}`,
      variant: 'default'
    });
    refreshSales();
  }, {
    onUpdate: (updated) => {
      if (!isAuthenticated) return;
      // Simple heuristic: show toast when status_id cambia (el row incluye status_id actualizado)
      toast({
        title: 'Venta actualizada',
        description: `Venta ${updated.id} cambió de estado`,
        variant: 'default'
      });
      refreshSales();
    }
  });

  type PaginatedSales = { items: Sale[]; page: number; pageSize: number; totalPages: number; totalItems: number; nextPage?: number; prevPage?: number };
  const completedData = completedQuery.data as PaginatedSales | undefined;
  const pendingData = pendingQuery.data as PaginatedSales | undefined;
  const cancelledData = cancelledQuery.data as PaginatedSales | undefined;
  const paidData = paidQuery.data as PaginatedSales | undefined;

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
      return { id: String(id), name: String(name), price, qty };
    });
    const totalRaw = r.total ?? r.total_amount ?? '0';
    const totalNum = typeof totalRaw === 'number' ? totalRaw : parseFloat(String(totalRaw)) || 0;
    const paymentObj = r.payment_method as Record<string, unknown> | undefined;
    const statusObj = r.status as Record<string, unknown> | undefined;
    const customerNit = ((): string | undefined => {
      if (typeof r.customer_nit === 'string') return r.customer_nit;
      if (typeof (r as Record<string, unknown>).customerNit === 'string') return (r as Record<string, unknown>).customerNit as string;
      return undefined;
    })();
    const isFinalConsumer = Boolean(
      typeof r.is_final_consumer === 'boolean' ? r.is_final_consumer :
      typeof (r as Record<string, unknown>).isFinalConsumer === 'boolean' ? (r as Record<string, unknown>).isFinalConsumer : false
    );
    const payment = ((): PaymentMethod => {
      const val = paymentObj?.name ?? r.payment_method ?? (r as Record<string, unknown>).payment;
      return String(val || '') as PaymentMethod;
    })();
    const status = ((): SaleStatus => {
      const raw = statusObj?.name ?? r.status ?? (r as Record<string, unknown>).status_id;
      return mapStatusNameToKey(typeof raw === 'string' ? raw : String(raw || '')) as SaleStatus;
    })();
    const amountReceived = parseFloat(String(r.amount_received ?? (r as Record<string, unknown>).amountReceived ?? '0')) || 0;
    const change = parseFloat(String(r.change ?? '0')) || 0;
    return {
      id: String(r.id ?? ''),
      date: String(r.sold_at ?? r.date ?? ''),
      customer: String(r.customer ?? ''),
      customerNit,
      isFinalConsumer,
      total: totalNum,
      items: (r.items as number) ?? products.length,
      payment,
      status,
      amountReceived,
      change,
      products,
    } as Sale;
  };

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode ?? '').includes(productSearch)
  );

  const filterClient = (items: Sale[] = []) => items.filter(sale => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || [sale.id, sale.customer || '', sale.customerNit || ''].some(v => String(v).toLowerCase().includes(term));
    const matchesPayment = paymentFilter === 'all' || sale.payment === paymentFilter;
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesPayment && matchesStatus;
  });

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

  const setPageFor = (key: string, newPage: number) => setPages(prev => ({ ...prev, [key]: newPage }));

  const statusLabels = { pending: 'Pendientes', paid: 'Pagadas', completed: 'Completadas', cancelled: 'Canceladas' };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const changeAmount = paymentMethod === 'cash' && amountReceived ? Math.max(0, parseFloat(amountReceived) - cartTotal) : 0;

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    setProductSearch('');
  };
  const removeFromCart = (productId: string) => setCartItems(prev => prev.filter(i => i.id !== productId));
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) return removeFromCart(productId);
    setCartItems(prev => prev.map(i => i.id === productId ? { ...i, qty: newQty } : i));
  };

  const processSale = async () => {
    const paymentMethodId = 1; // TODO: map real payment method IDs
    const salePayload = {
      customer,
      customer_nit: customerNit,
      is_final_consumer: isFinalConsumer,
      payment_method_id: paymentMethodId,
      status_id: 0, // placeholder: backend lo ignora y asigna 'Pendiente'; ajustar tipo CreateSalePayload si se vuelve opcional
      items: cartItems.map(item => ({ product_id: item.id, price: item.price, qty: item.qty })),
    };
    try {
      await createSale(salePayload);
      toast({ title: 'Venta registrada', description: 'La venta se ha registrado correctamente.', variant: 'default' });
      refreshSales();
      setIsNewSaleOpen(false);
      setCartItems([]); setCustomer(''); setCustomerNit(''); setPaymentMethod(''); setAmountReceived('');
    } catch (e) {
      toast({ title: 'Error al registrar venta', description: (e as Error)?.message || 'No se pudo registrar la venta.', variant: 'destructive' });
    }
  };

  const [updatingSaleIds, setUpdatingSaleIds] = useState<Set<string>>(new Set());
  const updateSaleStatus = async (saleId: string, newStatus: SaleStatus) => {
    if (!saleId) return;
    // Mapping UI status to backend sale_statuses names
    const backendNameMap: Record<SaleStatus, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };
    const status_name = backendNameMap[newStatus];
    setUpdatingSaleIds(prev => new Set(prev).add(saleId));
    try {
      await apiUpdateSaleStatus(saleId, { status_name });
      toast({ title: 'Estado actualizado', description: `Venta ${saleId} ahora está '${status_name}'`, variant: 'default' });
      refreshSales();
    } catch (e) {
      toast({ title: 'Error al cambiar estado', description: (e as Error).message || 'No se pudo actualizar.', variant: 'destructive' });
    } finally {
      setUpdatingSaleIds(prev => { const n = new Set(prev); n.delete(saleId); return n; });
    }
  };
  const viewSale = (sale: Sale) => { setSelectedSale(sale); setIsViewSaleOpen(true); };
  const deleteSale = (saleId: string) => toast({ title: 'Funcionalidad en progreso', description: 'Implementación pendiente.', variant: 'default' });

  const formatMoney = (value: unknown) => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : NaN);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case 'pending': return <Badge className='bg-yellow-500 text-white'>Pendiente</Badge>;
      case 'paid': return <Badge className='bg-blue-500 text-white'>Pagado</Badge>;
      case 'completed': return <Badge className='bg-green-500 text-white'>Completado</Badge>;
      case 'cancelled': return <Badge variant='destructive'>Cancelado</Badge>;
      default: return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  return (
    <div className='p-6 space-y-6 animate-fade-in'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Gestión de Ventas</h2>
          <p className='text-muted-foreground'>Control completo de transacciones</p>
        </div>
        <div className='flex space-x-2'>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className='w-48'>
              <Calendar className='w-4 h-4 mr-2' />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='today'>Hoy</SelectItem>
              <SelectItem value='week'>Esta semana</SelectItem>
              <SelectItem value='month'>Este mes</SelectItem>
              <SelectItem value='year'>Este año</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
            <DialogTrigger asChild>
              <Button className='bg-gradient-primary hover:opacity-90'>
                <Plus className='w-4 h-4 mr-2' /> Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
              <DialogHeader><DialogTitle>Registrar Nueva Venta</DialogTitle></DialogHeader>
              <div className='space-y-6'>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='customer'>Cliente *</Label>
                      <Input id='customer' placeholder='Nombre del cliente' value={customer} onChange={e => setCustomer(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor='payment'>Método de Pago *</Label>
                      <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                        <SelectTrigger><SelectValue placeholder='Seleccionar método' /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value='cash'>Efectivo</SelectItem>
                          <SelectItem value='card'>Tarjeta</SelectItem>
                          <SelectItem value='transfer'>Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='customerNit'>NIT del Cliente</Label>
                      <Input id='customerNit' placeholder='12345678-9' value={customerNit} onChange={e => setCustomerNit(e.target.value)} disabled={isFinalConsumer} />
                    </div>
                    <div className='flex items-center space-x-2 pt-6'>
                      <input type='checkbox' id='isFinalConsumer' checked={isFinalConsumer} onChange={e => { setIsFinalConsumer(e.target.checked); if (e.target.checked) setCustomerNit(''); }} className='w-4 h-4' />
                      <Label htmlFor='isFinalConsumer' className='text-sm'>Consumidor Final (CF)</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Buscar Productos</Label>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                    <Input placeholder='Buscar por nombre o código de barras...' value={productSearch} onChange={e => setProductSearch(e.target.value)} className='pl-10' />
                  </div>
                  {productSearch && (
                    <div className='mt-2 max-h-40 overflow-y-auto border rounded-lg'>
                      {productsQuery.isLoading ? (
                        <div className='p-4 text-center text-muted-foreground'>Cargando productos...</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className='p-4 text-center text-muted-foreground'>No se encontraron productos</div>
                      ) : filteredProducts.map(product => (
                        <div key={product.id} className='p-2 hover:bg-muted cursor-pointer flex justify-between items-center' onClick={() => addToCart(product)}>
                          <div>
                            <div className='font-medium'>{product.name}</div>
                            <div className='text-sm text-muted-foreground'>Q {Number(product.price).toFixed(2)} • Stock: {product.stock}</div>
                          </div>
                          <Button size='sm' variant='outline'><Plus className='w-4 h-4' /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Productos en Venta ({cartItems.length})</Label>
                  <div className='border rounded-lg'>
                    {cartItems.length === 0 ? (
                      <div className='p-4 text-center text-muted-foreground'>No hay productos agregados</div>
                    ) : (
                      <div className='divide-y'>
                        {cartItems.map(item => (
                          <div key={item.id} className='p-3 flex items-center justify-between'>
                            <div className='flex-1'>
                              <div className='font-medium'>{item.name}</div>
                              <div className='text-sm text-muted-foreground'>Q {item.price.toFixed(2)} c/u</div>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <Button size='sm' variant='outline' onClick={() => updateQuantity(item.id, item.qty - 1)}><Minus className='w-4 h-4' /></Button>
                              <span className='w-8 text-center'>{item.qty}</span>
                              <Button size='sm' variant='outline' onClick={() => updateQuantity(item.id, item.qty + 1)}><Plus className='w-4 h-4' /></Button>
                              <div className='w-20 text-right font-medium'>Q {(item.price * item.qty).toFixed(2)}</div>
                              <Button size='sm' variant='ghost' onClick={() => removeFromCart(item.id)}><X className='w-4 h-4' /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {cartItems.length > 0 && (
                  <div className='bg-muted/50 p-4 rounded-lg space-y-3'>
                    <div className='flex justify-between text-lg font-bold'><span>Total:</span><span>Q {cartTotal.toFixed(2)}</span></div>
                    {paymentMethod === 'cash' && (
                      <>
                        <div>
                          <Label htmlFor='amountReceived'>Monto Recibido</Label>
                          <div className='relative'>
                            <Calculator className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                            <Input id='amountReceived' type='number' placeholder='0.00' value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className='pl-10' step='0.01' />
                          </div>
                        </div>
                        {amountReceived && parseFloat(amountReceived) >= cartTotal && (
                          <div className='flex justify-between text-lg font-bold text-primary'><span>Vuelto:</span><span>Q {changeAmount.toFixed(2)}</span></div>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div className='flex justify-end space-x-2'>
                  <Button variant='outline' onClick={() => setIsNewSaleOpen(false)}>Cancelar</Button>
                  <Button className='bg-gradient-primary' onClick={processSale} disabled={cartItems.length === 0}>
                    <Receipt className='w-4 h-4 mr-2' /> Procesar Venta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats quick (placeholder) */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card><CardContent className='p-6'><div className='flex items-center justify-between'><div><p className='text-sm text-muted-foreground'>Ventas Hoy</p><p className='text-2xl font-bold text-foreground'>Q 0.00</p></div><DollarSign className='w-8 h-8 text-liquor-gold' /></div></CardContent></Card>
        <Card><CardContent className='p-6'><div className='flex items-center justify-between'><div><p className='text-sm text-muted-foreground'>Transacciones</p><p className='text-2xl font-bold text-foreground'>0</p></div><ShoppingCart className='w-8 h-8 text-primary' /></div></CardContent></Card>
        <Card><CardContent className='p-6'><div className='flex items-center justify-between'><div><p className='text-sm text-muted-foreground'>Ticket Promedio</p><p className='text-2xl font-bold text-foreground'>Q 0.00</p></div><Receipt className='w-8 h-8 text-accent' /></div></CardContent></Card>
        <Card><CardContent className='p-6'><div className='flex items-center justify-between'><div><p className='text-sm text-muted-foreground'>Pago Preferido</p><p className='text-2xl font-bold text-foreground'>Efectivo</p></div><User className='w-8 h-8 text-liquor-burgundy' /></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input placeholder='Buscar por ID, cliente o NIT...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='pl-10' />
            </div>
            <div className='w-48'>
              <Select value={statusFilter} onValueChange={(v: SaleStatus | 'all') => setStatusFilter(v)}>
                <SelectTrigger><SelectValue placeholder='Estado' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='pending'>Pendiente</SelectItem>
                  <SelectItem value='paid'>Pagado</SelectItem>
                  <SelectItem value='completed'>Completado</SelectItem>
                  <SelectItem value='cancelled'>Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='w-48'>
              <Select value={paymentFilter} onValueChange={(v: PaymentMethod | 'all') => setPaymentFilter(v)}>
                <SelectTrigger><SelectValue placeholder='Método de Pago' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los métodos</SelectItem>
                  <SelectItem value='Efectivo'>Efectivo</SelectItem>
                  <SelectItem value='Tarjeta'>Tarjeta</SelectItem>
                  <SelectItem value='Transferencia'>Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='space-y-6'>
        {(['paid','pending','completed','cancelled'] as const).map(key => {
          const salesInStatus = salesByStatus[key];
            const info = pageInfoByStatus[key as keyof typeof pageInfoByStatus];
          const isLoading = {
            completed: completedQuery.isLoading,
            pending: pendingQuery.isLoading,
            cancelled: cancelledQuery.isLoading,
            paid: paidQuery.isLoading,
          }[key];
          return (
            <Card key={key} className='animate-slide-up'>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    {getStatusBadge(key as SaleStatus)}
                    <span>{statusLabels[key as keyof typeof statusLabels]} ({salesInStatus.length})</span>
                  </div>
                  <div className='text-sm text-muted-foreground'>{isLoading ? 'Cargando...' : `Página ${info.page}/${info.totalPages}`}</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesInStatus.length === 0 ? (
                  <div className='text-center py-8 text-muted-foreground'>No hay ventas {statusLabels[key as keyof typeof statusLabels].toLowerCase()}</div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b border-border'>
                          <th className='text-left p-3 font-medium text-muted-foreground'>ID Venta</th>
                          <th className='text-left p-3 font-medium text-muted-foreground'>Fecha/Hora</th>
                          <th className='text-left p-3 font-medium text-muted-foreground'>Cliente</th>
                          <th className='text-center p-3 font-medium text-muted-foreground'>Items</th>
                          <th className='text-right p-3 font-medium text-muted-foreground'>Total</th>
                          <th className='text-center p-3 font-medium text-muted-foreground'>Pago</th>
                          <th className='text-center p-3 font-medium text-muted-foreground'>Estado</th>
                          <th className='text-center p-3 font-medium text-muted-foreground'>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesInStatus.map((sale, index) => (
                          <tr key={sale.id} className='border-b border-border hover:bg-muted transition-colors animate-slide-up' style={{ animationDelay: `${index * 50}ms` }}>
                            <td className='p-3'><span className='font-medium text-primary'>{sale.id}</span></td>
                            <td className='p-3'><div className='text-sm text-foreground'>{sale.date}</div></td>
                            <td className='p-3'>
                              <div className='font-medium text-foreground'>{sale.customer}</div>
                              <div className='text-xs text-muted-foreground'>{sale.isFinalConsumer ? 'CF' : sale.customerNit}</div>
                            </td>
                            <td className='p-3 text-center'><span className='text-foreground'>{sale.items}</span></td>
                            <td className='p-3 text-right'><span className='font-medium text-foreground'>Q {formatMoney(sale.total)}</span></td>
                            <td className='p-3 text-center'><Badge variant='outline'>{sale.payment}</Badge></td>
                            <td className='p-3 text-center'>
                              <Select value={sale.status} onValueChange={(v: SaleStatus) => updateSaleStatus(sale.id, v)} disabled={updatingSaleIds.has(sale.id)}>
                                <SelectTrigger className='w-32'>{updatingSaleIds.has(sale.id) ? '...' : getStatusBadge(sale.status)}</SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='pending'>Pendiente</SelectItem>
                                  <SelectItem value='paid'>Pagado</SelectItem>
                                  <SelectItem value='completed'>Completado</SelectItem>
                                  <SelectItem value='cancelled'>Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className='p-3 text-center'>
                              <div className='flex justify-center space-x-1'>
                                <Button variant='ghost' size='sm' onClick={() => viewSale(sale)}><Eye className='w-4 h-4' /></Button>
                                <Button variant='ghost' size='sm' className='text-destructive' onClick={() => deleteSale(sale.id)}><Trash2 className='w-4 h-4' /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <div className='flex justify-end items-center gap-2 p-4'>
                <Button className='px-2 py-1 bg-gray-200 rounded disabled:opacity-50' onClick={() => setPageFor(key, Math.max(1, info.page - 1))} disabled={info.page <= 1} aria-label={`Anterior ${key}`}><ChevronLeft className='w-4 h-4' /></Button>
                <Button className='px-2 py-1 bg-gray-200 rounded disabled:opacity-50' onClick={() => setPageFor(key, Math.min(info.totalPages, info.page + 1))} disabled={info.page >= info.totalPages} aria-label={`Siguiente ${key}`}><ChevronRight className='w-4 h-4' /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isViewSaleOpen} onOpenChange={setIsViewSaleOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader><DialogTitle>Detalle de Venta {selectedSale?.id}</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div><Label>Cliente</Label><div className='font-medium'>{selectedSale.customer}</div></div>
                <div><Label>NIT / Tipo</Label><div className='font-medium'>{selectedSale.isFinalConsumer ? 'Consumidor Final' : selectedSale.customerNit}</div></div>
                <div><Label>Fecha</Label><div className='font-medium'>{selectedSale.date}</div></div>
                <div><Label>Método de Pago</Label><div className='font-medium'>{selectedSale.payment}</div></div>
                <div><Label>Estado</Label><div>{getStatusBadge(selectedSale.status)}</div></div>
              </div>
              <div>
                <Label>Productos</Label>
                <div className='border rounded-lg divide-y'>
                  {selectedSale.products.map((p, i) => (
                    <div key={i} className='p-3 flex justify-between'>
                      <div>
                        <div className='font-medium'>{p.name}</div>
                        <div className='text-sm text-muted-foreground'>Cantidad: {p.qty}</div>
                      </div>
                      <div className='text-right'>
                        <div className='font-medium'>Q {(p.price * p.qty).toFixed(2)}</div>
                        <div className='text-sm text-muted-foreground'>Q {p.price.toFixed(2)} c/u</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className='bg-muted/50 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between'><span>Subtotal:</span><span>Q {formatMoney(selectedSale.total)}</span></div>
                {selectedSale.payment === 'Efectivo' && (
                  <>
                    <div className='flex justify-between'><span>Monto Recibido:</span><span>Q {formatMoney(selectedSale.amountReceived)}</span></div>
                    <div className='flex justify-between font-bold'><span>Vuelto:</span><span>Q {formatMoney(selectedSale.change)}</span></div>
                  </>
                )}
                <div className='flex justify-between text-lg font-bold border-t pt-2'><span>Total:</span><span>Q {formatMoney(selectedSale.total)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesManagement;