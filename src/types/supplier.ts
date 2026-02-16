/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { BaseEntity, ProductCategory, Status } from "./common";
import type { Product } from "./product";

// Interfaz principal de proveedor
export interface Supplier extends BaseEntity {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  // Etiqueta principal (por compatibilidad). Para múltiples categorías se usará categories / categoriesLabel
  category: ProductCategory | string;
  // Nuevos campos para múltiples categorías
  categories?: ProductCategory[];
  /** Nombres de categorías separados por coma para mostrar en UI */
  categoriesLabel?: string;
  products: number;
  lastOrder: string;
  totalPurchases: number;
  rating: number;
  status: Status | string; // permitir string desde API
  paymentTerms: string;
  productsList?: Product[]; // productos asociados desde API
}

// Interfaz para nuevo proveedor (form)
export interface NewSupplierForm {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  paymentTerms: string;
}

// Props del componente SuppliersManagement
export interface SuppliersManagementProps {
  suppliers?: Supplier[];
  onSupplierChange?: (suppliers: Supplier[]) => void;
}

// Estadísticas de proveedores
export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalProducts: number;
  avgRating: string;
}

// Términos de pago disponibles
export type PaymentTerms = "7 días" | "15 días" | "30 días" | "45 días";

// Categorías de proveedores
export type SupplierCategory = 
  | "Whisky/Licores Premium"
  | "Vinos"
  | "Cervezas" 
  | "Rones/Licores Nacionales"
  | "Vodkas/Ginebras";