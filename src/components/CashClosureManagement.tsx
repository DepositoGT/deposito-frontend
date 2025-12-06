import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calculator, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  PenTool,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/useAuth';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import autoTable, { type jsPDFDocument } from 'jspdf-autotable';

interface PaymentMethodBreakdown {
  id?: number;
  cash_closure_id?: string;
  payment_method_id: number;
  payment_method?: {
    id: number;
    name: string;
  };
  payment_method_name?: string; // Para compatibilidad con el formulario
  theoretical_amount: number | string;
  theoretical_count: number;
  actual_amount: number | string;
  actual_count: number | null;
  difference: number | string;
  notes: string | null;
}

interface Denomination {
  id?: number;
  cash_closure_id?: string;
  denomination: number | string;
  type: 'Billete' | 'Moneda';
  quantity: number;
  subtotal: number | string;
}

interface TheoreticalData {
  period: {
    start: string;
    end: string;
  };
  theoretical: {
    total_sales: number;
    total_returns: number;
    net_total: number;
  };
  metrics: {
    total_transactions: number;
    total_customers: number;
    average_ticket: number;
  };
  payment_breakdown: PaymentMethodBreakdown[];
}

interface CashClosure {
  id: string;
  closure_number: number;
  date: string;
  start_date: string;
  end_date: string;
  cashier_name: string;
  cashier_signature: string | null;
  supervisor_name: string | null;
  supervisor_signature: string | null;
  supervisor_validated_at: string | null;
  theoretical_total: number | string;
  theoretical_sales: number | string;
  theoretical_returns: number | string;
  actual_total: number | string;
  difference: number | string;
  difference_percentage: number | string;
  total_transactions: number;
  total_customers: number;
  average_ticket: number | string;
  notes: string | null;
  status: 'Pendiente' | 'Validado' | 'Cerrado';
  created_at: string;
  updated_at: string;
  payment_breakdowns: PaymentMethodBreakdown[];
  denominations: Denomination[];
}

interface SaleFromAPI {
  id: string;
  sold_at?: string;
  date: string;
  customer?: string;
  customer_nit?: string;
  is_final_consumer?: boolean;
  total: number | string;
  items: number;
  payment_method_id: number;
  status_id: number;
  amount_received?: number | string;
  change?: number | string;
  total_returned?: number | string;
  adjusted_total?: number | string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const GUATEMALAN_DENOMINATIONS: Denomination[] = [
  // Billetes
  { denomination: 200, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 100, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 50, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 20, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 10, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 5, type: 'Billete', quantity: 0, subtotal: 0 },
  { denomination: 1, type: 'Billete', quantity: 0, subtotal: 0 },
  // Monedas
  { denomination: 0.50, type: 'Moneda', quantity: 0, subtotal: 0 },
  { denomination: 0.25, type: 'Moneda', quantity: 0, subtotal: 0 },
  { denomination: 0.10, type: 'Moneda', quantity: 0, subtotal: 0 },
  { denomination: 0.05, type: 'Moneda', quantity: 0, subtotal: 0 },
];

const CashClosureManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Determinar si el usuario es vendedor
  const roleName = user?.role?.name ?? undefined;
  const isSeller = typeof roleName === 'string' && ['seller', 'vendedor'].includes(roleName.toLowerCase());
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Theoretical data
  const [theoreticalData, setTheoreticalData] = useState<TheoreticalData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Actual data entry
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [denominations, setDenominations] = useState<Denomination[]>([...GUATEMALAN_DENOMINATIONS]);
  
  // Closure metadata - El nombre del cajero se obtiene del usuario logueado
  const cashierName = user?.name || user?.email || 'Cajero';
  const [notes, setNotes] = useState('');
  
  // List of closures
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingClosures, setIsLoadingClosures] = useState(false);
  
  // View closure detail
  const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Approve/Reject states
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [supervisorName, setSupervisorName] = useState(user?.name || user?.email || '');
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Initialize dates for today (00:00 to 23:59:59)
  useEffect(() => {
    initializeTodayDates();
    fetchClosures(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeTodayDates = () => {
    // Obtener la fecha actual en formato YYYY-MM-DD en zona horaria local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Crear fechas con hora local de Guatemala (sin conversión UTC)
    // Inicio del día: YYYY-MM-DD 00:00:00
    const startISO = `${year}-${month}-${day}T00:00:00`;
    
    // Fin del día: YYYY-MM-DD 23:59:59
    const endISO = `${year}-${month}-${day}T23:59:59`;
    
    setStartDate(startISO);
    setEndDate(endISO);
    
    console.log('Rango de cierre del día completo:', {
      inicio: startISO,
      fin: endISO,
      nota: 'Se incluyen TODAS las transacciones del día'
    });
  };

  const fetchClosures = async (page: number) => {
    setIsLoadingClosures(true);
    try {
      // Si es vendedor, solo traer el último cierre (pageSize=1)
      const pageSize = isSeller ? 1 : 10;
      const response = await fetch(`${API_URL}/cash-closures?page=${page}&pageSize=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // El backend devuelve 'items' en lugar de 'closures'
      if (data && Array.isArray(data.items)) {
        setClosures(data.items);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } else {
        // Si la respuesta no tiene la estructura esperada, usar valores por defecto
        console.warn('Unexpected response structure:', data);
        setClosures([]);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching closures:', error);
      // En caso de error, asegurar que closures sea un array vacío
      setClosures([]);
      setCurrentPage(1);
      setTotalPages(1);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cierres de caja',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingClosures(false);
    }
  };

  const handleApproveClosure = async () => {
    if (!selectedClosure) return;
    
    try {
      const response = await fetch(`${API_URL}/cash-closures/${selectedClosure.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'Aprobado',
          supervisor_name: supervisorName
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al aprobar el cierre');
      }
      
      const updatedClosure = await response.json();
      
      toast({
        title: 'Cierre Aprobado',
        description: `El cierre #${selectedClosure.closure_number} ha sido aprobado`,
      });
      
      // Actualizar la lista
      await fetchClosures(currentPage);
      
      // Actualizar el cierre seleccionado
      setSelectedClosure(updatedClosure);
    } catch (error) {
      console.error('Error approving closure:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el cierre',
        variant: 'destructive'
      });
    }
  };

  const handleRejectClosure = async () => {
    if (!selectedClosure || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar una razón para rechazar el cierre',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/cash-closures/${selectedClosure.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'Rechazado',
          rejection_reason: rejectionReason
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al rechazar el cierre');
      }
      
      const updatedClosure = await response.json();
      
      toast({
        title: 'Cierre Rechazado',
        description: `El cierre #${selectedClosure.closure_number} ha sido rechazado`,
        variant: 'destructive'
      });
      
      // Actualizar la lista
      await fetchClosures(currentPage);
      
      // Actualizar el cierre seleccionado y cerrar el dialog de rechazo
      setSelectedClosure(updatedClosure);
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting closure:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el cierre',
        variant: 'destructive'
      });
    }
  };

  const calculateTheoretical = async () => {
    setIsCalculating(true);
    try {
      // First, validate that there are no negative stocks
      const validateResponse = await fetch(`${API_URL}/cash-closures/validate-stocks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!validateResponse.ok) {
        throw new Error('Error validating stocks');
      }
      
      const validationData = await validateResponse.json();
      
      if (!validationData.valid && validationData.products.length > 0) {
        toast({
          title: 'Stock Negativo Detectado',
          description: `Hay ${validationData.negative_stock_count} producto(s) con stock negativo. Debes corregirlos antes de generar el cierre.`,
          variant: 'destructive'
        });
        setIsCalculating(false);
        return;
      }

      // Usar las fechas ya inicializadas (hoy 00:00 a 23:59:59)
      const response = await fetch(
        `${API_URL}/cash-closures/calculate-theoretical?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error calculating theoretical data');
      }
      
      const data: TheoreticalData = await response.json();
      setTheoreticalData(data);
      
      // Initialize payment breakdown with theoretical data
      setPaymentBreakdown(data.payment_breakdown.map(item => ({
        ...item,
        actual_amount: 0,
        actual_count: 0,
        difference: -item.theoretical_amount,
        notes: ''
      })));
      
      toast({
        title: 'Cálculo completado',
        description: `Total teórico: Q ${data.theoretical.net_total.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error calculating theoretical:', error);
      toast({
        title: 'Error',
        description: 'No se pudo calcular el cierre teórico',
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const updateActualAmount = (index: number, field: 'actual_amount' | 'actual_count' | 'notes', value: string | number) => {
    const updated = [...paymentBreakdown];
    if (field === 'notes') {
      updated[index].notes = value as string;
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      updated[index][field] = numValue;
      
      // Recalculate difference
      updated[index].difference = toNumber(updated[index].actual_amount) - toNumber(updated[index].theoretical_amount);
    }
    setPaymentBreakdown(updated);
  };

  const updateDenomination = (index: number, quantity: number) => {
    const updated = [...denominations];
    updated[index].quantity = quantity;
    updated[index].subtotal = quantity * toNumber(updated[index].denomination);
    setDenominations(updated);
  };

  const getCashTotal = () => {
    return denominations.reduce((sum, denom) => sum + toNumber(denom.subtotal), 0);
  };

  const getActualTotal = () => {
    return paymentBreakdown.reduce((sum, item) => sum + toNumber(item.actual_amount), 0);
  };

  const getTotalDifference = () => {
    if (!theoreticalData) return 0;
    return getActualTotal() - theoreticalData.theoretical.net_total;
  };

  const getDifferencePercentage = () => {
    if (!theoreticalData || theoreticalData.theoretical.net_total === 0) return 0;
    return (getTotalDifference() / theoreticalData.theoretical.net_total) * 100;
  };

  const saveClosure = async () => {
    if (!theoreticalData) {
      toast({
        title: 'Error',
        description: 'Primero debes calcular el cierre teórico',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const closureData = {
        startDate: startDate,
        endDate: endDate,
        cashierName: cashierName,
        cashierSignature: null,
        supervisorName: null,
        supervisorSignature: null,
        theoreticalTotal: theoreticalData.theoretical.net_total,
        theoreticalSales: theoreticalData.theoretical.total_sales,
        theoreticalReturns: theoreticalData.theoretical.total_returns,
        actualTotal: getActualTotal(),
        totalTransactions: theoreticalData.metrics.total_transactions,
        totalCustomers: theoreticalData.metrics.total_customers,
        averageTicket: theoreticalData.metrics.average_ticket,
        notes: notes.trim() || null,
        paymentBreakdowns: paymentBreakdown,
        denominations: denominations.filter(d => d.quantity > 0)
      };

      const response = await fetch(`${API_URL}/cash-closures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(closureData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', response.status, errorData);
        throw new Error(`Error saving closure: ${response.status}`);
      }

      const savedClosure = await response.json();

      toast({
        title: 'Cierre guardado',
        description: `Cierre #${savedClosure.closure_number} guardado exitosamente`,
      });

      // Reset form
      resetForm();
      fetchClosures(1);
    } catch (error) {
      console.error('Error saving closure:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cierre de caja',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTheoreticalData(null);
    setPaymentBreakdown([]);
    setDenominations([...GUATEMALAN_DENOMINATIONS]);
    setNotes('');
    initializeTodayDates(); // Reiniciar las fechas de hoy
  };

  const viewClosureDetail = async (closureId: string) => {
    try {
      const response = await fetch(`${API_URL}/cash-closures/${closureId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const closure: CashClosure = await response.json();
      setSelectedClosure(closure);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching closure detail:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el detalle del cierre',
        variant: 'destructive'
      });
    }
  };

  const generatePDF = (closure: CashClosure) => {
    const doc = new jsPDF() as jsPDFDocument;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CIERRE DE CAJA', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cierre #${closure.closure_number}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Date and Period Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateTime(closure.date), margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDateTime(closure.start_date)} - ${formatDateTime(closure.end_date)}`, margin + 30, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Cajero:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(closure.cashier_name, margin + 30, yPos);
    
    if (closure.supervisor_name) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Encargado:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(closure.supervisor_name, margin + 30, yPos);
    }
    
    yPos += 15;
    
    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL', margin, yPos);
    yPos += 10;
    
    const summaryData = [
      ['Total Teórico', formatCurrency(closure.theoretical_total)],
      ['Ventas Brutas', formatCurrency(closure.theoretical_sales)],
      ['Devoluciones', formatCurrency(closure.theoretical_returns)],
      ['Total Contado', formatCurrency(closure.actual_total)],
      ['Diferencia', `${toNumber(closure.difference) >= 0 ? '+' : ''}${formatCurrency(closure.difference)} (${toNumber(closure.difference_percentage).toFixed(2)}%)`],
      ['Transacciones', closure.total_transactions.toString()],
      ['Clientes', closure.total_customers.toString()],
      ['Ticket Promedio', formatCurrency(closure.average_ticket)]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 'auto', halign: 'right' }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Payment Methods Breakdown
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DESGLOSE POR MÉTODO DE PAGO', margin, yPos);
    yPos += 10;
    
    const paymentData = (closure.payment_breakdowns || []).map(item => [
      item.payment_method?.name || item.payment_method_name || 'N/A',
      formatCurrency(item.theoretical_amount),
      formatCurrency(item.actual_amount),
      `${toNumber(item.difference) >= 0 ? '+' : ''}${formatCurrency(item.difference)}`,
      item.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Método', 'Teórico', 'Contado', 'Diferencia', 'Notas']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Denominations (if exists)
    if (closure.denominations && closure.denominations.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTEO DE EFECTIVO', margin, yPos);
      yPos += 10;
      
      const denominationData = (closure.denominations || []).map(denom => [
        `Q ${toNumber(denom.denomination).toFixed(2)}`,
        denom.type,
        denom.quantity.toString(),
        formatCurrency(denom.subtotal)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Denominación', 'Tipo', 'Cantidad', 'Subtotal']],
        body: denominationData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 5;
    }
    
    // Notes
    if (closure.notes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS:', margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(closure.notes, pageWidth - 2 * margin);
      doc.text(splitNotes, margin, yPos);
      yPos += splitNotes.length * 5 + 10;
    }
    
    // Signatures - Check if we need a new page (need ~60-70 units for signatures)
    const signaturesHeight = 70;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    if (yPos + signaturesHeight > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMAS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Cashier signature (left side)
    if (closure.cashier_signature) {
      try {
        doc.addImage(closure.cashier_signature, 'PNG', margin, yPos, 80, 30);
      } catch (e) {
        console.error('Error adding cashier signature:', e);
      }
    }
    doc.line(margin, yPos + 35, margin + 80, yPos + 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Cajero:', margin, yPos + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(closure.cashier_name, margin, yPos + 45);
    
    // Supervisor/Encargado signature (right side) - Always show the space
    const supervisorX = pageWidth - margin - 80;
    if (closure.supervisor_signature) {
      try {
        doc.addImage(closure.supervisor_signature, 'PNG', supervisorX, yPos, 80, 30);
      } catch (e) {
        console.error('Error adding supervisor signature:', e);
      }
    }
    doc.line(supervisorX, yPos + 35, supervisorX + 80, yPos + 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Firma de Encargado:', supervisorX, yPos + 40);
    doc.setFont('helvetica', 'normal');
    if (closure.supervisor_name) {
      doc.text(closure.supervisor_name, supervisorX, yPos + 45);
    }
    
    // Save PDF
    doc.save(`Cierre-Caja-${closure.closure_number}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: 'PDF Generado',
      description: `Cierre #${closure.closure_number} descargado exitosamente`,
    });
  };

  const toNumber = (value: number | string): number => {
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = toNumber(amount);
    return `Q ${numAmount.toFixed(2)}`;
  };

  const formatDateTime = (dateString: string) => {
    // Remove timezone info if present - DB stores Guatemala time as-is
    const cleanDate = dateString.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
    
    // Parse the date string manually to avoid timezone conversion
    // Format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss
    const parts = cleanDate.replace('T', ' ').split(' ');
    const datePart = parts[0].split('-');
    const timePart = parts[1]?.split(':') || ['00', '00', '00'];
    
    const year = datePart[0];
    const month = datePart[1];
    const day = datePart[2];
    const hour = timePart[0];
    const minute = timePart[1];
    
    // Return formatted string in Guatemala format: DD/MM/YYYY, HH:mm a. m./p. m.
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'p. m.' : 'a. m.';
    const hour12 = hourNum % 12 || 12;
    
    return `${day}/${month}/${year}, ${String(hour12).padStart(2, '0')}:${minute} ${period}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Pendiente': 'secondary',
      'Validado': 'default',
      'Cerrado': 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Cierre de Caja</h2>
      </div>

      {/* Nueva sección de cierre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nuevo Cierre de Caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Today's Date Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Cierre de Caja del Día</h4>
            <p className="text-sm text-orange-800">
              <strong>Fecha:</strong> {new Date().toLocaleDateString('es-GT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Período:</strong> {startDate && endDate ? (
                <>
                  {startDate.split('T')[1]?.substring(0, 8) || '00:00:00'} 
                  {' - '}
                  {endDate.split('T')[1]?.substring(0, 8) || '23:59:59'}
                </>
              ) : 'Cargando...'}
            </p>
            <p className="text-xs text-orange-700 mt-1">
              * El período se calcula desde la primera hasta la última venta del día
            </p>
          </div>

          <Button 
            onClick={calculateTheoretical}
            disabled={isCalculating}
            className="w-full"
          >
            {isCalculating ? 'Calculando...' : 'Calcular Cierre del Día'}
          </Button>

          {/* Theoretical Summary */}
          {theoreticalData && (
            <>
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-3">Resumen Teórico</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teórico</p>
                    <p className="text-lg font-bold">{formatCurrency(theoreticalData.theoretical.net_total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas Brutas</p>
                    <p className="text-lg font-semibold">{formatCurrency(theoreticalData.theoretical.total_sales)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Devoluciones</p>
                    <p className="text-lg font-semibold text-red-600">-{formatCurrency(theoreticalData.theoretical.total_returns)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transacciones</p>
                    <p className="text-lg font-semibold">{theoreticalData.metrics.total_transactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="text-lg font-semibold">{theoreticalData.metrics.total_customers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                    <p className="text-lg font-semibold">{formatCurrency(theoreticalData.metrics.average_ticket)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold">Desglose por Método de Pago</h3>
                {paymentBreakdown.map((item, index) => (
                  <Card key={item.payment_method_id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{item.payment_method_name}</h4>
                          <Badge variant={toNumber(item.difference) === 0 ? 'default' : toNumber(item.difference) > 0 ? 'secondary' : 'destructive'}>
                            {toNumber(item.difference) >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Teórico</Label>
                            <p className="text-lg font-semibold">{formatCurrency(item.theoretical_amount)}</p>
                            <p className="text-sm text-muted-foreground">{item.theoretical_count} transacciones</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`actual-${index}`}>Monto Contado</Label>
                            <Input
                              id={`actual-${index}`}
                              type="number"
                              step="0.01"
                              value={item.actual_amount || ''}
                              onChange={(e) => updateActualAmount(index, 'actual_amount', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${index}`}>Notas</Label>
                          <Input
                            id={`notes-${index}`}
                            value={item.notes}
                            onChange={(e) => updateActualAmount(index, 'notes', e.target.value)}
                            placeholder="Observaciones (opcional)"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Cash Denominations (only for cash payment method) */}
              {paymentBreakdown.some(p => p.payment_method_name.toLowerCase().includes('efectivo')) && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Conteo de Efectivo</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2 font-semibold text-sm">
                          <div>Denominación</div>
                          <div>Tipo</div>
                          <div>Cantidad</div>
                          <div>Subtotal</div>
                        </div>
                        {denominations.map((denom, index) => (
                          <div key={`${denom.type}-${denom.denomination}`} className="grid grid-cols-4 gap-2 items-center">
                            <div className="font-medium">Q {toNumber(denom.denomination).toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">{denom.type}</div>
                            <Input
                              type="number"
                              min="0"
                              value={denom.quantity || ''}
                              onChange={(e) => updateDenomination(index, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="h-8"
                            />
                            <div className="font-semibold">{formatCurrency(denom.subtotal)}</div>
                          </div>
                        ))}
                        <div className="border-t pt-3 mt-3 flex justify-between items-center">
                          <span className="font-semibold">Total Efectivo Contado:</span>
                          <span className="text-xl font-bold">{formatCurrency(getCashTotal())}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Summary and Difference */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teórico</p>
                    <p className="text-2xl font-bold">{formatCurrency(theoreticalData.theoretical.net_total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Contado</p>
                    <p className="text-2xl font-bold">{formatCurrency(getActualTotal())}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-2xl font-bold ${getTotalDifference() === 0 ? 'text-green-600' : getTotalDifference() > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        {getTotalDifference() >= 0 ? '+' : ''}{formatCurrency(getTotalDifference())}
                      </p>
                      <Badge variant={getTotalDifference() === 0 ? 'default' : 'secondary'}>
                        {getDifferencePercentage().toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cashier Info */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cajero</p>
                    <p className="font-semibold">{cashierName}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones generales del cierre (opcional)"
                  rows={3}
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={saveClosure}
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cierre de Caja'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Closures History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isSeller ? 'Último Cierre de Caja' : 'Historial de Cierres'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingClosures ? (
              <p className="text-center text-muted-foreground py-8">Cargando...</p>
            ) : !Array.isArray(closures) || closures.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay cierres registrados</p>
            ) : (
              <>
                <div className="space-y-2">
                  {closures.map((closure) => (
                    <div
                      key={closure.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Cierre #{closure.closure_number}</span>
                          {getStatusBadge(closure.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{formatDateTime(closure.start_date)} - {formatDateTime(closure.end_date)}</p>
                          <p>Cajero: {closure.cashier_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(closure.actual_total)}</p>
                          <p className={`text-sm ${toNumber(closure.difference) === 0 ? 'text-green-600' : toNumber(closure.difference) > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {toNumber(closure.difference) >= 0 ? '+' : ''}{formatCurrency(closure.difference)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewClosureDetail(closure.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination - Solo para administradores */}
                {!isSeller && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchClosures(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchClosures(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Closure Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Cierre #{selectedClosure?.closure_number}</DialogTitle>
          </DialogHeader>
          {selectedClosure && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Período</p>
                  <p className="font-medium">{formatDateTime(selectedClosure.start_date)}</p>
                  <p className="font-medium">hasta {formatDateTime(selectedClosure.end_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedClosure.status)}
                </div>
              </div>

              {/* Summary */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teórico</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedClosure.theoretical_total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Contado</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedClosure.actual_total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <p className={`text-xl font-bold ${toNumber(selectedClosure.difference) === 0 ? 'text-green-600' : toNumber(selectedClosure.difference) > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      {toNumber(selectedClosure.difference) >= 0 ? '+' : ''}{formatCurrency(selectedClosure.difference)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div>
                <h4 className="font-semibold mb-2">Desglose por Método de Pago</h4>
                <div className="space-y-2">
                  {selectedClosure.payment_breakdowns?.map((item) => (
                    <div key={item.payment_method_id} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{item.payment_method?.name || item.payment_method_name}</span>
                        <Badge variant={toNumber(item.difference) === 0 ? 'default' : toNumber(item.difference) > 0 ? 'secondary' : 'destructive'}>
                          {toNumber(item.difference) >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Teórico: </span>
                          <span className="font-medium">{formatCurrency(item.theoretical_amount)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contado: </span>
                          <span className="font-medium">{formatCurrency(item.actual_amount)}</span>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2">Nota: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Denominations */}
              {selectedClosure.denominations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Conteo de Efectivo</h4>
                  <div className="border rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-2 text-sm font-semibold mb-2">
                      <div>Denominación</div>
                      <div>Tipo</div>
                      <div>Cantidad</div>
                      <div>Subtotal</div>
                    </div>
                    {selectedClosure.denominations.map((denom, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                        <div>Q {toNumber(denom.denomination).toFixed(2)}</div>
                        <div className="text-muted-foreground">{denom.type}</div>
                        <div>{denom.quantity}</div>
                        <div className="font-medium">{formatCurrency(denom.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Cajero: {selectedClosure.cashier_name}</p>
                  {selectedClosure.cashier_signature && (
                    <img src={selectedClosure.cashier_signature} alt="Firma Cajero" className="border rounded" />
                  )}
                </div>
                {selectedClosure.supervisor_name && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Supervisor: {selectedClosure.supervisor_name}</p>
                    {selectedClosure.supervisor_signature && (
                      <img src={selectedClosure.supervisor_signature} alt="Firma Supervisor" className="border rounded" />
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedClosure.notes && (
                <div>
                  <p className="text-sm font-semibold">Notas</p>
                  <p className="text-sm text-muted-foreground">{selectedClosure.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  {/* Solo mostrar botones de aprobar/rechazar si está pendiente y el usuario no es vendedor */}
                  {selectedClosure.status === 'Pendiente' && !isSeller && (
                    <>
                      <Button
                        variant="default"
                        onClick={handleApproveClosure}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setIsRejectDialogOpen(true)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => generatePDF(selectedClosure)}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Closure Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Cierre de Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Razón del Rechazo *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica por qué se rechaza este cierre..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectClosure}
                disabled={!rejectionReason.trim()}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashClosureManagement;
