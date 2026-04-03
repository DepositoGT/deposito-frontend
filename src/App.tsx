/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import NotFound from "./pages/NotFound";
import PublicRoute from "@/routes/PublicRoute";
import PrivateRoute from "@/routes/PrivateRoute";
import PermissionRoute from "@/routes/PermissionRoute";
import Login from "@/pages/Login";
import NewReturn from "./pages/NewReturn";
import HomePage from "./pages/HomePage";
import ImportPage from "./pages/ImportPage";
import DeletedProductsPage from "./pages/DeletedProductsPage";
import SupplierImportPage from "./pages/SupplierImportPage";
import CatalogImportPage from "./pages/CatalogImportPage";
import UserImportPage from "./pages/UserImportPage";
import { RegisterIncomingMerchandise } from "./pages/RegisterIncomingMerchandise";
import AuthProvider from "@/context/AuthProvider";

// Layout
import { MainLayout } from "@/components/layout";

// Page Components (direct imports to avoid circular deps)
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import Analytics from "@/components/Analytics";
import SalesManagement from "@/components/SalesManagement";
import NewSalePage from "@/components/sales/NewSalePage";
import { SaleInvoicePage } from "@/components/sales/SaleInvoicePage";
import SuppliersManagement from "@/components/SuppliersManagement";
import SupplierDetailPage from "./components/suppliers/SupplierDetailPage";
import SupplierCreatePage from "./components/suppliers/SupplierCreatePage";
import ProductDetailPage from "./components/products/ProductDetailPage";
import ProductCreatePage from "./components/products/ProductCreatePage";
import ReportsManagement from "./components/ReportsManagement";
import AlertsManagement from "./components/AlertsManagement";
import ScannerManagement from "@/components/ScannerManagement";
import UserManagement from "@/components/UserManagement";
import UserDetailPage from "@/components/users/UserDetailPage";
import UserCreatePage from "@/components/users/UserCreatePage";
import RolesPermissionsManagement from "@/components/users/RolesPermissionsManagement";
import RolePermissionsDetail from "@/components/users/RolePermissionsDetail";
import RoleCreatePage from "@/components/users/RoleCreatePage";
import { CatalogsManagement } from "@/components/CatalogsManagement";
import ReturnsManagement from "@/components/ReturnsManagement";
import CashClosureManagement from "@/components/CashClosureManagement";
import PromotionsManagement from "@/components/PromotionsManagement";
import PromotionCreatePage from "@/components/promotions/PromotionCreatePage";
import PromotionEditPage from "@/components/promotions/PromotionEditPage";
import IncomingMerchandiseManagement from "@/components/IncomingMerchandiseManagement";
import ConfigManagement from "@/components/config/ConfigManagement";
import InventoryCountListPage from "@/components/inventoryCounts/InventoryCountListPage";
import InventoryCountNewPage from "@/components/inventoryCounts/InventoryCountNewPage";
import InventoryCountSessionPage from "@/components/inventoryCounts/InventoryCountSessionPage";

function LegacyProveedorIdRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/contactos/${id ?? ""}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes (only when NOT authenticated) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Global 404 route (sin layout) */}
            <Route path="/404" element={<NotFound />} />

            {/* Private routes with MainLayout */}
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout />}>
                {/* Home - App Grid (siempre accesible tras login) */}
                <Route path="/" element={<HomePage />} />

                {/* Dashboard - requiere ver analíticas */}
                <Route
                  path="/dashboard"
                  element={
                    <PermissionRoute any={["analytics.view"]}>
                      <Dashboard />
                    </PermissionRoute>
                  }
                />

                {/* Sales */}
                <Route
                  path="/ventas"
                  element={
                    <PermissionRoute any={["sales.view", "sales.create"]}>
                      <SalesManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/ventas/nueva"
                  element={
                    <PermissionRoute any={["sales.create"]}>
                      <NewSalePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/ventas/:id/factura"
                  element={
                    <PermissionRoute any={["sales.view_invoice", "sales.view_detail"]}>
                      <SaleInvoicePage />
                    </PermissionRoute>
                  }
                />

                {/* Products & Inventory */}
                <Route
                  path="/productos"
                  element={
                    <PermissionRoute any={["products.view"]}>
                      <ProductManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario"
                  element={
                    <PermissionRoute any={["products.view"]}>
                      <ProductManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/nuevo"
                  element={
                    <PermissionRoute any={["products.create", "products.view"]}>
                      <ProductCreatePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/inventariado/nuevo"
                  element={
                    <PermissionRoute any={["inventory_count.create"]}>
                      <InventoryCountNewPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/inventariado/:sessionId"
                  element={
                    <PermissionRoute
                      any={[
                        "inventory_count.view",
                        "inventory_count.count",
                        "inventory_count.submit",
                        "inventory_count.approve",
                      ]}
                    >
                      <InventoryCountSessionPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/inventariado"
                  element={
                    <PermissionRoute
                      any={["inventory_count.view", "inventory_count.create", "inventory_count.count"]}
                    >
                      <InventoryCountListPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/eliminados"
                  element={
                    <PermissionRoute any={["products.delete"]}>
                      <DeletedProductsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/:id"
                  element={
                    <PermissionRoute any={["products.view"]}>
                      <ProductDetailPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/importar"
                  element={
                    <PermissionRoute any={["products.import"]}>
                      <ImportPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/inventario/registrar-ingreso"
                  element={
                    <PermissionRoute any={["products.register_incoming"]}>
                      <RegisterIncomingMerchandise />
                    </PermissionRoute>
                  }
                />

                {/* Returns */}
                <Route
                  path="/devoluciones"
                  element={
                    <PermissionRoute any={["returns.view"]}>
                      <ReturnsManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/returns/new"
                  element={
                    <PermissionRoute any={["returns.manage"]}>
                      <NewReturn />
                    </PermissionRoute>
                  }
                />

                {/* Cash Closure */}
                <Route
                  path="/cierre-caja"
                  element={
                    <PermissionRoute any={["cashclosure.view", "cashclosure.create"]}>
                      <CashClosureManagement />
                    </PermissionRoute>
                  }
                />

                {/* Contactos (API /suppliers; rutas antiguas /proveedores redirigen) */}
                <Route path="/proveedores" element={<Navigate to="/contactos" replace />} />
                <Route path="/proveedores/nuevo" element={<Navigate to="/contactos/nuevo" replace />} />
                <Route path="/proveedores/importar" element={<Navigate to="/contactos/importar" replace />} />
                <Route path="/proveedores/:id" element={<LegacyProveedorIdRedirect />} />
                <Route
                  path="/contactos"
                  element={
                    <PermissionRoute any={["contacts.suppliers.view", "contacts.clients.view"]}>
                      <SuppliersManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/contactos/nuevo"
                  element={
                    <PermissionRoute any={["contacts.suppliers.create", "contacts.clients.create"]}>
                      <SupplierCreatePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/contactos/importar"
                  element={
                    <PermissionRoute any={["contacts.suppliers.import"]}>
                      <SupplierImportPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/contactos/:id"
                  element={
                    <PermissionRoute any={["contacts.suppliers.view", "contacts.clients.view"]}>
                      <SupplierDetailPage />
                    </PermissionRoute>
                  }
                />

                {/* Incoming Merchandise */}
                <Route
                  path="/mercancia"
                  element={
                    <PermissionRoute any={["merchandise.view"]}>
                      <IncomingMerchandiseManagement />
                    </PermissionRoute>
                  }
                />

                {/* Analytics */}
                <Route
                  path="/analisis"
                  element={
                    <PermissionRoute any={["analytics.view"]}>
                      <Analytics />
                    </PermissionRoute>
                  }
                />

                {/* Reports */}
                <Route
                  path="/reportes"
                  element={
                    <PermissionRoute any={["reports.view"]}>
                      <ReportsManagement />
                    </PermissionRoute>
                  }
                />

                {/* Alerts */}
                <Route
                  path="/alertas"
                  element={
                    <PermissionRoute any={["alerts.view", "alerts.manage"]}>
                      <AlertsManagement />
                    </PermissionRoute>
                  }
                />

                {/* Scanner (si se habilita en el futuro, envolver también en PermissionRoute) */}
                {/* <Route
                  path="/scanner"
                  element={
                    <PermissionRoute any={["scanner.view"]}>
                      <ScannerManagement />
                    </PermissionRoute>
                  }
                /> */}

                {/* Promotions (Admin / permisos de promociones) */}
                <Route
                  path="/promociones"
                  element={
                    <PermissionRoute any={["promotions.view", "promotions.manage"]}>
                      <PromotionsManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/promociones/nueva"
                  element={
                    <PermissionRoute any={["promotions.manage"]}>
                      <PromotionCreatePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/promociones/:id/editar"
                  element={
                    <PermissionRoute any={["promotions.manage"]}>
                      <PromotionEditPage />
                    </PermissionRoute>
                  }
                />

                {/* Catalogs (Admin) */}
                <Route
                  path="/catalogos"
                  element={
                    <PermissionRoute any={["catalogs.view", "catalogs.manage"]}>
                      <CatalogsManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/catalogos/importar"
                  element={
                    <PermissionRoute any={["catalogs.manage"]}>
                      <CatalogImportPage />
                    </PermissionRoute>
                  }
                />

                {/* Users (Admin) */}
                <Route
                  path="/usuarios"
                  element={
                    <PermissionRoute any={["users.view", "roles.manage"]}>
                      <UserManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/nuevo"
                  element={
                    <PermissionRoute any={["users.create", "users.view", "roles.manage"]}>
                      <UserCreatePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/importar"
                  element={
                    <PermissionRoute any={["users.view", "roles.manage"]}>
                      <UserImportPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/roles-permisos"
                  element={
                    <PermissionRoute any={["roles.manage", "roles.view"]}>
                      <RolesPermissionsManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/roles-permisos/nuevo"
                  element={
                    <PermissionRoute any={["roles.manage"]}>
                      <RoleCreatePage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/roles-permisos/:id"
                  element={
                    <PermissionRoute any={["roles.manage"]}>
                      <RolePermissionsDetail />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/usuarios/:id"
                  element={
                    <PermissionRoute any={["users.view", "roles.manage"]}>
                      <UserDetailPage />
                    </PermissionRoute>
                  }
                />

                {/* Configuración del sistema */}
                <Route
                  path="/configuracion"
                  element={
                    <PermissionRoute any={["settings.view", "settings.manage"]}>
                      <ConfigManagement />
                    </PermissionRoute>
                  }
                />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
