// Exportar todos los tipos y interfaces
export * from "./common";
export * from "./product";
export * from "./sale";
export * from "./supplier";
export * from "./alert";
export * from "./auth";

import type { ComponentType, SVGProps } from "react";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Tipos específicos para componentes principales
export interface DashboardProps {
  onSectionChange?: (section: string) => void;
}

export interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

// Tipos para elementos de menú
export interface MenuItem {
  id: string;
  label: string;
  icon: IconComponent; // Lucide icon component
}

// Tipos para reportes
export interface Report {
  id: string;
  name: string;
  description: string;
  icon: IconComponent;
  color: string;
  bgColor: string;
  size: string;
  lastGenerated: string;
}

export interface GeneratedReport {
  name: string;
  type: string;
  date: string;
  size: string;
  status: string;
}

// Tipos para análisis/estadísticas del dashboard
export interface DashboardStat {
  title: string;
  value: string;
  change: string;
  trending: "up" | "down";
  icon: IconComponent;
  color: string;
}

export interface RecentProduct {
  name: string;
  category: string;
  stock: number;
  status: "low" | "good" | "critical";
}