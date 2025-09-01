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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SidebarProps, MenuItem } from "@/types";

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "products", label: "Productos", icon: Boxes },
  { id: "sales", label: "Ventas", icon: ShoppingCart },
  { id: "suppliers", label: "Proveedores", icon: Users },
  { id: "analytics", label: "Análisis", icon: BarChart3 },
  { id: "reports", label: "Reportes", icon: FileText },
  { id: "alerts", label: "Alertas", icon: AlertTriangle },
  { id: "scanner", label: "Scanner", icon: Scan },
];

const Sidebar = ({ activeSection = "dashboard", onSectionChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showInventoryAlert, setShowInventoryAlert] = useState(true);

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

  const visibleMenu = isSeller ? menuItems.filter((m) => m.id === 'sales') : menuItems;

  // Datos simulados de productos para calcular alertas reales
  const products = [
    { id: "P001", name: "Whisky Buchanans 18", stock: 5, minStock: 10 },
    { id: "P002", name: "Ron Zacapa 23", stock: 2, minStock: 5 },
    { id: "P003", name: "Vodka Absolut", stock: 8, minStock: 12 },
    { id: "P004", name: "Cerveza Corona", stock: 3, minStock: 15 },
    { id: "P005", name: "Vino Tinto Reserva", stock: 4, minStock: 8 },
  ];

  const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;

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
      "bg-card border-r border-border transition-all duration-300 shadow-card relative",
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
                  "w-full justify-start transition-all duration-200",
                  isActive && "bg-gradient-primary text-primary-foreground shadow-glow",
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

      {/* Información rápida */}
      {!isCollapsed && showInventoryAlert && lowStockProducts > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-accent p-4 rounded-lg text-accent-foreground relative">
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute top-1 right-1 h-6 w-6 p-0 text-accent-foreground hover:bg-accent-foreground/10"
              onClick={handleCloseAlert}
            >
              <X className="h-3 w-3" />
            </Button>
            <h4 className="font-semibold text-sm">Estado del Inventario</h4>
            <p className="text-xs opacity-90 mt-1">
              {lowStockProducts > 0 
                ? `${lowStockProducts} productos con stock bajo` 
                : "Inventario en buen estado"
              }
            </p>
            {/* Hide quick actions that navigate to restricted sections for sellers */}
            {!isSeller && (
              <Button 
                size="sm" 
                variant="secondary" 
                className="mt-2 w-full"
                onClick={handleViewAlerts}
              >
                Ver Alertas
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;