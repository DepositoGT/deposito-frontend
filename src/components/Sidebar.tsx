import { useState } from "react";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  FileText,
  Home,
  Boxes,
  TrendingUp,
  Scan,
  X,
  UserCog,
  FolderKanban,
  RotateCcw,
  Calculator,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCriticalProducts } from "@/hooks/useCriticalProducts";

import { SidebarProps, MenuItem } from "@/types";

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "products", label: "Productos", icon: Boxes },
  { id: "sales", label: "Ventas", icon: ShoppingCart },
  { id: "returns", label: "Devoluciones", icon: RotateCcw },
  { id: "cash-closure", label: "Cierre de Caja", icon: Calculator },
  { id: "suppliers", label: "Proveedores", icon: Users },
  { id: "analytics", label: "Análisis", icon: BarChart3 },
  { id: "reports", label: "Reportes", icon: FileText },
  { id: "alerts", label: "Alertas", icon: AlertTriangle },
  { id: "scanner", label: "Scanner", icon: Scan },
  { id: "promotions", label: "Promociones", icon: Tag, adminOnly: true },
  { id: "catalogs", label: "Catálogos", icon: FolderKanban, adminOnly: true },
  { id: "users", label: "Usuarios", icon: UserCog, adminOnly: true },
];

const Sidebar = ({ activeSection = "dashboard", onSectionChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showInventoryAlert, setShowInventoryAlert] = useState(true);

  // Obtener productos críticos reales desde la API
  const { data: criticalProducts = [], isLoading: criticalLoading } = useCriticalProducts();

  // determine current user's role from localStorage (auth:user)
  let storedUser = null;
  try {
    storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth:user') : null;
  } catch (e) {
    storedUser = null;
  }
  let parsedUser = null;
  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    parsedUser = null;
  }
  const roleName = parsedUser?.role?.name ?? parsedUser?.role_name ?? undefined;
  const isSeller = typeof roleName === 'string' && ['seller', 'vendedor'].includes(roleName.toLowerCase());
  const isAdmin = typeof roleName === 'string' && roleName.toLowerCase() === 'admin';

  const visibleMenu = isSeller
    ? menuItems.filter((m) => m.id === 'sales' || m.id === 'cash-closure')
    : menuItems.filter((m) => !m.adminOnly || isAdmin);

  // Contar productos con stock bajo (productos críticos)
  const lowStockProducts = criticalProducts.length;

  const handleCloseAlert = () => {
    setShowInventoryAlert(false);
  };

  const handleViewAlerts = () => {
    if (onSectionChange) {
      onSectionChange("alerts");
    }
  };

  return (
    <aside className={cn(
      "bg-card border-r border-border transition-all duration-300 shadow-card relative flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-start mb-4"
        >
          <TrendingUp className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Colapsar</span>}
        </Button>

        <nav className="space-y-2">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200 rounded-md",
                  isActive && "bg-primary text-primary-foreground ring-2 ring-primary/40",
                  !isActive && "hover:bg-secondary"
                )}
                onClick={() => onSectionChange?.(item.id)}
              >
                <Icon className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Información rápida - Solo mostrar si hay productos críticos */}
      {!isCollapsed && !criticalLoading && showInventoryAlert && lowStockProducts > 0 && !isSeller && (
        <div className="p-4 pt-0 mt-auto">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 relative">
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={handleCloseAlert}
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">Stock Crítico</h4>
                <p className="text-xs mt-1 text-muted-foreground">
                  {lowStockProducts === 1
                    ? "1 producto con stock bajo"
                    : `${lowStockProducts} productos con stock bajo`
                  }
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-2 w-full h-7 text-xs"
                  onClick={handleViewAlerts}
                >
                  Ver Alertas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;