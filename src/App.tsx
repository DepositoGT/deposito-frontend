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
import Login from "@/pages/Login";
import NewReturn from "./pages/NewReturn";
import HomePage from "./pages/HomePage";
import ImportPage from "./pages/ImportPage";
import SupplierImportPage from "./pages/SupplierImportPage";
import CatalogImportPage from "./pages/CatalogImportPage";
import AuthProvider from "@/context/AuthProvider";

// Layout
import { MainLayout } from "@/components/layout";

// Page Components (direct imports to avoid circular deps)
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import Analytics from "@/components/Analytics";
import SalesManagement from "@/components/SalesManagement";
import SuppliersManagement from "@/components/SuppliersManagement";
import ReportsManagement from "@/components/ReportsManagement";
import AlertsManagement from "@/components/AlertsManagement";
import ScannerManagement from "@/components/ScannerManagement";
import UserManagement from "@/components/UserManagement";
import { CatalogsManagement } from "@/components/CatalogsManagement";
import ReturnsManagement from "@/components/ReturnsManagement";
import CashClosureManagement from "@/components/CashClosureManagement";
import PromotionsManagement from "@/components/PromotionsManagement";

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

            {/* Private routes with MainLayout */}
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout />}>
                {/* Home - App Grid */}
                <Route path="/" element={<HomePage />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Sales */}
                <Route path="/ventas" element={<SalesManagement />} />

                {/* Products & Inventory */}
                <Route path="/productos" element={<ProductManagement />} />
                <Route path="/inventario" element={<ProductManagement />} />
                <Route path="/inventario/importar" element={<ImportPage />} />

                {/* Returns */}
                <Route path="/devoluciones" element={<ReturnsManagement />} />
                <Route path="/returns/new" element={<NewReturn />} />

                {/* Cash Closure */}
                <Route path="/cierre-caja" element={<CashClosureManagement />} />

                {/* Suppliers */}
                <Route path="/proveedores" element={<SuppliersManagement />} />
                <Route path="/proveedores/importar" element={<SupplierImportPage />} />

                {/* Analytics */}
                <Route path="/analisis" element={<Analytics />} />

                {/* Reports */}
                <Route path="/reportes" element={<ReportsManagement />} />

                {/* Alerts */}
                <Route path="/alertas" element={<AlertsManagement />} />

                {/* Scanner */}
                <Route path="/scanner" element={<ScannerManagement />} />

                {/* Promotions (Admin) */}
                <Route path="/promociones" element={<PromotionsManagement />} />

                {/* Catalogs (Admin) */}
                <Route path="/catalogos" element={<CatalogsManagement />} />
                <Route path="/catalogos/importar" element={<CatalogImportPage />} />

                {/* Users (Admin) */}
                <Route path="/usuarios" element={<UserManagement />} />
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
