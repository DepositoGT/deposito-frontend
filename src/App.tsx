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
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import PublicRoute from "@/routes/PublicRoute";
import PrivateRoute from "@/routes/PrivateRoute";
import PermissionRoute from "@/routes/PermissionRoute";
import Login from "@/pages/Login";
import NewReturn from "./pages/NewReturn";
import HomePage from "./pages/HomePage";
import ImportPage from "./pages/ImportPage";
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
import SuppliersManagement from "@/components/SuppliersManagement";
import SupplierDetailPage from "./components/suppliers/SupplierDetailPage";
import ProductDetailPage from "./components/products/ProductDetailPage";
import ReportsManagement from "./components/ReportsManagement";
import AlertsManagement from "./components/AlertsManagement";
import ScannerManagement from "@/components/ScannerManagement";
import UserManagement from "@/components/UserManagement";
import UserDetailPage from "@/components/users/UserDetailPage";
import RolesPermissionsManagement from "@/components/users/RolesPermissionsManagement";
import RolePermissionsDetail from "@/components/users/RolePermissionsDetail";
import RoleCreatePage from "@/components/users/RoleCreatePage";
import { CatalogsManagement } from "@/components/CatalogsManagement";
import ReturnsManagement from "@/components/ReturnsManagement";
import CashClosureManagement from "@/components/CashClosureManagement";
import PromotionsManagement from "@/components/PromotionsManagement";
import IncomingMerchandiseManagement from "@/components/IncomingMerchandiseManagement";

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

                {/* Suppliers */}
                <Route
                  path="/proveedores"
                  element={
                    <PermissionRoute any={["suppliers.view"]}>
                      <SuppliersManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/proveedores/importar"
                  element={
                    <PermissionRoute any={["suppliers.import"]}>
                      <SupplierImportPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/proveedores/:id"
                  element={
                    <PermissionRoute any={["suppliers.view"]}>
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
                  path="/usuarios/:id"
                  element={
                    <PermissionRoute any={["users.view", "roles.manage"]}>
                      <UserDetailPage />
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
