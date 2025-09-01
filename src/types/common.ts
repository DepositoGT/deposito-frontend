// Tipos de estado común
export type Status = "active" | "inactive" | "completed" | "pending" | "resolved";

// Tipos de estado de stock
export type StockStatus = "active" | "low_stock" | "critical" | "out_of_stock";

// Tipos de categorías de productos
export type ProductCategory = 
  | "Whisky" 
  | "Vinos" 
  | "Cervezas" 
  | "Rones" 
  | "Vodkas" 
  | "Ginebras" 
  | "Licores"
  | "Whisky/Licores Premium"
  | "Rones/Licores Nacionales"
  | "Vodkas/Ginebras"
  | "Tecnología"; // Para alertas del sistema

// Tipos de métodos de pago
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "cash" | "card" | "transfer";

// Interfaz base para entidades con ID
export interface BaseEntity {
  id: string;
}

// Interfaz para estadísticas generales
export interface Stats {
  total: number;
  active: number;
  [key: string]: number | string;
}

// Props comunes para componentes
export interface BaseComponentProps {
  className?: string;
}

// Props para componentes de sección
export interface SectionProps extends BaseComponentProps {
  onSectionChange?: (section: string) => void;
}