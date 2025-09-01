import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  Package, 
  Clock,
  Bell,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Zap
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertStats, AlertType, AlertPriority } from "@/types";

const AlertsManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const alerts: Alert[] = [
    {
      id: "A001",
      type: "stock_low",
      priority: "high",
      title: "Stock Crítico - Ron Zacapa 23",
      message: "Solo quedan 2 unidades en inventario (mínimo: 3)",
      product: "Ron Zacapa 23 Años",
      category: "Rones",
      currentStock: 2,
      minStock: 3,
      timestamp: "2024-01-10 14:30",
      status: "active",
      assignedTo: "Gerente de Inventario"
    },
    {
      id: "A002",
      type: "stock_out",
      priority: "critical",
      title: "Producto Agotado - Whisky Premium",
      message: "El producto está completamente agotado",
      product: "Whisky Macallan 18",
      category: "Whisky",
      currentStock: 0,
      minStock: 2,
      timestamp: "2024-01-10 12:15",
      status: "active",
      assignedTo: "Supervisor de Compras"
    },
    {
      id: "A003",
      type: "expiry_soon",
      priority: "medium",
      title: "Producto Próximo a Vencer",
      message: "Vence en 30 días - considerar promoción",
      product: "Vino Blanco Sauvignon 2022",
      category: "Vinos",
      currentStock: 15,
      minStock: 5,
      timestamp: "2024-01-10 10:45",
      status: "pending",
      assignedTo: "Gerente de Ventas"
    },
    {
      id: "A004",
      type: "stock_low",
      priority: "medium",
      title: "Stock Bajo - Cerveza Premium",
      message: "Stock por debajo del mínimo recomendado",
      product: "Cerveza Stella Artois 330ml",
      category: "Cervezas",
      currentStock: 8,
      minStock: 12,
      timestamp: "2024-01-10 09:20",
      status: "resolved",
      assignedTo: "Asistente de Inventario"
    },
    {
      id: "A005",
      type: "price_change",
      priority: "low",
      title: "Cambio de Precio de Proveedor",
      message: "El proveedor ha actualizado precios - revisar márgenes",
      product: "Vodka Absolut 750ml",
      category: "Vodkas",
      currentStock: 25,
      minStock: 8,
      timestamp: "2024-01-09 16:30",
      status: "active",
      assignedTo: "Gerente de Compras"
    },
    {
      id: "A006",
      type: "system",
      priority: "high",
      title: "Backup del Sistema Completado",
      message: "Respaldo automático realizado exitosamente",
      product: "Sistema",
      category: "Tecnología",
      currentStock: 0,
      minStock: 0,
      timestamp: "2024-01-10 02:00",
      status: "resolved",
      assignedTo: "Administrador de Sistema"
    }
  ];

  const alertStats: AlertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === "active").length,
    critical: alerts.filter(a => a.priority === "critical").length,
    resolved: alerts.filter(a => a.status === "resolved").length
  };

  const getPriorityBadge = (priority: AlertPriority) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Crítica</Badge>;
      case "high":
        return <Badge className="bg-liquor-amber text-liquor-bronze">Alta</Badge>;
      case "medium":
        return <Badge className="bg-liquor-gold text-liquor-bronze">Media</Badge>;
      case "low":
        return <Badge variant="outline">Baja</Badge>;
      default:
        return <Badge variant="outline">Desconocida</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Activa</Badge>;
      case "pending":
        return <Badge className="bg-liquor-burgundy text-primary-foreground">Pendiente</Badge>;
      case "resolved":
        return <Badge className="bg-liquor-gold text-liquor-bronze">Resuelta</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case "stock_low":
      case "stock_out":
        return <Package className="w-5 h-5" />;
      case "expiry_soon":
        return <Clock className="w-5 h-5" />;
      case "system":
        return <Zap className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centro de Alertas</h2>
          <p className="text-muted-foreground">Monitoreo y gestión de alertas del sistema</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Bell className="w-4 h-4 mr-2" />
            Nueva Alerta
          </Button>
        </div>
      </div>

      {/* Estadísticas de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alertas</p>
                <p className="text-2xl font-bold text-foreground">{alertStats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Activas</p>
                <p className="text-2xl font-bold text-foreground">{alertStats.active}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticas</p>
                <p className="text-2xl font-bold text-foreground">{alertStats.critical}</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltas</p>
                <p className="text-2xl font-bold text-foreground">{alertStats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-liquor-gold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alertas por título o producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="resolved">Resueltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {filteredAlerts.map((alert, index) => (
          <Card 
            key={alert.id} 
            className="animate-slide-up hover:shadow-card transition-all duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    alert.priority === "critical" ? "bg-destructive/10" :
                    alert.priority === "high" ? "bg-liquor-amber/10" :
                    alert.priority === "medium" ? "bg-liquor-gold/10" :
                    "bg-muted"
                  }`}>
                    <div className={
                      alert.priority === "critical" ? "text-destructive" :
                      alert.priority === "high" ? "text-liquor-amber" :
                      alert.priority === "medium" ? "text-liquor-gold" :
                      "text-muted-foreground"
                    }>
                      {getTypeIcon(alert.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-foreground">{alert.title}</h4>
                      {getPriorityBadge(alert.priority)}
                      {getStatusBadge(alert.status)}
                    </div>
                    
                    <p className="text-muted-foreground mb-3">{alert.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Producto:</span>
                        <p className="font-medium text-foreground">{alert.product}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Categoría:</span>
                        <p className="font-medium text-foreground">{alert.category}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock Actual:</span>
                        <p className="font-medium text-foreground">{alert.currentStock}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Asignado a:</span>
                        <p className="font-medium text-foreground">{alert.assignedTo}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp}
                      </span>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Ver Detalles
                        </Button>
                        {alert.status === "active" && (
                          <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Marcar Resuelta
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlertsManagement;