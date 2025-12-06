import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Search, ShoppingCart, Calendar, DollarSign, User, Receipt, Eye, Trash2, X, Calculator, Minus, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle, PackageX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Sale, CartProduct, PaymentMethod, SaleStatus } from '@/types';
import type { Product } from '@/types/product';
import { useProducts } from '@/hooks/useProducts';
import { useSalesByStatus } from '@/hooks/useSales';
import { createSale } from '@/services/saleService';
import { updateSaleStatus as apiUpdateSaleStatus } from '@/services/salesService';
import { useRealtimeSales } from '@/hooks/useRealtimeSales';
import { useAuth } from '@/context/useAuth';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface NegativeStockProduct {
  id: string;
  name: string;
  category: string;
  supplier: string;
  current_stock: number;
  barcode: string | null;
  status: string;
}

interface SalesManagementProps {
  onSectionChange?: (section: string) => void;
}

const SalesManagement = ({ onSectionChange }: SalesManagementProps = {}) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Payment methods from backend
  const paymentMethodsQuery = usePaymentMethods();
  const paymentMethods = paymentMethodsQuery.data ?? [];

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
  const [paymentMethod, setPaymentMethod] = useState<import('@/hooks/usePaymentMethods').PaymentMethod | null>(null);
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Stock override dialogs
  const [availabilityDialog, setAvailabilityDialog] = useState<{
    open: boolean;
    product: Product | null;
    requestedQty: number;
    availableStock: number;
  }>({ open: false, product: null, requestedQty: 0, availableStock: 0 });
  
  const [additionalQty, setAdditionalQty] = useState('');
  
  const [adminAuthDialog, setAdminAuthDialog] = useState<{
    open: boolean;
    product: Product | null;
    requestedQty: number;
  }>({ open: false, product: null, requestedQty: 0 });
  
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Track admin-authorized products (products that can exceed stock)
  const [adminAuthorizedProducts, setAdminAuthorizedProducts] = useState<Set<string>>(new Set());

  // Cash closure validation
  const [isValidatingClosure, setIsValidatingClosure] = useState(false);
  const [negativeStockDialog, setNegativeStockDialog] = useState<{
    open: boolean;
    products: NegativeStockProduct[];
  }>({ open: false, products: [] });

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
  const completedQuery = useSalesByStatus('Completada', { period: selectedPeriod, page: pages.completed, pageSize: 5 });
  const pendingQuery = useSalesByStatus('Pendiente', { period: selectedPeriod, page: pages.pending, pageSize: 5 });
  const cancelledQuery = useSalesByStatus('Cancelada', { period: selectedPeriod, page: pages.cancelled, pageSize: 5 });
  const paidQuery = useSalesByStatus('Pagado', { period: selectedPeriod, page: pages.paid, pageSize: 5 });

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
    
    // Process returns data
    const returnsRaw = Array.isArray(r.returns) ? r.returns : [];
    const totalReturned = parseFloat(String(r.total_returned ?? '0')) || 0;
    const adjustedTotal = parseFloat(String(r.adjusted_total ?? totalNum)) || totalNum;
    const hasReturns = returnsRaw.length > 0 || totalReturned > 0;
    
    const returnDetails = returnsRaw
      .filter((ret: unknown) => {
        const retObj = ret as Record<string, unknown>;
        const retStatus = (retObj.status as Record<string, unknown>)?.name;
        return retStatus === 'Completada'; // Only show completed returns
      })
      .map((ret: unknown) => {
        const retObj = ret as Record<string, unknown>;
        const retItems = Array.isArray(retObj.return_items) ? retObj.return_items : [];
        const items = retItems.map((item: unknown) => {
          const itemObj = item as Record<string, unknown>;
          const product = (itemObj.product as Record<string, unknown>) ?? {};
          return {
            productName: String(product.name ?? 'Producto'),
            qty: Number(itemObj.qty_returned ?? 0),
            refund: parseFloat(String(itemObj.refund_amount ?? '0')) || 0
          };
        });
        const retStatus = (retObj.status as Record<string, unknown>)?.name;
        return {
          date: String(retObj.return_date ?? ''),
          status: String(retStatus ?? 'Desconocido'),
          reason: retObj.reason ? String(retObj.reason) : undefined,
          totalRefund: parseFloat(String(retObj.total_refund ?? '0')) || 0,
          items
        };
      });
    
    return {
      id: String(r.id ?? ''),
      date: String(r.sold_at ?? r.date ?? ''),
      customer: String(r.customer ?? ''),
      customerNit,
      isFinalConsumer,
      total: totalNum,
      totalReturned,
      adjustedTotal,
      hasReturns,
      returnDetails,
      items: (r.items as number) ?? products.length,
      payment,
      status,
      amountReceived,
      change,
      products,
    } as Sale;
  };

  // --- KPIs for today ---
  // Only use sales with status 'completed' (Completada)
  const completedTodaySales: Sale[] = (completedData?.items ?? []).map(normalizeRawSale);

  // Total sales amount today (completed only) - usando adjusted_total para considerar devoluciones
  const totalSalesToday = completedTodaySales.reduce((sum, sale) => sum + (sale.adjustedTotal || sale.total || 0), 0);
  // Transaction count (completed only)
  const transactionCountToday = completedTodaySales.length;
  // Average ticket (completed only) - calculado con totales ajustados
  const averageTicketToday = transactionCountToday > 0 ? totalSalesToday / transactionCountToday : 0;
  // Preferred payment method (completed only)
  const paymentMethodCount: Record<string, number> = {};
  completedTodaySales.forEach(sale => {
    const method = sale.payment || 'Desconocido';
    paymentMethodCount[method] = (paymentMethodCount[method] || 0) + 1;
  });
  const preferredPaymentMethod = Object.entries(paymentMethodCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Desconocido';

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
  const changeAmount = paymentMethod && paymentMethod.name?.toLowerCase() === 'efectivo' && amountReceived
    ? Math.max(0, parseFloat(amountReceived) - cartTotal)
    : 0;

  const addToCart = (product: Product) => {
    const available = Number(product.stock ?? 0);
    const existing = cartItems.find(i => i.id === product.id);
    const currentQty = existing?.qty ?? 0;
    const requestedQty = currentQty + 1;

    // Si el stock es suficiente, agregar normalmente
    if (requestedQty <= available) {
      setCartItems(prev => {
        if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { ...product, qty: 1 }];
      });
      setProductSearch('');
      return;
    }

    // Stock insuficiente o sin stock: preguntar cuánto más quiere agregar
    setAvailabilityDialog({ open: true, product, requestedQty, availableStock: available });
    setAdditionalQty('');
  };
  
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.id !== productId));
    // También remover de la lista de autorizados si estaba ahí
    setAdminAuthorizedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  };
  
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) return removeFromCart(productId);
    
    const prod = availableProducts.find(p => p.id === productId);
    if (!prod) return;
    
    const available = Number(prod.stock ?? 0);
    
    // Si la cantidad solicitada está dentro del stock, actualizar normalmente
    if (newQty <= available) {
      setCartItems(prev => prev.map(i => i.id === productId ? { ...i, qty: newQty } : i));
      return;
    }
    
    // Stock insuficiente: preguntar cuánto más quiere agregar
    setAvailabilityDialog({ open: true, product: prod, requestedQty: newQty, availableStock: available });
    setAdditionalQty('');
  };

  // Handle availability confirmation with additional quantity
  const handleConfirmAdditionalQty = () => {
    const additional = parseInt(additionalQty);
    
    if (!additional || additional <= 0 || isNaN(additional)) {
      toast({ 
        title: 'Cantidad inválida', 
        description: 'Ingresa una cantidad válida mayor a 0.', 
        variant: 'destructive' 
      });
      return;
    }

    const { product, availableStock } = availabilityDialog;
    
    // La cantidad total será: stock disponible + cantidad adicional
    const totalQty = availableStock + additional;
    
    // Cerrar diálogo de disponibilidad y abrir autenticación de admin
    setAvailabilityDialog({ open: false, product: null, requestedQty: 0, availableStock: 0 });
    setAdminAuthDialog({ open: true, product, requestedQty: totalQty });
  };

  const handleCancelAvailability = () => {
    setAvailabilityDialog({ open: false, product: null, requestedQty: 0, availableStock: 0 });
    setAdditionalQty('');
    toast({ 
      title: 'Cancelado', 
      description: 'No se agregó el producto.', 
      variant: 'default' 
    });
  };

  // Handle admin authentication
  const handleAdminAuth = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast({ 
        title: 'Credenciales requeridas', 
        description: 'Ingresa usuario y contraseña de administrador.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsAuthenticating(true);
    
    try {
      // Validar credenciales con el backend
      const response = await fetch('http://localhost:3000/api/auth/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: adminUsername, 
          password: adminPassword 
        })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        toast({ 
          title: 'Credenciales inválidas', 
          description: 'Usuario o contraseña incorrectos.', 
          variant: 'destructive' 
        });
        setIsAuthenticating(false);
        return;
      }

      // Credenciales válidas: agregar producto al carrito
      const { product, requestedQty } = adminAuthDialog;
      
      if (product) {
        const existing = cartItems.find(i => i.id === product.id);
        
        if (existing) {
          // Actualizar cantidad existente
          setCartItems(prev => prev.map(i => 
            i.id === product.id ? { ...i, qty: requestedQty } : i
          ));
        } else {
          // Agregar nuevo producto
          setCartItems(prev => [...prev, { ...product, qty: requestedQty }]);
        }

        // Marcar este producto como autorizado por administrador
        setAdminAuthorizedProducts(prev => new Set(prev).add(product.id));

        toast({ 
          title: 'Producto agregado', 
          description: `Se agregó "${product.name}" con autorización de administrador.`, 
          variant: 'default' 
        });
      }

      // Limpiar y cerrar diálogos
      setAdminUsername('');
      setAdminPassword('');
      setAdminAuthDialog({ open: false, product: null, requestedQty: 0 });
      setProductSearch('');
      
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo validar las credenciales. Intenta nuevamente.', 
        variant: 'destructive' 
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const processSale = async () => {
    if (!paymentMethod) {
      toast({ title: 'Selecciona un método de pago', description: 'Debes seleccionar un método de pago.', variant: 'destructive' });
      return;
    }
    // Validación previa: sumar cantidades por producto y comparar contra stock actual
    // EXCEPTO para productos autorizados por administrador
    const qtyById = new Map<string, number>();
    for (const item of cartItems) {
      qtyById.set(item.id, (qtyById.get(item.id) || 0) + Number(item.qty || 0));
    }
    for (const [pid, requested] of qtyById.entries()) {
      // Omitir validación de stock si el producto fue autorizado por admin
      if (adminAuthorizedProducts.has(pid)) {
        continue;
      }
      
      const prod = availableProducts.find(p => p.id === pid);
      const available = Number(prod?.stock ?? 0);
      if (requested > available) {
        toast({ title: 'Stock insuficiente', description: `"${prod?.name || 'Producto'}": disponible ${available}, solicitado ${requested}. Ajusta las cantidades.`, variant: 'destructive' });
        return;
      }
    }
    const isCash = paymentMethod.name?.toLowerCase() === 'efectivo';
    const amountReceivedNum = isCash && amountReceived ? Number(amountReceived) : undefined;
    const changeNum = isCash && amountReceivedNum !== undefined ? Math.max(0, amountReceivedNum - cartTotal) : undefined;
    const salePayload = {
      customer,
      customer_nit: customerNit,
      is_final_consumer: isFinalConsumer,
      payment_method_id: paymentMethod.id,
      status_id: 0, // backend asigna 'Pendiente'
      items: cartItems.map(item => ({ product_id: item.id, price: item.price, qty: item.qty })),
      amount_received: amountReceivedNum,
      change: changeNum,
      admin_authorized_products: Array.from(adminAuthorizedProducts), // Enviar productos autorizados al backend
    };
    setIsProcessingSale(true);
    try {
      await createSale(salePayload);
      toast({ title: 'Venta registrada', description: 'La venta se ha registrado correctamente.', variant: 'default' });
      refreshSales();
      setIsNewSaleOpen(false);
      // Reset form
      setCartItems([]);
      setCustomer('');
      setCustomerNit('');
      setPaymentMethod(null);
      setAmountReceived('');
      setAdminAuthorizedProducts(new Set()); // Limpiar productos autorizados
    } catch (e) {
      toast({ title: 'Error al registrar venta', description: (e as Error)?.message || 'No se pudo registrar la venta.', variant: 'destructive' });
    } finally {
      setIsProcessingSale(false);
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

  // Validate stocks and navigate to cash closure
  const handleCashClosure = async () => {
    setIsValidatingClosure(true);
    try {
      const response = await fetch(`${API_URL}/cash-closures/validate-stocks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error validating stocks');
      }
      
      const data = await response.json();
      
      if (!data.valid && data.products.length > 0) {
        // Hay productos con stock negativo
        setNegativeStockDialog({
          open: true,
          products: data.products
        });
        toast({
          title: 'Stock Negativo Detectado',
          description: `${data.negative_stock_count} producto(s) con stock negativo deben ser corregidos antes del cierre.`,
          variant: 'destructive'
        });
      } else {
        // Todo bien, ir al módulo de cierre de caja
        if (onSectionChange) {
          onSectionChange('cash-closure');
        }
        toast({
          title: 'Validación exitosa',
          description: 'Todos los stocks están en orden. Puedes proceder con el cierre de caja.',
        });
      }
    } catch (error) {
      console.error('Error validating stocks:', error);
      toast({
        title: 'Error',
        description: 'No se pudo validar el inventario',
        variant: 'destructive'
      });
    } finally {
      setIsValidatingClosure(false);
    }
  };

  const formatMoney = (value: unknown) => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : NaN);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  // Formats date/time in a user-friendly way (e.g., '14 Sep 2025, 15:30')
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    // Remove timezone info if present - DB stores Guatemala time as-is
    const cleanDate = dateStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false
    }).format(d);
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
          <Button 
            variant='outline' 
            onClick={handleCashClosure}
            disabled={isValidatingClosure}
            className='border-green-600 text-green-600 hover:bg-green-50'
          >
            <Calculator className='w-4 h-4 mr-2' /> 
            {isValidatingClosure ? 'Validando...' : 'Cierre de Caja'}
          </Button>
          <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
            <DialogTrigger asChild>
              <Button className='bg-primary hover:bg-primary/90'>
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
                      <Select
                        value={paymentMethod ? String(paymentMethod.id) : ''}
                        onValueChange={(val) => {
                          const found = paymentMethods.find(pm => String(pm.id) === val);
                          setPaymentMethod(found ?? null);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder='Seleccionar método' /></SelectTrigger>
                        <SelectContent>
                          {paymentMethodsQuery.isLoading && (
                            <SelectItem value='loading' disabled>Cargando...</SelectItem>
                          )}
                          {!paymentMethodsQuery.isLoading && paymentMethods.length === 0 && (
                            <SelectItem value='no-methods' disabled>Sin métodos</SelectItem>
                          )}
                          {paymentMethods.map(pm => (
                            <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                          ))}
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
                    {paymentMethod && paymentMethod.name.toLowerCase() === 'efectivo' && (
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
                  <Button variant='outline' onClick={() => setIsNewSaleOpen(false)} disabled={isProcessingSale}>Cancelar</Button>
                  <Button className='bg-liquor-amber hover:bg-liquor-amber/90 text-white' onClick={processSale} disabled={cartItems.length === 0 || isProcessingSale}>
                    {isProcessingSale ? (
                      <>
                        <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Receipt className='w-4 h-4 mr-2' /> Procesar Venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats quick (calculated) */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>Ventas Hoy</p>
                <p className='text-2xl font-bold text-foreground'>Q {formatMoney(totalSalesToday)}</p>
              </div>
              <DollarSign className='w-8 h-8 text-liquor-gold' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>Transacciones</p>
                <p className='text-2xl font-bold text-foreground'>{transactionCountToday}</p>
              </div>
              <ShoppingCart className='w-8 h-8 text-primary' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>Ticket Promedio</p>
                <p className='text-2xl font-bold text-foreground'>Q {formatMoney(averageTicketToday)}</p>
              </div>
              <Receipt className='w-8 h-8 text-accent' />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>Pago Preferido</p>
                <p className='text-2xl font-bold text-foreground'>{preferredPaymentMethod}</p>
              </div>
              <User className='w-8 h-8 text-liquor-burgundy' />
            </div>
          </CardContent>
        </Card>
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
                            <td className='p-3'>
                              <div className='flex items-center gap-2'>
                                <span className='font-medium text-primary'>{sale.id}</span>
                                {sale.hasReturns && (
                                  <span title='Tiene devoluciones'>
                                    <AlertTriangle className='w-4 h-4 text-orange-500' />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className='p-3'><div className='text-sm text-foreground'>{formatDateTime(sale.date)}</div></td>
                            <td className='p-3'>
                              <div className='font-medium text-foreground'>{sale.customer}</div>
                              <div className='text-xs text-muted-foreground'>{sale.isFinalConsumer ? 'CF' : sale.customerNit}</div>
                            </td>
                            <td className='p-3 text-center'><span className='text-foreground'>{sale.items}</span></td>
                            <td className='p-3 text-right'>
                              <div className='flex flex-col items-end'>
                                {sale.hasReturns ? (
                                  <>
                                    <span className='font-medium text-green-700'>Q {formatMoney(sale.adjustedTotal || sale.total)}</span>
                                    <span className='text-xs text-muted-foreground line-through'>Q {formatMoney(sale.total)}</span>
                                  </>
                                ) : (
                                  <span className='font-medium text-foreground'>Q {formatMoney(sale.total)}</span>
                                )}
                              </div>
                            </td>
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
                <span className='text-sm text-muted-foreground mr-2'>
                  Página {info.page} de {info.totalPages}
                </span>
                <Button 
                  variant="outline"
                  size="sm"
                  className='hover:bg-liquor-amber hover:text-white transition-colors' 
                  onClick={() => setPageFor(key, Math.max(1, info.page - 1))} 
                  disabled={info.page <= 1} 
                  aria-label={`Anterior ${key}`}
                >
                  <ChevronLeft className='w-4 h-4' />
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className='hover:bg-liquor-amber hover:text-white transition-colors' 
                  onClick={() => setPageFor(key, Math.min(info.totalPages, info.page + 1))} 
                  disabled={info.page >= info.totalPages} 
                  aria-label={`Siguiente ${key}`}
                >
                  <ChevronRight className='w-4 h-4' />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isViewSaleOpen} onOpenChange={setIsViewSaleOpen}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
          <DialogHeader><DialogTitle>Detalle de Venta {selectedSale?.id}</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className='space-y-4 overflow-y-auto pr-2'>
              <div className='grid grid-cols-2 gap-4'>
                <div><Label>Cliente</Label><div className='font-medium'>{selectedSale.customer}</div></div>
                <div><Label>NIT / Tipo</Label><div className='font-medium'>{selectedSale.isFinalConsumer ? 'Consumidor Final' : selectedSale.customerNit}</div></div>
                <div><Label>Fecha</Label><div className='font-medium'>{formatDateTime(selectedSale.date)}</div></div>
                <div><Label>Método de Pago</Label><div className='font-medium'>{selectedSale.payment}</div></div>
                <div><Label>Estado</Label><div>{getStatusBadge(selectedSale.status)}</div></div>
              </div>

              {/* Alert if sale has returns */}
              {selectedSale.hasReturns && (
                <div className='bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3'>
                  <AlertTriangle className='w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-orange-900'>Esta venta tiene devoluciones</p>
                    <p className='text-xs text-orange-700 mt-1'>
                      Se han devuelto productos por un valor de Q {formatMoney(selectedSale.totalReturned || 0)}
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <Label>Productos</Label>
                <div className='border rounded-lg divide-y max-h-64 overflow-y-auto'>
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

              {/* Returns Section */}
              {selectedSale.hasReturns && selectedSale.returnDetails && selectedSale.returnDetails.length > 0 && (
                <div>
                  <Label className='flex items-center gap-2'>
                    <PackageX className='w-4 h-4 text-orange-600' />
                    Devoluciones
                  </Label>
                  <div className='border border-orange-200 rounded-lg divide-y mt-2 bg-orange-50/30'>
                    {selectedSale.returnDetails.map((ret, idx) => (
                      <div key={idx} className='p-3 space-y-2'>
                        <div className='flex justify-between items-start'>
                          <div>
                            <div className='text-sm font-medium text-orange-900'>
                              Devolución {idx + 1}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {formatDateTime(ret.date)}
                            </div>
                          </div>
                          <Badge variant={ret.status === 'Completada' ? 'default' : 'secondary'} className='text-xs'>
                            {ret.status}
                          </Badge>
                        </div>
                        {ret.reason && (
                          <div className='text-xs text-muted-foreground italic'>
                            Razón: {ret.reason}
                          </div>
                        )}
                        <div className='space-y-1'>
                          {ret.items.map((item, itemIdx) => (
                            <div key={itemIdx} className='flex justify-between text-xs bg-white/50 p-2 rounded'>
                              <span>{item.productName} × {item.qty}</span>
                              <span className='font-medium text-orange-700'>-Q {formatMoney(item.refund)}</span>
                            </div>
                          ))}
                        </div>
                        <div className='text-right text-sm font-bold text-orange-900 border-t pt-1'>
                          Total devuelto: Q {formatMoney(ret.totalRefund)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='bg-muted/50 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between'><span>Subtotal Original:</span><span>Q {formatMoney(selectedSale.total)}</span></div>
                {selectedSale.hasReturns && (
                  <>
                    <div className='flex justify-between text-orange-700'>
                      <span>(-) Devoluciones:</span>
                      <span>-Q {formatMoney(selectedSale.totalReturned || 0)}</span>
                    </div>
                    <div className='flex justify-between text-lg font-bold border-t pt-2 text-green-700'>
                      <span>Total Neto:</span>
                      <span>Q {formatMoney(selectedSale.adjustedTotal || selectedSale.total)}</span>
                    </div>
                  </>
                )}
                {selectedSale.payment === 'Efectivo' && (
                  <>
                    <div className='flex justify-between'><span>Monto Recibido:</span><span>Q {formatMoney(selectedSale.amountReceived)}</span></div>
                    <div className='flex justify-between font-bold'><span>Vuelto:</span><span>Q {formatMoney(selectedSale.change)}</span></div>
                  </>
                )}
                {!selectedSale.hasReturns && (
                  <div className='flex justify-between text-lg font-bold border-t pt-2'><span>Total:</span><span>Q {formatMoney(selectedSale.total)}</span></div>
                )}
              </div>
              
              {/* Return Button - Only for completed sales */}
              {selectedSale.status === 'completed' && (
                <div className='pt-4 border-t'>
                  <Button 
                    variant='outline' 
                    className='w-full text-orange-600 border-orange-300 hover:bg-orange-50'
                    onClick={() => {
                      setIsViewSaleOpen(false)
                      navigate(`/returns/new?sale_id=${selectedSale.id}`)
                    }}
                  >
                    <RotateCcw className='w-4 h-4 mr-2' />
                    Procesar Devolución
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Availability Confirmation Dialog */}
      <Dialog open={availabilityDialog.open} onOpenChange={(open) => !open && handleCancelAvailability()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Producto sin stock suficiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              El producto <strong>"{availabilityDialog.product?.name}"</strong> no tiene suficiente stock en el sistema.
            </p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between text-sm">
                <span>Stock en sistema:</span>
                <span className="font-medium">{availabilityDialog.availableStock} unidades</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cantidad solicitada:</span>
                <span className="font-medium text-orange-600">{availabilityDialog.requestedQty} unidades</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span>Faltante:</span>
                <span className="font-medium text-red-600">
                  {Math.max(0, availabilityDialog.requestedQty - availabilityDialog.availableStock)} unidades
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="additional-qty" className="text-sm font-medium">
                ¿Cuántas unidades adicionales hay disponibles físicamente?
              </Label>
              <Input
                id="additional-qty"
                type="number"
                min="1"
                placeholder="Ej: 5"
                value={additionalQty}
                onChange={(e) => setAdditionalQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdditionalQty()}
                className="text-center text-lg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Total disponible: {availabilityDialog.availableStock} + {additionalQty || '0'} = <strong>{availabilityDialog.availableStock + (parseInt(additionalQty) || 0)}</strong> unidades
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelAvailability}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAdditionalQty}>
              Continuar con Autorización
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Authentication Dialog */}
      <Dialog open={adminAuthDialog.open} onOpenChange={(open) => {
        if (!open) {
          setAdminAuthDialog({ open: false, product: null, requestedQty: 0 });
          setAdminUsername('');
          setAdminPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorización de Administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Para agregar productos sin stock registrado, necesitas autorización de un administrador.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="admin-username">Usuario</Label>
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Usuario de administrador"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
                  disabled={isAuthenticating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Contraseña</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Contraseña"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
                  disabled={isAuthenticating}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setAdminAuthDialog({ open: false, product: null, requestedQty: 0 });
                setAdminUsername('');
                setAdminPassword('');
              }}
              disabled={isAuthenticating}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdminAuth} disabled={isAuthenticating}>
              {isAuthenticating ? 'Verificando...' : 'Autorizar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Negative Stock Warning Dialog */}
      <Dialog open={negativeStockDialog.open} onOpenChange={(open) => {
        if (!open) {
          setNegativeStockDialog({ open: false, products: [] });
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              No se puede generar el Cierre de Caja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Hay {negativeStockDialog.products.length} producto(s) con stock negativo que deben ser corregidos antes de realizar el cierre de caja.
                <br />
                <strong>Por favor, ajusta el inventario de estos productos primero.</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Productos con stock negativo:</h4>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {negativeStockDialog.products.map((product) => (
                  <div key={product.id} className="p-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Categoría: {product.category}</span>
                          <span>Proveedor: {product.supplier}</span>
                          {product.barcode && <span>Código: {product.barcode}</span>}
                        </div>
                      </div>
                      <Badge variant="destructive" className="ml-4">
                        Stock: {product.current_stock}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-sm text-blue-900 mb-2">¿Cómo corregir el stock?</h5>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Ve al módulo de <strong>Inventario</strong> o <strong>Productos</strong></li>
                <li>Busca cada producto listado arriba</li>
                <li>Haz clic en "Ajustar Stock" para cada producto</li>
                <li>Ingresa la cantidad correcta de stock disponible</li>
                <li>Una vez corregidos todos, regresa aquí para generar el cierre</li>
              </ol>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={() => setNegativeStockDialog({ open: false, products: [] })}
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                setNegativeStockDialog({ open: false, products: [] });
                if (onSectionChange) {
                  onSectionChange('inventory');
                }
              }}
            >
              Ir a Inventario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesManagement;