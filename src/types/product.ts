import { BaseEntity, ProductCategory, StockStatus } from "./common";

// Interfaz principal de producto
export interface Product extends BaseEntity {
  name: string;
  category: ProductCategory | string; // Permitir string para flexibilidad
  brand: string;
  size: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  supplier: string;
  barcode: string;
  description: string;
  status: StockStatus | string; // Permitir string para flexibilidad
  deleted?: boolean; // Campo para soft delete
  deleted_at?: string | null; // Fecha de eliminación
}

// Interfaz para nuevo producto (form)
export interface NewProductForm {
  name: string;
  category: string;
  brand: string;
  size: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  supplier: string;
  barcode: string;
  description: string;
}

// Interfaz para producto en carrito de ventas
export interface CartProduct {
  id: string;
  name: string;
  price: number;
  qty: number;
}

// Interfaz para producto disponible en ventas
export interface AvailableProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string;
}

// Props del componente ProductManagement
export interface ProductManagementProps {
  products?: Product[];
  onProductChange?: (products: Product[]) => void;
}

// Estadísticas de productos
export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
}

// API shapes and payloads used by services
export interface ApiProduct {
  id: string | number;
  name: string;
  category?: string | { id: string | number; name: string };
  category_id?: string | number;
  category_name?: string;
  brand?: string;
  size?: string;
  stock?: number | string;
  min_stock?: number | string;
  price?: number | string;
  cost?: number | string;
  supplier?: string | { id: string | number; name: string };
  supplier_id?: string | number;
  supplier_name?: string;
  barcode?: string;
  description?: string | null;
  status?: string | { id: string | number; name: string };
  status_id?: number | string;
  [key: string]: unknown;
}

export interface CreateProductPayload {
  id?: string;
  name: string;
  category_id: number | string;
  brand?: string;
  size?: string;
  stock?: number;
  min_stock?: number;
  price?: number;
  cost?: number;
  supplier_id?: string;
  barcode?: string;
  description?: string;
  status_id?: number;
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: string;
}