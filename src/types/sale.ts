import { BaseEntity, PaymentMethod, Status } from "./common";
import { CartProduct } from "./product";

// Tipo de estado específico para ventas
export type SaleStatus = "pending" | "paid" | "completed" | "cancelled";

// Interfaz principal de venta
export interface Sale extends BaseEntity {
  date: string;
  customer: string;
  customerNit?: string; // NIT del cliente (opcional)
  isFinalConsumer: boolean; // Si es consumidor final (CF)
  total: number;
  items: number;
  payment: PaymentMethod;
  status: SaleStatus;
  amountReceived: number;
  change: number;
  products: CartProduct[];
}

// Interfaz para nueva venta (form)
export interface NewSaleForm {
  customer: string;
  customerNit: string;
  isFinalConsumer: boolean;
  paymentMethod: PaymentMethod;
  cartItems: CartProduct[];
  amountReceived: string;
}

// Props del componente SalesManagement
export interface SalesManagementProps {
  sales?: Sale[];
  onSaleChange?: (sales: Sale[]) => void;
}

// Estadísticas de ventas
export interface SalesStats {
  totalSales: number;
  todaySales: number;
  totalRevenue: number;
  todayRevenue: number;
  averageTicket: number;
}

// Resumen de venta para reportes
export interface SaleSummary {
  total: number;
  subtotal: number;
  tax: number;
  itemsCount: number;
  paymentMethod: PaymentMethod;
  change?: number;
}