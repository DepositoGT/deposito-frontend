import { BaseEntity, ProductCategory, Status } from "./common";

// Tipos de alertas
export type AlertType = 
  | "stock_low" 
  | "stock_out" 
  | "expiry_soon" 
  | "price_change" 
  | "system";

// Prioridades de alertas
export type AlertPriority = "low" | "medium" | "high" | "critical";

// Interfaz principal de alerta
export interface Alert extends BaseEntity {
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  product: string;
  category: ProductCategory | string;
  currentStock: number;
  minStock: number;
  timestamp: string;
  status: Status;
  assignedTo: string;
}

// Props del componente AlertsManagement
export interface AlertsManagementProps {
  alerts?: Alert[];
  onAlertChange?: (alerts: Alert[]) => void;
}

// Estadísticas de alertas
export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  resolved: number;
}

// Filtros de alertas
export interface AlertFilters {
  searchTerm: string;
  priorityFilter: string;
  statusFilter: string;
}