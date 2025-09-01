import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  AlertTriangle,
  Eye,
  Zap
} from "lucide-react";
import heroImage from "@/assets/hero-liquor.jpg";
import { DashboardProps, DashboardStat, RecentProduct } from "@/types";
import useCriticalProducts from "@/hooks/useCriticalProducts";

const Dashboard = ({ onSectionChange }: DashboardProps) => {
  const stats: DashboardStat[] = [
    {
      title: "Ventas Hoy",
      value: "Q 2,450",
      change: "+12%",
      trending: "up",
      icon: DollarSign,
      color: "text-liquor-gold"
    },
    {
      title: "Productos en Stock",
      value: "1,247",
      change: "-3%",
      trending: "down",
      icon: Package,
      color: "text-primary"
    },
    {
      title: "Valor Inventario",
      value: "Q 85,340",
      change: "+5%",
      trending: "up",
      icon: TrendingUp,
      color: "text-accent"
    },
    {
      title: "Alertas Críticas",
      value: "8",
      change: "+2",
      trending: "down",
      icon: AlertTriangle,
      color: "text-destructive"
    }
  ];

  const { data: criticalData, isLoading: criticalLoading } = useCriticalProducts();
  const recentProducts: RecentProduct[] = (criticalData ?? []).map((p) => ({ name: p.name, category: String(p.category), stock: p.stock, status: p.stock < p.minStock ? 'critical' : p.stock <= p.minStock ? 'low' : 'good' }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div 
        className="relative h-48 rounded-xl overflow-hidden bg-gradient-primary shadow-elegant"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-between p-8">
          <div className="text-primary-foreground">
            <h2 className="text-3xl font-bold mb-2">Bienvenido a Deposito</h2>
            <p className="text-lg opacity-90">Control total de tu inventario de licores</p>
            <div className="flex items-center mt-4 space-x-4">
              <Badge variant="secondary" className="bg-liquor-gold text-liquor-bronze">
                <Zap className="w-3 h-3 mr-1" />
                Sistema Activo
              </Badge>
              <span className="text-sm opacity-75">Última sincronización: hace 2 min</span>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="lg" 
            className="shadow-glow"
            onClick={() => onSectionChange?.("reports")}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Reportes
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-card transition-all duration-300 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center mt-1">
                  {stat.trending === "up" ? (
                    <TrendingUp className="w-3 h-3 text-liquor-gold mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-accent mr-1" />
                  )}
                  <span className={`text-xs ${stat.trending === "up" ? "text-liquor-gold" : "text-accent"}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs ayer</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos con Stock Bajo */}
        <Card className="lg:col-span-2 animate-bounce-in">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
              Productos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-foreground">{product.stock} unidades</span>
                    <Badge 
                      variant={product.status === "critical" ? "destructive" : product.status === "low" ? "secondary" : "default"}
                      className={
                        product.status === "critical" ? "bg-destructive" :
                        product.status === "low" ? "bg-liquor-amber text-liquor-bronze" :
                        "bg-liquor-gold text-liquor-bronze"
                      }
                    >
                      {product.status === "critical" ? "Crítico" : product.status === "low" ? "Bajo" : "Normal"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="animate-bounce-in" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => onSectionChange?.("products")}
            >
              <Package className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onSectionChange?.("sales")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Registrar Venta
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onSectionChange?.("alerts")}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Ver Alertas
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onSectionChange?.("reports")}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Generar Reporte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;